import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { CouponRedemption } from '../entities/coupon-redemption.entity';
import { GetCouponUseCase } from './get-coupon.use-case';

@Injectable()
export class ListCouponRedemptionsUseCase {
  constructor(
    @InjectRepository(CouponRedemption) private readonly redemptions: Repository<CouponRedemption>,
    private readonly getCoupon: GetCouponUseCase,
  ) {}

  async execute(couponId: number, actor: User) {
    await this.getCoupon.execute(couponId, actor);
    return this.redemptions
      .createQueryBuilder('redemption')
      .leftJoinAndSelect('redemption.user', 'user')
      .leftJoinAndSelect('redemption.unit', 'unit')
      .select(['redemption', 'user.id', 'user.name', 'unit.id', 'unit.name'])
      .where('redemption.coupon_id = :couponId', { couponId })
      .orderBy('redemption.redeemed_at', 'DESC')
      .take(500)
      .getMany();
  }
}
