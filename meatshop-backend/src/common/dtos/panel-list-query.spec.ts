import { jest } from '@jest/globals';
import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { PanelListQueryDto, searchPattern } from './panel-list-query.dto';
import { ListCategoriesUseCase } from '../../categories/use-cases/list-categories.use-case';
import { ListPromotionsUseCase } from '../../promotions/use-cases/list-promotions.use-case';
import { ListOrderHistoryUseCase } from '../../orders/use-cases/list-order-history.use-case';
import { FilterPromotionsDto } from '../../promotions/dtos/filter-promotions.dto';
import { FilterPanelOrdersDto } from '../../orders/dtos/filter-panel-orders.dto';

function queryMock() {
  const query = {
    andWhere: jest.fn(),
    leftJoinAndSelect: jest.fn(),
    orderBy: jest.fn(),
    addOrderBy: jest.fn(),
    skip: jest.fn(),
    take: jest.fn(),
    getManyAndCount: jest.fn(async () => [[], 21]),
  };
  for (const key of [
    'andWhere',
    'leftJoinAndSelect',
    'orderBy',
    'addOrderBy',
    'skip',
    'take',
  ] as const)
    query[key].mockReturnValue(query);
  return query;
}

describe('Panel pagination and remote filtering', () => {
  it.each([
    { page: 0 },
    { page: 1.5 },
    { page: 'invalid' },
    { limit: 201 },
    { limit: -1 },
    { search: 'x'.repeat(151) },
  ])('rejects invalid or unbounded inputs: %o', (input) => {
    expect(validateSync(plainToInstance(PanelListQueryDto, input)).length).toBeGreaterThan(0);
  });
  it('uses literal wildcard characters in a search', () => {
    expect(searchPattern('  50%_off  ')).toBe('%50\\%\\_off%');
  });
  it('filters before counting and loads only the requested category page', async () => {
    const query = queryMock();
    const service = new ListCategoriesUseCase({ createQueryBuilder: () => query } as never);
    const result = await service.execute(
      6,
      undefined,
      Object.assign(new PanelListQueryDto(), { paginated: 'true', page: 2, search: 'Bovina' }),
    );
    expect(query.andWhere).toHaveBeenCalledWith('category.unit_id = :unitId', { unitId: 6 });
    expect(query.andWhere).toHaveBeenCalledWith(expect.stringContaining('ILIKE'), {
      search: '%Bovina%',
    });
    expect(query.skip).toHaveBeenCalledWith(10);
    expect(query.take).toHaveBeenCalledWith(10);
    expect(result).toEqual({ data: [], meta: { page: 2, limit: 10, total: 21, totalPages: 3 } });
  });
  it('searches promotion product names and status on the server', async () => {
    const query = queryMock();
    const service = new ListPromotionsUseCase({ createQueryBuilder: () => query } as never);
    await service.execute(
      Object.assign(new FilterPromotionsDto(), {
        paginated: 'true',
        unit_id: 6,
        search: 'Picanha',
        status: 'Agendada',
      }),
    );
    expect(query.andWhere).toHaveBeenCalledWith(expect.stringContaining('product.name ILIKE'), {
      search: '%Picanha%',
    });
    expect(query.andWhere).toHaveBeenCalledWith('promotion.starts_at > :now', {
      now: expect.any(Date),
    });
    expect(query.take).toHaveBeenCalledWith(10);
  });
  it('keeps order filters inside the permitted units and current customer scope', async () => {
    const query = queryMock();
    const authorization = { getManagedUnitIds: jest.fn(async () => [6]) };
    const service = new ListOrderHistoryUseCase(
      { createQueryBuilder: () => query } as never,
      authorization as never,
      {} as never,
    );
    await service.panel(
      { id: 3, global_role: 'USER' } as never,
      Object.assign(new FilterPanelOrdersDto(), { unit_id: 7, search: 'Ana', page: 3 }),
    );
    expect(query.andWhere).toHaveBeenCalledWith(
      '(orders.unit_id = ANY(:unitIds) OR orders.client_id = :actor)',
      { unitIds: [6], actor: 3 },
    );
    expect(query.andWhere).toHaveBeenCalledWith('orders.unit_id = :unitId', { unitId: 7 });
    expect(query.skip).toHaveBeenCalledWith(20);
    expect(query.take).toHaveBeenCalledWith(10);
  });
});
