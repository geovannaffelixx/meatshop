import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Coupon } from '../entities/coupon.entity';

@Injectable()
export class ListCouponsUseCase {
  constructor(
    @InjectRepository(Coupon)
    private readonly couponRepository: Repository<Coupon>,
  ) {}

  async execute(): Promise<Coupon[]> {
    return this.couponRepository.find({ order: { id: 'ASC' } });
  }
}
