import { ConflictException, Injectable } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { CreateCouponDto } from '../dtos/create-coupon.dto';
import { Coupon } from '../entities/coupon.entity';
import { CouponUnit } from '../entities/coupon-unit.entity';
import { CouponAccessService } from '../services/coupon-access.service';
import { CouponWriteValidatorService } from '../services/coupon-write-validator.service';

@Injectable()
export class CreateCouponUseCase {
  constructor(
    @InjectRepository(Coupon) private readonly coupons: Repository<Coupon>,
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly access: CouponAccessService,
    private readonly validator: CouponWriteValidatorService,
  ) {}

  async execute(dto: CreateCouponDto, actor: User): Promise<Coupon> {
    const code = dto.code.toUpperCase().trim();
    await this.access.assertCanCreate(dto.type, dto.unit_id, actor);
    await this.validator.validate(dto);
    if (await this.coupons.exists({ where: { code } })) {
      throw new ConflictException({
        code: 'COUPON_ALREADY_EXISTS',
        message: 'Já existe um cupom com este código.',
      });
    }
    return this.dataSource.transaction(async (manager) => {
      const coupon = await manager.save(
        Coupon,
        manager.create(Coupon, this.toEntity(dto, code, actor.id)),
      );
      await manager.save(
        CouponUnit,
        (dto.allowed_unit_ids ?? []).map((unit_id) => ({ coupon_id: coupon.id, unit_id })),
      );
      return manager.findOneOrFail(Coupon, {
        where: { id: coupon.id },
        relations: { unit: true, allowed_units: { unit: true } },
      });
    });
  }

  private toEntity(dto: CreateCouponDto, code: string, actorId: number): Partial<Coupon> {
    const data = { ...dto };
    delete data.allowed_unit_ids;
    return {
      ...data,
      code,
      name: dto.name.trim(),
      description: dto.description?.trim() || null,
      unit_id: dto.unit_id ?? null,
      maximum_discount: dto.maximum_discount ?? null,
      minimum_order_value: dto.minimum_order_value ?? 0,
      total_usage_limit: dto.total_usage_limit ?? null,
      usage_limit_per_user: dto.usage_limit_per_user ?? null,
      starts_at: new Date(dto.starts_at),
      expires_at: new Date(dto.expires_at),
      created_by: actorId,
    };
  }
}
