import {
  BadGatewayException,
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

type BrasilApiCepResponse = {
  state?: string;
  city?: string;
  neighborhood?: string;
  street?: string;
  location?: {
    coordinates?: {
      latitude?: string;
      longitude?: string;
    };
  };
};

export type UnitAddressLookup = {
  zip_code: string;
  street: string;
  neighborhood: string;
  city: string;
  state: string;
  latitude: number;
  longitude: number;
};

@Injectable()
export class UnitAddressService {
  constructor(private readonly configService: ConfigService) {}

  async lookupByCep(cepInput: string): Promise<UnitAddressLookup> {
    const cep = cepInput.replace(/\D/g, '');
    if (!/^\d{8}$/.test(cep)) {
      throw new BadRequestException({
        code: 'INVALID_CEP',
        message: 'Informe um CEP válido com 8 dígitos.',
      });
    }

    const baseUrl = this.configService.get<string>(
      'BRASIL_API_BASE_URL',
      'https://brasilapi.com.br/api',
    );

    let response: Response;
    try {
      response = await globalThis.fetch(`${baseUrl}/cep/v2/${cep}`, {
        headers: { Accept: 'application/json' },
        signal: AbortSignal.timeout(8_000),
      });
    } catch {
      throw new BadGatewayException({
        code: 'CEP_PROVIDER_UNAVAILABLE',
        message: 'A consulta de CEP está indisponível. Tente novamente em instantes.',
      });
    }

    if (response.status === 404) {
      throw new NotFoundException({
        code: 'CEP_NOT_FOUND',
        message: 'CEP não encontrado.',
      });
    }
    if (!response.ok) {
      throw new BadGatewayException({
        code: 'CEP_PROVIDER_ERROR',
        message: 'Não foi possível consultar o CEP agora.',
      });
    }

    const data = (await response.json()) as BrasilApiCepResponse;
    const latitude = Number(data.location?.coordinates?.latitude);
    const longitude = Number(data.location?.coordinates?.longitude);
    if (
      !data.city ||
      !data.state ||
      !Number.isFinite(latitude) ||
      !Number.isFinite(longitude) ||
      latitude < -90 ||
      latitude > 90 ||
      longitude < -180 ||
      longitude > 180
    ) {
      throw new BadGatewayException({
        code: 'CEP_WITHOUT_COORDINATES',
        message: 'O provedor encontrou o endereço, mas ainda não possui coordenadas para este CEP.',
      });
    }

    return {
      zip_code: `${cep.slice(0, 5)}-${cep.slice(5)}`,
      street: data.street?.trim() ?? '',
      neighborhood: data.neighborhood?.trim() ?? '',
      city: data.city.trim(),
      state: data.state.trim().toUpperCase(),
      latitude,
      longitude,
    };
  }
}
