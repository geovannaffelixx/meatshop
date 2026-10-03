import { jest } from '@jest/globals';
import { ListPublicUnitsUseCase } from './list-public-units.use-case';
describe('Public units pagination', () => {
  it('requires a coordinate pair before querying the database', async () => {
    const units = { createQueryBuilder: jest.fn() };
    await expect(
      new ListPublicUnitsUseCase(units as never, {} as never).execute({
        page: 1,
        limit: 20,
        lat: 1,
      }),
    ).rejects.toThrow();
    expect(units.createQueryBuilder).not.toHaveBeenCalled();
  });
  it('filters geographic distance and service area before database pagination', async () => {
    const q: any = {};
    for (const name of ['andWhere', 'addSelect', 'orderBy', 'addOrderBy', 'skip', 'take'])
      q[name] = jest.fn(() => q);
    q.getManyAndCount = jest.fn(async () => [[], 0]);
    const result = await new ListPublicUnitsUseCase(
      { createQueryBuilder: () => q } as never,
      {} as never,
    ).execute({ page: 2, limit: 10, lat: -23.5, lng: -46.6, radius_km: 12 });
    expect(q.andWhere).toHaveBeenCalledWith(expect.stringContaining('unit.delivery_radius_km'), {
      lat: -23.5,
      lng: -46.6,
      radius: 12,
    });
    expect(q.skip).toHaveBeenCalledWith(10);
    expect(result.meta.total).toBe(0);
  });
});
