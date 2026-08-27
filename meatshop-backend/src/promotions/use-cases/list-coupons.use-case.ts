import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, Repository } from 'typeorm';
import { GlobalRole } from '../../common/enums/global-role.enum';
import { UnitPermission } from '../../common/enums/unit-permission.enum';
import { UnitAuthorizationService } from '../../units/services/unit-authorization.service';
import { User } from '../../users/entities/user.entity';
import { FilterCouponsDto } from '../dtos/filter-coupons.dto';
import { Coupon } from '../entities/coupon.entity';
import { CouponType } from '../enums/coupon-type.enum';

@Injectable()
export class ListCouponsUseCase {
  constructor(
    @InjectRepository(Coupon) private readonly coupons: Repository<Coupon>,
    private readonly authorization: UnitAuthorizationService,
  ) {}

  async execute(filters: FilterCouponsDto, actor: User) {
    if (actor.global_role !== GlobalRole.SUPER_ADMIN) {
      if (!filters.unit_id)
        throw new BadRequestException({
          code: 'COUPON_UNIT_REQUIRED',
          message: 'Informe a unidade para consultar os cupons.',
        });
      await this.authorization.assertHasPermission(
        actor,
        filters.unit_id,
        UnitPermission.MANAGE_PRODUCTS,
      );
    }
    const page = filters.page ?? 1,
      limit = filters.limit ?? 20;
    const query = this.coupons
      .createQueryBuilder('coupon')
      .leftJoinAndSelect('coupon.unit', 'unit')
      .leftJoinAndSelect('coupon.allowed_units', 'allowed')
      .leftJoinAndSelect('allowed.unit', 'allowedUnit')
      .leftJoinAndSelect('coupon.creator', 'creator')
      .select([
        'coupon',
        'unit.id',
        'unit.name',
        'allowed',
        'allowedUnit.id',
        'allowedUnit.name',
        'creator.id',
        'creator.name',
      ])
      .orderBy('coupon.created_at', 'DESC');
    if (filters.search)
      query.andWhere('(coupon.code ILIKE :search OR coupon.name ILIKE :search)', {
        search: `%${filters.search}%`,
      });
    if (filters.type) query.andWhere('coupon.type = :type', { type: filters.type });
    if (filters.active !== undefined)
      query.andWhere('coupon.active = :active', { active: filters.active });
    if (filters.unit_id)
      query.andWhere(
        new Brackets((q) =>
          q
            .where('coupon.type = :unitType AND coupon.unit_id = :unitId', {
              unitType: CouponType.UNIT,
              unitId: filters.unit_id,
            })
            .orWhere(
              "coupon.type = 'PLATFORM' AND (NOT EXISTS (SELECT 1 FROM coupon_units cu WHERE cu.coupon_id = coupon.id) OR allowed.unit_id = :unitId)",
              { unitId: filters.unit_id },
            ),
        ),
      );
    const [data, total] = await query
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();
    return {
      data,
      meta: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) },
    };
  }
}
