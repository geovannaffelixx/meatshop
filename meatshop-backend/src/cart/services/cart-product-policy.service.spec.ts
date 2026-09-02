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
    unit: { id: 1, name: 'Unidade A' },
  } as Product;

  it('accepts fractional quantities within current stock', async () => {
    const products = {
      findOne: jest.fn<() => Promise<Product | null>>().mockResolvedValue(product),
    } as unknown as Repository<Product>;
    const stocks = {
      findOne: jest.fn<() => Promise<Stock | null>>().mockResolvedValue({ quantity: 2.5 } as Stock),
    } as unknown as Repository<Stock>;

    await expect(new CartProductPolicyService(products, stocks).validate(10, 1.5)).resolves.toBe(
      product,
    );
  });

  it('rejects quantity above stock with a stable code', async () => {
    const products = {
      findOne: jest.fn<() => Promise<Product | null>>().mockResolvedValue(product),
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
      findOne: jest.fn<() => Promise<Product | null>>().mockResolvedValue({
        ...product,
        category: { active: false },
      } as Product),
    } as unknown as Repository<Product>;
    const stocks = { findOne: jest.fn() } as unknown as Repository<Stock>;

    await expect(
      new CartProductPolicyService(products, stocks).validate(10, 1),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(stocks.findOne).not.toHaveBeenCalled();
  });
});
