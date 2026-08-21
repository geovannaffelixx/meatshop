import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Coupon } from '../entities/coupon.entity';

@Injectable()
export class ValidateCouponUseCase {
  constructor(
    @InjectRepository(Coupon)
    private readonly couponRepository: Repository<Coupon>,
  ) {}

  async execute(code: string): Promise<Coupon> {
    const coupon = await this.couponRepository.findOne({
      where: { code: code.toUpperCase().trim() },
    });

    if (!coupon || !coupon.active || coupon.expires_at < new Date()) {
      throw new BadRequestException('Invalid or expired coupon');
    }

    return coupon;
  }
}
