/* global jest */
import type { Coupon } from '../entities/coupon.entity';
import { CouponDiscountType } from '../enums/coupon-discount-type.enum';
import { CouponType } from '../enums/coupon-type.enum';
import { CouponPolicyService } from './coupon-policy.service';

describe('CouponPolicyService', () => {
  const service = new CouponPolicyService();
  const manager = { count: jest.fn().mockResolvedValue(0) } as never;
  const base = {
    id: 1,
    active: true,
    type: CouponType.PLATFORM,
    allowed_units: [],
    starts_at: new Date(Date.now() - 1000),
    expires_at: new Date(Date.now() + 60000),
    discount_type: CouponDiscountType.PERCENTAGE,
    discount_amount: 20,
    maximum_discount: 15,
    minimum_order_value: 50,
    total_usage_limit: 10,
    current_usage_count: 0,
    usage_limit_per_user: 1,
  } as unknown as Coupon;

  it('calcula percentual com teto', async () => {
    await expect(
      service.validate(base, { userId: 1, unitId: 2, subtotal: 100 }, manager),
    ).resolves.toBe(15);
  });

  it('recusa pedido abaixo do mínimo', async () => {
    await expect(
      service.validate(base, { userId: 1, unitId: 2, subtotal: 40 }, manager),
    ).rejects.toMatchObject({ response: { code: 'COUPON_MINIMUM_NOT_REACHED' } });
  });

  it('recusa unidade fora do escopo selecionado', async () => {
    const coupon = { ...base, allowed_units: [{ unit_id: 3 }] } as Coupon;
    await expect(
      service.validate(coupon, { userId: 1, unitId: 2, subtotal: 100 }, manager),
    ).rejects.toMatchObject({ response: { code: 'COUPON_NOT_APPLICABLE' } });
  });

  it('recusa limite total esgotado', async () => {
    const coupon = { ...base, current_usage_count: 10 } as Coupon;
    await expect(
      service.validate(coupon, { userId: 1, unitId: 2, subtotal: 100 }, manager),
    ).rejects.toMatchObject({ response: { code: 'COUPON_USAGE_LIMIT_REACHED' } });
  });
});
