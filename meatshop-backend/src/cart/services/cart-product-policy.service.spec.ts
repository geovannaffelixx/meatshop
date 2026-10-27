import { NotFoundException } from '@nestjs/common';
import { jest } from '@jest/globals';
import type { Repository } from 'typeorm';
import type { Product } from '../../products/entities/product.entity';
import type { Stock } from '../../products/entities/stock.entity';
import { CartProductPolicyService } from './cart-product-policy.service';

describe('CartProductPolicyService', () => {
  const product = {
    id: 10,
    active: true,
    price: 39.9,
    category: { active: true },
    unit: { id: 1, name: 'Unit A' },
  } as Product;

  it('accepts fractional quantities within current stock', async () => {
    const products = {
      find: jest.fn<() => Promise<Product[]>>().mockResolvedValue([product]),
    } as unknown as Repository<Product>;
    const stocks = {
      findOne: jest.fn<() => Promise<Stock | null>>().mockResolvedValue({ quantity: 2.5 } as Stock),
    } as unknown as Repository<Stock>;

    await expect(new CartProductPolicyService(products, stocks).validate(10, 1.5)).resolves.toBe(
      product,
    );
  });

  it.each(['UN', 'PCT'])('rejects fractional quantities for %s', async (unit) => {
    const products = {
      find: jest.fn<() => Promise<Product[]>>().mockResolvedValue([
        {
          ...product,
          unit_of_measure: unit,
        },
      ]),
    } as unknown as Repository<Product>;
    const stocks = { findOne: jest.fn() } as unknown as Repository<Stock>;
    await expect(
      new CartProductPolicyService(products, stocks).validate(10, 0.5),
    ).rejects.toMatchObject({
      response: expect.objectContaining({ code: 'INVALID_PRODUCT_QUANTITY' }),
    });
    expect(stocks.findOne).not.toHaveBeenCalled();
  });

  it('rejects quantity above stock with a stable code', async () => {
    const products = {
      find: jest.fn<() => Promise<Product[]>>().mockResolvedValue([product]),
    } as unknown as Repository<Product>;
    const stocks = {
      findOne: jest.fn<() => Promise<Stock | null>>().mockResolvedValue({ quantity: 1 } as Stock),
    } as unknown as Repository<Stock>;
    const service = new CartProductPolicyService(products, stocks);

    await expect(service.validate(10, 1.5)).rejects.toMatchObject({
      response: expect.objectContaining({ code: 'INSUFFICIENT_STOCK' }),
    });
  });

  it('rejects inactive category as unavailable', async () => {
    const products = {
      find: jest.fn<() => Promise<Product[]>>().mockResolvedValue([
        {
          ...product,
          category: { active: false },
        } as Product,
      ]),
    } as unknown as Repository<Product>;
    const stocks = { findOne: jest.fn() } as unknown as Repository<Stock>;

    await expect(
      new CartProductPolicyService(products, stocks).validate(10, 1),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(stocks.findOne).not.toHaveBeenCalled();
  });
});
