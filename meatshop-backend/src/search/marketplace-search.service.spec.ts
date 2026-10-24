import { BadRequestException } from '@nestjs/common';
import { jest } from '@jest/globals';
import { MarketplaceSearchService } from './marketplace-search.service';

function queryBuilder(result: 'entities' | 'raw', values: unknown[] = []) {
  const query: Record<string, jest.Mock> = {};
  for (const method of [
    'where',
    'andWhere',
    'innerJoin',
    'innerJoinAndSelect',
    'addSelect',
    'select',
    'groupBy',
    'addGroupBy',
    'orderBy',
    'addOrderBy',
    'offset',
    'limit',
  ]) {
    query[method] = jest.fn(() => query);
  }
  query.getCount = jest.fn(async () => values.length);
  query.getMany = jest.fn(async () => (result === 'entities' ? values : []));
  query.getRawAndEntities = jest.fn(async () => ({ raw: [], entities: [] }));
  query.getRawMany = jest.fn(async () => (result === 'raw' ? values : []));
  return query;
}

describe('MarketplaceSearchService', () => {
  it('paginates across category and product boundaries without loading all matches', async () => {
    const units = queryBuilder('entities');
    const categories = queryBuilder('entities');
    const products = queryBuilder('entities');
    units.getCount.mockImplementation(async () => 3);
    categories.getCount.mockImplementation(async () => 2);
    products.getCount.mockImplementation(async () => 1000);
    const service = new MarketplaceSearchService(
      { createQueryBuilder: () => units } as never,
      { createQueryBuilder: () => categories } as never,
      { createQueryBuilder: () => products } as never,
    );
    const result = await service.execute({ q: 'carne', page: 2, limit: 4 });
    expect(units.getMany).not.toHaveBeenCalled();
    expect(categories.offset).toHaveBeenCalledWith(1);
    expect(categories.limit).toHaveBeenCalledWith(1);
    expect(products.offset).toHaveBeenCalledWith(0);
    expect(products.limit).toHaveBeenCalledWith(3);
    expect(result.meta.total).toBe(1005);
  });

  it('searches product names and brands and applies an exact brand filter', async () => {
    const unitQuery = queryBuilder('entities');
    const categoryQuery = queryBuilder('entities');
    const productQuery = queryBuilder('entities');
    const service = new MarketplaceSearchService(
      { createQueryBuilder: () => unitQuery } as never,
      { createQueryBuilder: () => categoryQuery } as never,
      { createQueryBuilder: () => productQuery } as never,
    );

    await service.execute({
      q: 'picanha',
      brand: 'Swift',
      category: 'Bovinos',
      min_price: 30,
      max_price: 100,
      page: 1,
      limit: 20,
    });

    expect(productQuery.andWhere).toHaveBeenCalledWith(expect.stringContaining('product.brand'), {
      term: '%picanha%',
    });
    expect(productQuery.andWhere).toHaveBeenCalledWith('LOWER(TRIM(product.brand)) = :brand', {
      brand: 'swift',
    });
    expect(productQuery.andWhere).toHaveBeenCalledWith('LOWER(TRIM(category.name)) = :category', {
      category: 'bovinos',
    });
    expect(productQuery.andWhere).toHaveBeenCalledWith('product.price >= :minPrice', {
      minPrice: 30,
    });
    expect(productQuery.andWhere).toHaveBeenCalledWith('product.price <= :maxPrice', {
      maxPrice: 100,
    });
    expect(unitQuery.where).toHaveBeenCalledWith('1 = 0', {});
    expect(categoryQuery.andWhere).toHaveBeenCalledWith('1 = 0', {});
  });

  it('accepts a brand filter without a text query and suppresses unit/category matches', async () => {
    const unitQuery = queryBuilder('entities');
    const categoryQuery = queryBuilder('entities');
    const productQuery = queryBuilder('entities');
    const service = new MarketplaceSearchService(
      { createQueryBuilder: () => unitQuery } as never,
      { createQueryBuilder: () => categoryQuery } as never,
      { createQueryBuilder: () => productQuery } as never,
    );

    await expect(service.execute({ brand: 'Friboi', page: 1, limit: 20 })).resolves.toMatchObject({
      data: [],
    });
    expect(unitQuery.where).toHaveBeenCalledWith('1 = 0', {});
    expect(categoryQuery.andWhere).toHaveBeenCalledWith('1 = 0', {});
  });

  it('rejects an unfiltered request', async () => {
    const service = new MarketplaceSearchService(
      { createQueryBuilder: jest.fn() } as never,
      { createQueryBuilder: jest.fn() } as never,
      { createQueryBuilder: jest.fn() } as never,
    );
    await expect(service.execute({ page: 1, limit: 20 })).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('lists distinct available brands with optional scope filters', async () => {
    const productQuery = queryBuilder('raw', [{ brand: 'Friboi' }, { brand: 'Swift' }]);
    const service = new MarketplaceSearchService(
      {} as never,
      {} as never,
      { createQueryBuilder: () => productQuery } as never,
    );
    await expect(
      service.listBrands({ unit_id: 4, category_id: 7, category: 'Bovinos' }),
    ).resolves.toEqual(['Friboi', 'Swift']);
    expect(productQuery.andWhere).toHaveBeenCalledWith('product.unit_id = :unitId', { unitId: 4 });
    expect(productQuery.andWhere).toHaveBeenCalledWith('product.category_id = :categoryId', {
      categoryId: 7,
    });
    expect(productQuery.andWhere).toHaveBeenCalledWith('LOWER(TRIM(category.name)) = :category', {
      category: 'bovinos',
    });
  });
});
