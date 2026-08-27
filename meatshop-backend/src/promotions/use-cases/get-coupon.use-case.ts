import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Coupon } from '../entities/coupon.entity';
import { CouponAccessService } from '../services/coupon-access.service';

@Injectable()
export class GetCouponUseCase {
  constructor(
    @InjectRepository(Coupon) private readonly coupons: Repository<Coupon>,
    private readonly access: CouponAccessService,
  ) {}

  async execute(id: number, actor: User): Promise<Coupon> {
    const coupon = await this.coupons.findOne({
      where: { id },
      relations: { unit: true, allowed_units: { unit: true }, creator: true },
    });
    if (!coupon)
      throw new NotFoundException({ code: 'COUPON_NOT_FOUND', message: 'Cupom não encontrado.' });
    await this.access.assertCanManage(coupon, actor);
    return coupon;
  }
}
