import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UpdateCouponDto } from '../dtos/update-coupon.dto';
import { Coupon } from '../entities/coupon.entity';

@Injectable()
export class UpdateCouponUseCase {
  constructor(
    @InjectRepository(Coupon)
    private readonly couponRepository: Repository<Coupon>,
  ) {}

  async execute(couponId: number, dto: UpdateCouponDto): Promise<Coupon> {
    const coupon = await this.couponRepository.findOne({ where: { id: couponId } });
    if (!coupon) {
      throw new NotFoundException('Coupon not found');
    }

    Object.assign(coupon, dto);
    if (dto.expires_at) {
      coupon.expires_at = new Date(dto.expires_at);
    }

    return this.couponRepository.save(coupon);
  }
}
