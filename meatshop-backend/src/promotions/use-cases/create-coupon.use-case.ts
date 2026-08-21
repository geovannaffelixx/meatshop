import { ConflictException, Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateCouponDto } from '../dtos/create-coupon.dto';
import { Coupon } from '../entities/coupon.entity';

@Injectable()
export class CreateCouponUseCase {
  private readonly logger = new Logger(CreateCouponUseCase.name);

  constructor(
    @InjectRepository(Coupon)
    private readonly couponRepository: Repository<Coupon>,
  ) {}

  async execute(dto: CreateCouponDto): Promise<Coupon> {
    const code = dto.code.toUpperCase().trim();
    await this.ensureCodeIsUnique(code);

    const coupon = this.couponRepository.create({
      ...dto,
      code,
      expires_at: new Date(dto.expires_at),
    });
    await this.couponRepository.save(coupon);

    this.logger.log(`Coupon ${coupon.id} (${coupon.code}) created`);

    return coupon;
  }

  private async ensureCodeIsUnique(code: string): Promise<void> {
    const existing = await this.couponRepository.findOne({ where: { code } });
    if (existing) {
      throw new ConflictException('Coupon code already in use');
    }
  }
}
