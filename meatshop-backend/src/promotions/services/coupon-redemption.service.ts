import { BadRequestException, Injectable } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { Coupon } from '../entities/coupon.entity';
import { CouponRedemption } from '../entities/coupon-redemption.entity';
import { CouponRedemptionStatus } from '../enums/coupon-redemption-status.enum';
import { CouponPolicyService, ICouponContext } from './coupon-policy.service';

export interface IPreparedCoupon {
  coupon: Coupon;
  discountAmount: number;
}

@Injectable()
export class CouponRedemptionService {
  constructor(private readonly policy: CouponPolicyService) {}
  async prepare(
    code: string | undefined,
    context: ICouponContext,
    manager: EntityManager,
  ): Promise<IPreparedCoupon | null> {
    if (!code) return null;
    const coupon = await manager
      .getRepository(Coupon)
      .createQueryBuilder('coupon')
      .setLock('pessimistic_write')
      .leftJoinAndSelect('coupon.allowed_units', 'allowed')
      .where('coupon.code = :code', { code: code.toUpperCase().trim() })
      .getOne();
    if (!coupon)
      throw new BadRequestException({ code: 'COUPON_NOT_FOUND', message: 'Cupom não encontrado.' });
    const discountAmount = await this.policy.validate(coupon, context, manager);
    return { coupon, discountAmount };
  }

  async consume(
    prepared: IPreparedCoupon | null,
    orderId: number,
    context: ICouponContext,
    manager: EntityManager,
  ): Promise<void> {
    if (!prepared) return;
    await manager.save(
      CouponRedemption,
      manager.create(CouponRedemption, {
        coupon_id: prepared.coupon.id,
        user_id: context.userId,
        unit_id: context.unitId,
        order_id: orderId,
        discount_amount: prepared.discountAmount,
        status: CouponRedemptionStatus.REDEEMED,
      }),
    );
    await manager.increment(Coupon, { id: prepared.coupon.id }, 'current_usage_count', 1);
  }

  async releaseOrder(orderId: number, manager: EntityManager): Promise<void> {
    const redemption = await manager.findOne(CouponRedemption, {
      where: { order_id: orderId, status: CouponRedemptionStatus.REDEEMED },
    });
    if (!redemption) return;
    redemption.status = CouponRedemptionStatus.RELEASED;
    redemption.released_at = new Date();
    await manager.save(CouponRedemption, redemption);
    await manager.decrement(Coupon, { id: redemption.coupon_id }, 'current_usage_count', 1);
  }
}
