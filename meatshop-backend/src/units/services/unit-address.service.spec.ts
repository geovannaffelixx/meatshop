/* global beforeEach, afterEach, jest */
import { BadGatewayException, BadRequestException } from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';
import { UnitAddressService } from './unit-address.service';

describe('UnitAddressService', () => {
  const config = {
    get: jest.fn((_name: string, fallback: string) => fallback),
  } as unknown as ConfigService;
  const service = new UnitAddressService(config);

  beforeEach(() => jest.restoreAllMocks());
  afterEach(() => jest.restoreAllMocks());

  it('normalizes the CEP and returns address with valid coordinates', async () => {
    jest.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          street: 'Rua Exemplo',
          neighborhood: 'Centro',
          city: 'Anápolis',
          state: 'GO',
          location: {
            coordinates: {
              latitude: '-16.3199',
              longitude: '-48.9395386',
            },
          },
        }),
        { status: 200 },
      ),
    );

    await expect(service.lookupByCep('75113-300')).resolves.toEqual({
      zip_code: '75113-300',
      street: 'Rua Exemplo',
      neighborhood: 'Centro',
      city: 'Anápolis',
      state: 'GO',
      latitude: -16.3199,
      longitude: -48.9395386,
    });
  });

  it('rejects an invalid CEP before calling the provider', async () => {
    const fetchSpy = jest.spyOn(globalThis, 'fetch');

    await expect(service.lookupByCep('123')).rejects.toBeInstanceOf(BadRequestException);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('rejects a response without coordinates', async () => {
    jest.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ city: 'Anápolis', state: 'GO', location: {} }), {
        status: 200,
      }),
    );

    await expect(service.lookupByCep('75113-300')).rejects.toBeInstanceOf(BadGatewayException);
  });
});
