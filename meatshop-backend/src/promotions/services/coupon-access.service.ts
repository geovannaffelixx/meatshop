import { ForbiddenException, Injectable } from '@nestjs/common';
import { GlobalRole } from '../../common/enums/global-role.enum';
import { UnitPermission } from '../../common/enums/unit-permission.enum';
import { UnitAuthorizationService } from '../../units/services/unit-authorization.service';
import { User } from '../../users/entities/user.entity';
import { Coupon } from '../entities/coupon.entity';
import { CouponType } from '../enums/coupon-type.enum';

@Injectable()
export class CouponAccessService {
  constructor(private readonly unitAuthorization: UnitAuthorizationService) {}

  async assertCanCreate(type: CouponType, unitId: number | undefined, actor: User): Promise<void> {
    if (type === CouponType.PLATFORM) this.assertSuperAdmin(actor);
    else
      await this.unitAuthorization.assertHasPermission(
        actor,
        unitId!,
        UnitPermission.MANAGE_PRODUCTS,
      );
  }

  async assertCanManage(coupon: Coupon, actor: User): Promise<void> {
    if (actor.global_role === GlobalRole.SUPER_ADMIN) return;
    if (coupon.type === CouponType.PLATFORM || !coupon.unit_id) this.assertSuperAdmin(actor);
    await this.unitAuthorization.assertHasPermission(
      actor,
      coupon.unit_id!,
      UnitPermission.MANAGE_PRODUCTS,
    );
  }

  assertSuperAdmin(actor: User): void {
    if (actor.global_role !== GlobalRole.SUPER_ADMIN) {
      throw new ForbiddenException({
        code: 'COUPON_PLATFORM_FORBIDDEN',
        message: 'Somente a administração MeatShop pode gerenciar cupons da plataforma.',
      });
    }
  }
}
