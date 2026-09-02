import { BadRequestException } from '@nestjs/common';
import { jest } from '@jest/globals';
import type { Repository } from 'typeorm';
import type { Unit } from '../entities/unit.entity';
import type { Review } from '../../reviews/entities/review.entity';
import { ListPublicUnitsUseCase } from './list-public-units.use-case';

describe('ListPublicUnitsUseCase', () => {
  const reviews = {
    find: jest.fn<() => Promise<Review[]>>().mockResolvedValue([]),
  } as unknown as Repository<Review>;
  const unit = (id: number, name: string, latitude: number | null, longitude: number | null) =>
    ({
      id,
      name,
      latitude,
      longitude,
      city: 'São Paulo',
      state: 'SP',
      zip_code: '01001000',
      street: null,
      number: null,
      complement: null,
      neighborhood: null,
      image_url: null,
      cover_url: null,
    }) as Unit;

  it('publishes every created unit when no location filter is supplied', async () => {
    const repository = {
      find: jest
        .fn<() => Promise<Unit[]>>()
        .mockResolvedValue([unit(1, 'A', null, null), unit(2, 'B', -23.55, -46.63)]),
    } as unknown as Repository<Unit>;
    const result = await new ListPublicUnitsUseCase(repository, reviews).execute({
      page: 1,
      limit: 20,
    });
    expect(result.data.map((item) => item.id)).toEqual([1, 2]);
    expect(result.meta.total).toBe(2);
  });

  it('requires latitude and longitude together', async () => {
    const repository = { find: jest.fn() } as unknown as Repository<Unit>;
    await expect(
      new ListPublicUnitsUseCase(repository, reviews).execute({ page: 1, limit: 20, lat: -23.5 }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('filters and sorts geolocated units by radius', async () => {
    const repository = {
      find: jest
        .fn<() => Promise<Unit[]>>()
        .mockResolvedValue([
          unit(1, 'Near', -23.5505, -46.6333),
          unit(2, 'Far', -22.9068, -43.1729),
          unit(3, 'No coordinates', null, null),
        ]),
    } as unknown as Repository<Unit>;
    const result = await new ListPublicUnitsUseCase(repository, reviews).execute({
      page: 1,
      limit: 20,
      lat: -23.5505,
      lng: -46.6333,
      radius_km: 10,
    });
    expect(result.data.map((item) => item.id)).toEqual([1]);
    expect(result.data[0].distance_km).toBe(0);
  });
});
