import { BadRequestException } from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';
import type { CartItem } from '../../cart/entities/cart-item.entity';
import type { Unit } from '../../units/entities/unit.entity';
import type { Address } from '../../users/entities/address.entity';
import { DeliveryType } from '../enums/delivery-type.enum';
import { CheckoutPricingService } from './checkout-pricing.service';

/* global jest */
describe('CheckoutPricingService', () => {
  const config = {
    get: jest.fn((_name: string, fallback: string) => (fallback === '0' ? '8.50' : fallback)),
  } as unknown as ConfigService;
  const service = new CheckoutPricingService(config);

  const item = (unitId: number, productId: number, price: number, quantity: number) =>
    ({
      product_id: productId,
      quantity,
      product: {
        id: productId,
        unit_id: unitId,
        price,
      },
    }) as CartItem;

  it('groups a single cart into one order per unit with fractional quantities', () => {
    const groups = service.group([item(9, 2, 40, 0.5), item(4, 1, 20, 1.25), item(9, 3, 10, 2)], {
      delivery_type: DeliveryType.DELIVERY,
      coupon_codes: [{ unit_id: 9, code: 'UNIT9' }],
    });

    expect(groups.map((group) => group.unitId)).toEqual([4, 9]);
    expect(groups[0].subtotal).toBe(25);
    expect(groups[1].subtotal).toBe(40);
    expect(groups[1].couponCode).toBe('UNIT9');
  });

  it('requires coupon scope for a multi-unit cart', () => {
    expect(() =>
      service.group([item(1, 1, 10, 1), item(2, 2, 10, 1)], {
        delivery_type: DeliveryType.DELIVERY,
        coupon_code: 'AMBIGUOUS',
      }),
    ).toThrow(BadRequestException);
  });

  it('calculates money and one delivery fee per order on the server', () => {
    expect(service.amounts(100, 12.345, DeliveryType.DELIVERY)).toEqual({
      subtotal: 100,
      discount_amount: 12.35,
      delivery_fee: 8.5,
      total_amount: 96.16,
    });
    expect(service.amounts(100, 0, DeliveryType.PICKUP).delivery_fee).toBe(0);
  });

  it('uses the configured fallback when delivery coordinates are unavailable', () => {
    const unit = { latitude: null, longitude: null } as unknown as Unit;
    const address = { latitude: -16.3285, longitude: -48.9534 } as Address;

    expect(service.deliveryFee(unit, address, DeliveryType.DELIVERY)).toBe(8.5);
    expect(service.deliveryFee(unit, address, DeliveryType.PICKUP)).toBe(0);
  });

  it('calculates distance delivery fee from unit and destination coordinates', () => {
    const unit = { latitude: -16.3285, longitude: -48.9534 } as Unit;
    const address = { latitude: -16.3385, longitude: -48.9634 } as Address;
    const weekday = new Date('2026-09-02T15:00:00-03:00');

    expect(service.deliveryFee(unit, address, DeliveryType.DELIVERY, weekday)).toBe(4.9);
  });
});
