import { jest } from '@jest/globals';
import { ConflictException } from '@nestjs/common';
import { UpdateStockUseCase } from './update-stock.use-case';
import { CreateProductUseCase } from './create-product.use-case';
import { Product } from '../entities/product.entity';
import { Stock } from '../entities/stock.entity';

describe('Stock consistency', () => {
  function stockSetup() {
    const stock = { product_id: 1, quantity: 8, min_quantity: 1 };
    const manager = {
      findOne: jest.fn(async () => stock),
      save: jest.fn(async (_entity, row) => row),
    };
    const service = new UpdateStockUseCase(
      { findOne: async () => ({ id: 1, unit_id: 2 }) } as never,
      {
        manager: {
          transaction: async (work: (value: typeof manager) => Promise<unknown>) => work(manager),
        },
      } as never,
      { assertHasPermission: async () => undefined } as never,
    );
    return { service, manager, stock };
  }
  it('rejects a stale stock adjustment after a customer purchase without overwriting it', async () => {
    const { service, stock, manager } = stockSetup();
    await expect(
      service.execute(1, { quantity: 10, expected_quantity: 10 }, {} as never),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(stock.quantity).toBe(8);
    expect(manager.save).not.toHaveBeenCalled();
  });
  it('updates only the minimum without restoring an old available quantity', async () => {
    const { service, stock } = stockSetup();
    await service.execute(1, { min_quantity: 3 }, {} as never);
    expect(stock).toMatchObject({ quantity: 8, min_quantity: 3 });
  });
  it('allows an intentional adjustment based on the latest quantity', async () => {
    const { service, stock } = stockSetup();
    await service.execute(1, { quantity: 12, expected_quantity: 8 }, {} as never);
    expect(stock.quantity).toBe(12);
  });
});

describe('Atomic product creation', () => {
  function setup(failStock: boolean) {
    const products: unknown[] = [];
    const stocks: unknown[] = [];
    const manager = {
      create: (_entity: unknown, data: object) => ({ ...data }),
      save: async (entity: unknown, data: object) => {
        if (entity === Stock && failStock) throw new Error('stock persistence failed');
        const row = { id: 1, ...data };
        (entity === Product ? products : stocks).push(row);
        return row;
      },
    };
    const transaction = async (work: (value: typeof manager) => Promise<unknown>) => {
      try {
        return await work(manager);
      } catch (error) {
        products.length = 0;
        stocks.length = 0;
        throw error;
      }
    };
    const service = new CreateProductUseCase(
      { manager: { transaction } } as never,
      {} as never,
      { findOne: async () => ({ id: 2 }) } as never,
      { findOne: async () => ({ id: 3, unit_id: 2 }) } as never,
      { assertHasPermission: async () => undefined } as never,
    );
    const dto = {
      name: 'Produto',
      price: 20,
      unit_id: 2,
      category_id: 3,
      unit_of_measure: 'KG',
      initial_quantity: 10,
      min_quantity: 2,
    };
    return { service, dto, products, stocks };
  }
  it('does not leave a product behind when its initial stock fails', async () => {
    const { service, dto, products } = setup(true);
    await expect(service.execute(dto, { id: 1 } as never)).rejects.toThrow(
      'stock persistence failed',
    );
    expect(products).toEqual([]);
  });
  it('creates product and initial stock together', async () => {
    const { service, dto, products, stocks } = setup(false);
    await service.execute(dto, { id: 1 } as never);
    expect(products).toHaveLength(1);
    expect(products[0]).not.toHaveProperty('initial_quantity');
    expect(stocks[0]).toMatchObject({ product_id: 1, quantity: 10, min_quantity: 2 });
  });
});
