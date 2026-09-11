import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Unit } from '../../units/entities/unit.entity';
import { CreateCouponDto } from '../dtos/create-coupon.dto';
import { CouponDiscountType } from '../enums/coupon-discount-type.enum';
import { CouponType } from '../enums/coupon-type.enum';

@Injectable()
export class CouponWriteValidatorService {
  constructor(@InjectRepository(Unit) private readonly units: Repository<Unit>) {}

  async validate(dto: CreateCouponDto, allowExistingExpiration = false): Promise<void> {
    this.validateDates(dto.starts_at, dto.expires_at, allowExistingExpiration);
    this.validateDiscount(dto.discount_type, dto.discount_amount, dto.maximum_discount);
    this.validateScope(dto);
    await this.validateUnits(dto);
  }

  private validateDates(
    startsAt: string,
    expiresAt: string,
    allowExistingExpiration: boolean,
  ): void {
    if (new Date(expiresAt) <= new Date(startsAt))
      this.fail('COUPON_INVALID_PERIOD', 'The end date must be after the start date.');
    if (!allowExistingExpiration && new Date(expiresAt) <= new Date())
      this.fail('COUPON_EXPIRATION_IN_PAST', 'The coupon expiration date must be in the future.');
  }

  private validateDiscount(type: CouponDiscountType, amount: number, maximum?: number): void {
    if (type === CouponDiscountType.PERCENTAGE && amount > 100)
      this.fail('COUPON_INVALID_PERCENTAGE', 'The percentage must not exceed 100%.');
    if (type === CouponDiscountType.FIXED && maximum !== undefined)
      this.fail(
        'COUPON_MAXIMUM_NOT_ALLOWED',
        'The discount cap can only be used for percentage coupons.',
      );
  }

  private validateScope(dto: CreateCouponDto): void {
    if (dto.type === CouponType.UNIT && !dto.unit_id)
      this.fail('COUPON_UNIT_REQUIRED', 'Provide the coupon unit.');
    if (dto.type === CouponType.UNIT && dto.allowed_unit_ids?.length)
      this.fail('COUPON_INVALID_SCOPE', 'A unit coupon does not accept additional units.');
    if (dto.type === CouponType.PLATFORM && dto.unit_id)
      this.fail('COUPON_INVALID_SCOPE', 'A platform coupon does not have an owning unit.');
  }

  private async validateUnits(dto: CreateCouponDto): Promise<void> {
    const ids = dto.type === CouponType.UNIT ? [dto.unit_id!] : (dto.allowed_unit_ids ?? []);
    if (!ids.length) return;
    const count = await this.units.count({ where: { id: In(ids) } });
    if (count !== ids.length)
      throw new NotFoundException({
        code: 'COUPON_UNIT_NOT_FOUND',
        message: 'One or more selected units do not exist.',
      });
  }

  private fail(code: string, message: string): never {
    throw new BadRequestException({ code, message });
  }
}
