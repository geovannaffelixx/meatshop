import { ForbiddenException, Injectable } from '@nestjs/common';
import { GlobalRole } from '../../common/enums/global-role.enum';
import { User } from '../../users/entities/user.entity';
import { Unit } from '../entities/unit.entity';

@Injectable()
export class UnitAuthorizationService {
  assertCanManageUnit(unit: Unit, currentUser: User): void {
    const isOwner = unit.admin_id === currentUser.id;
    const isSuperAdmin = currentUser.global_role === GlobalRole.SUPER_ADMIN;

    if (!isOwner && !isSuperAdmin) {
      throw new ForbiddenException(
        'Only the unit admin or a super admin can perform this action',
      );
    }
  }
}
