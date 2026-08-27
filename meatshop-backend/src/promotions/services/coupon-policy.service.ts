import { BadRequestException, Injectable } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { Coupon } from '../entities/coupon.entity';
import { CouponRedemption } from '../entities/coupon-redemption.entity';
import { CouponDiscountType } from '../enums/coupon-discount-type.enum';
import { CouponRedemptionStatus } from '../enums/coupon-redemption-status.enum';
import { CouponType } from '../enums/coupon-type.enum';

export interface ICouponContext {
  userId: number;
  unitId: number;
  subtotal: number;
}

@Injectable()
export class CouponPolicyService {
  async validate(coupon: Coupon, context: ICouponContext, manager: EntityManager): Promise<number> {
    this.assertLifecycle(coupon);
    this.assertScope(coupon, context.unitId);
    this.assertSubtotal(coupon, context.subtotal);
    await this.assertUsage(coupon, context.userId, manager);
    return this.calculateDiscount(coupon, context.subtotal);
  }

  calculateDiscount(coupon: Coupon, subtotal: number): number {
    const raw =
      coupon.discount_type === CouponDiscountType.PERCENTAGE
        ? subtotal * (Number(coupon.discount_amount) / 100)
        : Number(coupon.discount_amount);
    const capped = coupon.maximum_discount ? Math.min(raw, Number(coupon.maximum_discount)) : raw;
    return Math.min(Number(capped.toFixed(2)), subtotal);
  }

  private assertLifecycle(coupon: Coupon): void {
    const now = new Date();
    if (!coupon.active) this.fail('COUPON_INACTIVE', 'Este cupom está inativo.');
    if (coupon.starts_at > now)
      this.fail('COUPON_NOT_STARTED', 'Este cupom ainda não está válido.');
    if (coupon.expires_at <= now) this.fail('COUPON_EXPIRED', 'Este cupom expirou.');
    if (coupon.total_usage_limit && coupon.current_usage_count >= coupon.total_usage_limit) {
      this.fail('COUPON_USAGE_LIMIT_REACHED', 'O limite de utilizações deste cupom foi atingido.');
    }
  }

  private assertScope(coupon: Coupon, unitId: number): void {
    if (coupon.type === CouponType.UNIT && coupon.unit_id !== unitId) {
      this.fail('COUPON_NOT_APPLICABLE', 'Este cupom não é válido para esta unidade.');
    }
    if (
      coupon.type === CouponType.PLATFORM &&
      coupon.allowed_units?.length &&
      !coupon.allowed_units.some((item) => item.unit_id === unitId)
    ) {
      this.fail('COUPON_NOT_APPLICABLE', 'Este cupom não é válido para esta unidade.');
    }
  }

  private assertSubtotal(coupon: Coupon, subtotal: number): void {
    if (subtotal < Number(coupon.minimum_order_value)) {
      this.fail(
        'COUPON_MINIMUM_NOT_REACHED',
        `O pedido mínimo para este cupom é R$ ${Number(coupon.minimum_order_value).toFixed(2)}.`,
      );
    }
  }

  private async assertUsage(coupon: Coupon, userId: number, manager: EntityManager): Promise<void> {
    if (!coupon.usage_limit_per_user) return;
    const used = await manager.count(CouponRedemption, {
      where: { coupon_id: coupon.id, user_id: userId, status: CouponRedemptionStatus.REDEEMED },
    });
    if (used >= coupon.usage_limit_per_user)
      this.fail('COUPON_USER_LIMIT_REACHED', 'Você já atingiu o limite de uso deste cupom.');
  }

  private fail(code: string, message: string): never {
    throw new BadRequestException({ code, message });
  }
}
