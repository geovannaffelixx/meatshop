import { jest } from '@jest/globals';
import type { Repository } from 'typeorm';
import type { CartItem } from '../../cart/entities/cart-item.entity';
import type { Promotion } from '../entities/promotion.entity';
import { PromotionalPriceService, promotionalUnitPrice } from './promotional-price.service';

describe('PromotionalPriceService', () => {
  const repository = (promotions: Partial<Promotion>[]) => {
    const find = jest.fn(async () => promotions);
    return { find, service: new PromotionalPriceService({ find } as unknown as Repository<Promotion>) };
  };

  it('uses the explicit promotional price or the percentage discount like the catalog', () => {
    expect(
      promotionalUnitPrice(80, { promotional_price: 69.9, discount_percentage: null }),
    ).toBe(69.9);
    expect(promotionalUnitPrice(80, { promotional_price: null, discount_percentage: 12.5 })).toBe(
      70,
    );
    expect(promotionalUnitPrice(33.33, { promotional_price: null, discount_percentage: 10 })).toBe(
      30,
    );
  });

  it('keeps the base price when no active promotion exists and only queries active periods', async () => {
    const { find, service } = repository([]);
    const at = new Date('2026-10-26T12:00:00Z');

    const prices = await service.currentPrices([{ id: 1, price: '50.00' }], undefined, at);

    expect(prices.get(1)).toBe(50);
    const [options] = find.mock.calls[0] as unknown as [{ where: Record<string, unknown> }];
    expect(options.where.active).toBe(true);
    expect(options.where).toHaveProperty('starts_at');
    expect(options.where).toHaveProperty('ends_at');
  });

  it('applies the lowest active promotion to each cart item', async () => {
    const { service } = repository([
      { product_id: 1, promotional_price: 45, discount_percentage: null },
      { product_id: 1, promotional_price: null, discount_percentage: 20 },
      { product_id: 2, promotional_price: 99, discount_percentage: null },
    ]);
    const items = [
      { product_id: 1, product: { id: 1, price: 50 } },
      { product_id: 2, product: { id: 2, price: 30 } },
    ] as CartItem[];

    await service.applyCurrentPrices(items);

    expect(items[0].unit_price).toBe(40);
    expect(items[1].unit_price).toBe(30);
  });
});
