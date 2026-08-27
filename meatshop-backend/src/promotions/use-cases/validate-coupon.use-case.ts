import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Coupon } from '../entities/coupon.entity';
import { CouponPolicyService } from '../services/coupon-policy.service';

@Injectable()
export class ValidateCouponUseCase {
  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly policy: CouponPolicyService,
  ) {}

  async execute(code: string, user: User, unitId: number, subtotal: number) {
    const coupon = await this.dataSource
      .getRepository(Coupon)
      .findOne({ where: { code: code.toUpperCase().trim() }, relations: { allowed_units: true } });
    if (!coupon)
      throw new BadRequestException({ code: 'COUPON_NOT_FOUND', message: 'Cupom não encontrado.' });
    const discountAmount = await this.dataSource.transaction((manager) =>
      this.policy.validate(coupon, { userId: user.id, unitId, subtotal }, manager),
    );
    return {
      coupon,
      discount_amount: discountAmount,
      total_after_discount: Math.max(0, subtotal - discountAmount),
    };
  }
}
