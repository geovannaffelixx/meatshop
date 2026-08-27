import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { GlobalRole } from '../../common/enums/global-role.enum';
import { CouponDiscountType } from '../enums/coupon-discount-type.enum';
import { CouponType } from '../enums/coupon-type.enum';
import { CreateCouponDto } from '../dtos/create-coupon.dto';
import { UpdateCouponDto } from '../dtos/update-coupon.dto';
import { Coupon } from '../entities/coupon.entity';
import { CouponUnit } from '../entities/coupon-unit.entity';
import { CouponAccessService } from '../services/coupon-access.service';
import { CouponWriteValidatorService } from '../services/coupon-write-validator.service';

@Injectable()
export class UpdateCouponUseCase {
  constructor(
    @InjectRepository(Coupon) private readonly coupons: Repository<Coupon>,
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly access: CouponAccessService,
    private readonly validator: CouponWriteValidatorService,
  ) {}

  async execute(id: number, dto: UpdateCouponDto, actor: User): Promise<Coupon> {
    const coupon = await this.coupons.findOne({
      where: { id },
      relations: { allowed_units: true },
    });
    if (!coupon)
      throw new NotFoundException({ code: 'COUPON_NOT_FOUND', message: 'Cupom não encontrado.' });
    await this.access.assertCanManage(coupon, actor);
    this.assertActorCanChangeScope(coupon, dto, actor);
    this.assertImmutableScope(coupon, dto);
    const merged = this.mergeForValidation(coupon, dto);
    await this.validator.validate(merged, dto.expires_at === undefined);
    return this.dataSource.transaction(async (manager) => {
      this.assign(coupon, dto);
      await manager.save(Coupon, coupon);
      if (dto.allowed_unit_ids) {
        await manager.delete(CouponUnit, { coupon_id: id });
        await manager.save(
          CouponUnit,
          dto.allowed_unit_ids.map((unit_id) => ({ coupon_id: id, unit_id })),
        );
      }
      return manager.findOneOrFail(Coupon, {
        where: { id },
        relations: { unit: true, allowed_units: { unit: true } },
      });
    });
  }

  private assertImmutableScope(coupon: Coupon, dto: UpdateCouponDto): void {
    if (
      coupon.current_usage_count > 0 &&
      ((dto.type && dto.type !== coupon.type) ||
        (dto.unit_id !== undefined && dto.unit_id !== coupon.unit_id))
    ) {
      throw new BadRequestException({
        code: 'COUPON_SCOPE_IMMUTABLE',
        message: 'O escopo de um cupom já utilizado não pode ser alterado.',
      });
    }
  }

  private assertActorCanChangeScope(coupon: Coupon, dto: UpdateCouponDto, actor: User): void {
    if (actor.global_role === GlobalRole.SUPER_ADMIN) return;
    if (
      (dto.type && dto.type !== coupon.type) ||
      (dto.unit_id && dto.unit_id !== coupon.unit_id) ||
      dto.allowed_unit_ids
    ) {
      throw new BadRequestException({
        code: 'COUPON_SCOPE_FORBIDDEN',
        message: 'O escopo do cupom só pode ser alterado pela administração MeatShop.',
      });
    }
  }

  private mergeForValidation(coupon: Coupon, dto: UpdateCouponDto): CreateCouponDto {
    return {
      code: coupon.code,
      name: dto.name ?? coupon.name,
      description: dto.description ?? coupon.description ?? undefined,
      type: dto.type ?? coupon.type,
      unit_id: dto.unit_id ?? coupon.unit_id ?? undefined,
      allowed_unit_ids:
        (dto.type ?? coupon.type) === CouponType.PLATFORM
          ? (dto.allowed_unit_ids ?? coupon.allowed_units.map((item) => item.unit_id))
          : [],
      discount_type: dto.discount_type ?? coupon.discount_type,
      discount_amount: dto.discount_amount ?? Number(coupon.discount_amount),
      maximum_discount:
        (dto.discount_type ?? coupon.discount_type) === CouponDiscountType.FIXED
          ? undefined
          : dto.maximum_discount === null
            ? undefined
            : (dto.maximum_discount ??
              (coupon.maximum_discount ? Number(coupon.maximum_discount) : undefined)),
      minimum_order_value: dto.minimum_order_value ?? Number(coupon.minimum_order_value),
      starts_at: dto.starts_at ?? coupon.starts_at.toISOString(),
      expires_at: dto.expires_at ?? coupon.expires_at.toISOString(),
      total_usage_limit:
        dto.total_usage_limit === null
          ? undefined
          : (dto.total_usage_limit ?? coupon.total_usage_limit ?? undefined),
      usage_limit_per_user:
        dto.usage_limit_per_user === null
          ? undefined
          : (dto.usage_limit_per_user ?? coupon.usage_limit_per_user ?? undefined),
      active: dto.active ?? coupon.active,
    };
  }

  private assign(coupon: Coupon, dto: UpdateCouponDto): void {
    const data = { ...dto };
    const startsAt = data.starts_at;
    const expiresAt = data.expires_at;
    delete data.allowed_unit_ids;
    delete data.starts_at;
    delete data.expires_at;
    Object.assign(coupon, data);
    if (dto.discount_type === CouponDiscountType.FIXED) coupon.maximum_discount = null;
    if (startsAt) coupon.starts_at = new Date(startsAt);
    if (expiresAt) coupon.expires_at = new Date(expiresAt);
  }
}
