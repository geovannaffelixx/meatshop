import {
  BadGatewayException,
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { distanceMeters } from '../../delivery/services/tracking-policy';

export type UnitAddressLookup = {
  zip_code: string;
  street: string;
  neighborhood: string;
  city: string;
  state: string;
  latitude: number | null;
  longitude: number | null;
};
type AddressInput = {
  zip_code?: string;
  latitude?: number | null;
  longitude?: number | null;
  street?: string | null;
  number?: string | null;
  city?: string;
  state?: string;
  neighborhood?: string | null;
};
type Coordinates = { latitude: number | null; longitude: number | null; coordinate_source: string };

@Injectable()
export class UnitAddressService {
  private readonly cache = new Map<string, { expires: number; value: UnitAddressLookup }>();
  private readonly pending = new Map<string, Promise<UnitAddressLookup>>();
  constructor(private readonly config: ConfigService) {}

  async lookupByCep(input: string): Promise<UnitAddressLookup> {
    const cep = input.replace(/\D/g, '');
    if (!/^\d{8}$/.test(cep))
      throw new BadRequestException({
        code: 'INVALID_CEP',
        message: 'Provide an 8-digit postal code',
      });
    const cached = this.cache.get(cep);
    if (cached && cached.expires > Date.now()) return { ...cached.value };
    const pending = this.pending.get(cep);
    if (pending) return pending;
    if (this.pending.size >= 50)
      throw new BadGatewayException({ code: 'CEP_PROVIDER_BUSY', message: 'Try again shortly' });
    const request = this.fetchCep(cep)
      .then((value) => {
        if (this.cache.size >= 1000) this.cache.delete(this.cache.keys().next().value!);
        this.cache.set(cep, { expires: Date.now() + 3600000, value });
        return { ...value };
      })
      .finally(() => this.pending.delete(cep));
    this.pending.set(cep, request);
    return request;
  }

  private async fetchCep(cep: string): Promise<UnitAddressLookup> {
    const base = this.config.get<string>('BRASIL_API_BASE_URL', 'https://brasilapi.com.br/api');
    let response: Response;
    try {
      response = await globalThis.fetch(`${base}/cep/v2/${cep}`, {
        headers: { Accept: 'application/json' },
        signal: AbortSignal.timeout(8000),
      });
    } catch {
      throw new BadGatewayException({
        code: 'CEP_PROVIDER_UNAVAILABLE',
        message: 'Postal code lookup is unavailable. Enter the address manually.',
      });
    }
    if (response.status === 404)
      throw new NotFoundException({ code: 'CEP_NOT_FOUND', message: 'Postal code not found' });
    if (!response.ok)
      throw new BadGatewayException({
        code: 'CEP_PROVIDER_ERROR',
        message: 'Postal code lookup failed',
      });
    let data: Record<string, unknown>;
    try {
      data = (await response.json()) as Record<string, unknown>;
    } catch {
      throw new BadGatewayException({
        code: 'CEP_PROVIDER_ERROR',
        message: 'Invalid postal code response',
      });
    }
    if (
      !data ||
      typeof data.city !== 'string' ||
      !data.city.trim() ||
      typeof data.state !== 'string' ||
      !/^[A-Za-z]{2}$/.test(data.state)
    ) {
      throw new BadGatewayException({
        code: 'CEP_PROVIDER_ERROR',
        message: 'Invalid address response',
      });
    }
    const raw = (data.location as { coordinates?: Record<string, unknown> } | undefined)
      ?.coordinates;
    const lat = this.coordinate(raw?.latitude, 90);
    const lng = this.coordinate(raw?.longitude, 180);
    return {
      zip_code: `${cep.slice(0, 5)}-${cep.slice(5)}`,
      street: typeof data.street === 'string' ? data.street.trim() : '',
      neighborhood: typeof data.neighborhood === 'string' ? data.neighborhood.trim() : '',
      city: data.city.trim(),
      state: data.state.toUpperCase(),
      latitude: lat != null && lng != null ? lat : null,
      longitude: lat != null && lng != null ? lng : null,
    };
  }

  private coordinate(value: unknown, max: number): number | null {
    if (typeof value !== 'number' && typeof value !== 'string') return null;
    if (value == null || typeof value === 'boolean' || (typeof value === 'string' && !value.trim()))
      return null;
    const n = Number(value);
    return Number.isFinite(n) && Math.abs(n) <= max ? n : null;
  }

  async coordinatesFor(
    input: AddressInput,
    current?: AddressInput & Partial<Coordinates>,
  ): Promise<Coordinates> {
    const hasLat = input.latitude != null;
    const hasLng = input.longitude != null;
    if (hasLat !== hasLng) throw new BadRequestException('Provide latitude and longitude together');
    const changed =
      !current ||
      ['zip_code', 'street', 'number', 'city', 'state', 'neighborhood'].some(
        (key) =>
          input[key as keyof AddressInput] !== undefined &&
          this.normalizedAddressField(key, input[key as keyof AddressInput]) !==
            this.normalizedAddressField(key, current[key as keyof AddressInput]),
      );
    if (!hasLat && !changed && current)
      return {
        latitude: current.latitude ?? null,
        longitude: current.longitude ?? null,
        coordinate_source: current.coordinate_source ?? 'UNRESOLVED',
      };
    const cep = input.zip_code ?? current?.zip_code ?? '';
    if (!/^\d{8}$/.test(cep.replace(/\D/g, '')))
      throw new BadRequestException('Invalid postal code');
    let approximate: UnitAddressLookup | null = null;
    try {
      approximate = await this.lookupByCep(cep);
    } catch (error) {
      if (error instanceof BadRequestException || error instanceof NotFoundException) throw error;
      // Provider outages must not prevent a manually entered address from being saved.
    }
    if (hasLat && hasLng) {
      const lat = this.coordinate(input.latitude, 90),
        lng = this.coordinate(input.longitude, 180);
      if (lat == null || lng == null) throw new BadRequestException('Invalid coordinates');
      if (
        approximate?.latitude != null &&
        approximate.longitude != null &&
        distanceMeters(lat, lng, approximate.latitude, approximate.longitude) > 50000
      ) {
        throw new BadRequestException({
          code: 'PIN_TOO_FAR',
          message: 'The selected point is more than 50 km from the postal code. Check the address.',
        });
      }
      return { latitude: lat, longitude: lng, coordinate_source: 'USER_PIN' };
    }
    return {
      latitude: approximate?.latitude ?? null,
      longitude: approximate?.longitude ?? null,
      coordinate_source: approximate?.latitude != null ? 'POSTAL_CODE' : 'UNRESOLVED',
    };
  }

  private normalizedAddressField(key: string, value: unknown): string {
    const text = String(value ?? '').trim();
    if (key === 'zip_code') return text.replace(/\D/g, '');
    if (key === 'state') return text.toUpperCase();
    return text;
  }
}
