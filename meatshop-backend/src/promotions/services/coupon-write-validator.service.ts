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
      this.fail('COUPON_INVALID_PERIOD', 'A data final deve ser posterior à data inicial.');
    if (!allowExistingExpiration && new Date(expiresAt) <= new Date())
      this.fail('COUPON_EXPIRATION_IN_PAST', 'A validade do cupom deve estar no futuro.');
  }

  private validateDiscount(type: CouponDiscountType, amount: number, maximum?: number): void {
    if (type === CouponDiscountType.PERCENTAGE && amount > 100)
      this.fail('COUPON_INVALID_PERCENTAGE', 'O percentual deve ser de no máximo 100%.');
    if (type === CouponDiscountType.FIXED && maximum !== undefined)
      this.fail(
        'COUPON_MAXIMUM_NOT_ALLOWED',
        'O teto de desconto só pode ser usado em cupons percentuais.',
      );
  }

  private validateScope(dto: CreateCouponDto): void {
    if (dto.type === CouponType.UNIT && !dto.unit_id)
      this.fail('COUPON_UNIT_REQUIRED', 'Informe a unidade do cupom.');
    if (dto.type === CouponType.UNIT && dto.allowed_unit_ids?.length)
      this.fail('COUPON_INVALID_SCOPE', 'Cupom de unidade não aceita unidades adicionais.');
    if (dto.type === CouponType.PLATFORM && dto.unit_id)
      this.fail('COUPON_INVALID_SCOPE', 'Cupom da plataforma não possui uma unidade proprietária.');
  }

  private async validateUnits(dto: CreateCouponDto): Promise<void> {
    const ids = dto.type === CouponType.UNIT ? [dto.unit_id!] : (dto.allowed_unit_ids ?? []);
    if (!ids.length) return;
    const count = await this.units.count({ where: { id: In(ids) } });
    if (count !== ids.length)
      throw new NotFoundException({
        code: 'COUPON_UNIT_NOT_FOUND',
        message: 'Uma ou mais unidades selecionadas não existem.',
      });
  }

  private fail(code: string, message: string): never {
    throw new BadRequestException({ code, message });
  }
}
