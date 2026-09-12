import { jest, beforeEach, afterEach } from '@jest/globals';
import { BadRequestException } from '@nestjs/common';
import { UnitAddressService } from './unit-address.service';

describe('Address resolution', () => {
  let service: UnitAddressService;
  beforeEach(() => {
    service = new UnitAddressService({ get: (_: string, fallback: string) => fallback } as never);
  });
  afterEach(() => {
    jest.restoreAllMocks();
  });
  const response = (coordinates: unknown) =>
    new Response(
      JSON.stringify({
        city: 'Sao Paulo',
        state: 'SP',
        street: 'Provider street',
        location: { coordinates },
      }),
    );
  it('rejects invalid CEP without a request', async () => {
    const fetch = jest.spyOn(globalThis, 'fetch');
    await expect(service.lookupByCep('12')).rejects.toBeInstanceOf(BadRequestException);
    expect(fetch).not.toHaveBeenCalled();
  });
  it.each([{ latitude: null, longitude: '' }, {}, { latitude: 'Infinity', longitude: '12' }])(
    'never converts absent coordinates to zero: %p',
    async (coordinates) => {
      jest.spyOn(globalThis, 'fetch').mockResolvedValue(response(coordinates));
      expect(await service.lookupByCep('01001000')).toMatchObject({
        latitude: null,
        longitude: null,
        city: 'Sao Paulo',
      });
    },
  );
  it('accepts valid zero and deduplicates simultaneous provider requests', async () => {
    const fetch = jest
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(response({ latitude: '0', longitude: '0' }));
    const values = await Promise.all([
      service.lookupByCep('01001000'),
      service.lookupByCep('01001-000'),
    ]);
    expect(values[0].latitude).toBe(0);
    expect(fetch).toHaveBeenCalledTimes(1);
  });
  it('accepts manual address during provider outage without inventing coordinates', async () => {
    jest.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('offline'));
    expect(await service.coordinatesFor({ zip_code: '01001000', street: 'Manual' })).toEqual({
      latitude: null,
      longitude: null,
      coordinate_source: 'UNRESOLVED',
    });
  });
  it('keeps a confirmed pin only while the address is unchanged', async () => {
    jest
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(response({ latitude: '-23.5', longitude: '-46.6' }));
    const current = {
      zip_code: '01001000',
      number: '1',
      latitude: -23.5001,
      longitude: -46.6001,
      coordinate_source: 'USER_PIN',
    };
    expect(await service.coordinatesFor({ number: '1' }, current)).toEqual(
      expect.objectContaining({ coordinate_source: 'USER_PIN' }),
    );
    expect(await service.coordinatesFor({ number: '2' }, current)).toEqual(
      expect.objectContaining({ coordinate_source: 'POSTAL_CODE' }),
    );
  });
  it('rejects mismatched coordinate pairs and pins far from CEP', async () => {
    await expect(service.coordinatesFor({ zip_code: '01001000', latitude: 1 })).rejects.toThrow();
    jest
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(response({ latitude: '-23.5', longitude: '-46.6' }));
    await expect(
      service.coordinatesFor({ zip_code: '01001000', latitude: 0, longitude: 0 }),
    ).rejects.toThrow();
  });
});
