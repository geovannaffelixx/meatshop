/* global jest */
import { ConfigService } from '@nestjs/config';
import { CheckoutQuoteService } from './checkout-quote.service';
import type { CartItem } from '../../cart/entities/cart-item.entity';
import { PaymentMethod } from '../enums/payment-method.enum';
import { DeliveryType } from '../enums/delivery-type.enum';

describe('Binding customer confirmation to the official quote', () => {
  const quotes = new CheckoutQuoteService(new ConfigService({ JWT_SECRET: 'test-signing-secret' }));
  const dto = { delivery_type: DeliveryType.PICKUP, payment_method: PaymentMethod.CASH };
  const items = [
    { product_id: 1, quantity: 1, product: { price: 10 } },
    { product_id: 2, quantity: 1, product: { price: 20 } },
  ] as CartItem[];
  const groups = [
    { unit_id: 1, subtotal: 10, discount_amount: 0, delivery_fee: 0, total_amount: 10 },
    { unit_id: 2, subtotal: 20, discount_amount: 0, delivery_fee: 0, total_amount: 20 },
  ];
  it('rejects redistributed per-seller amounts even when the combined total is unchanged', () => {
    const { quote_token: token } = quotes.issue(1, dto, items, groups);
    expect(() => quotes.assertCurrent(token, 1, dto, items, groups)).not.toThrow();
    expect(() =>
      quotes.assertCurrent(token, 1, dto, items, [
        { ...groups[0], subtotal: 15, total_amount: 15 },
        { ...groups[1], subtotal: 15, total_amount: 15 },
      ]),
    ).toThrow();
  });
  it('rejects another customer, a changed address/method, forged signatures and expired quotes', () => {
    const { quote_token: token } = quotes.issue(1, dto, items, groups);
    expect(() => quotes.assertCurrent(token, 2, dto, items, groups)).toThrow();
    expect(() =>
      quotes.assertCurrent(token, 1, { ...dto, address_id: 99 }, items, groups),
    ).toThrow();
    expect(() =>
      quotes.assertCurrent(token, 1, { ...dto, payment_method: PaymentMethod.PIX }, items, groups),
    ).toThrow();
    expect(() => quotes.assertCurrent(token.slice(0, -1) + 'z', 1, dto, items, groups)).toThrow();
    const now = Date.now();
    const clock = jest.spyOn(Date, 'now').mockReturnValue(now + 6 * 60_000);
    try {
      expect(() => quotes.assertCurrent(token, 1, dto, items, groups)).toThrow();
    } finally {
      clock.mockRestore();
    }
  });
});
