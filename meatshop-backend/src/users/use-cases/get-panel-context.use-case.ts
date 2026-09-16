import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { GlobalRole } from '../../common/enums/global-role.enum';
import { UnitPermission } from '../../common/enums/unit-permission.enum';
import { Unit } from '../../units/entities/unit.entity';
import { UnitAuthorizationService } from '../../units/services/unit-authorization.service';
import { UnitPermissionPolicy } from '../../units/services/unit-permission.policy';
import { PanelContextDto } from '../dtos/panel-context.dto';
import { User } from '../entities/user.entity';

@Injectable()
export class GetPanelContextUseCase {
  constructor(
    @InjectRepository(Unit)
    private readonly unitRepository: Repository<Unit>,
    private readonly unitAuthorizationService: UnitAuthorizationService,
    private readonly permissionPolicy: UnitPermissionPolicy,
  ) {}

  async execute(user: User): Promise<PanelContextDto> {
    if (user.global_role === GlobalRole.SUPER_ADMIN) {
      const units = await this.unitRepository.find({ order: { name: 'ASC' } });
      return {
        can_access: true,
        requires_unit_selection: true,
        memberships: units.map((unit) => ({
          unit_id: unit.id,
          unit_name: unit.name,
          unit_image_url: unit.image_url,
          role: null,
          permissions: Object.values(UnitPermission),
        })),
      };
    }

    const memberships = await this.unitAuthorizationService.getActivePanelMemberships(user.id);
    return {
      can_access: memberships.length > 0,
      requires_unit_selection: memberships.length > 1,
      memberships: memberships.map((membership) => ({
        unit_id: membership.unit_id,
        unit_name: membership.unit.name,
        unit_image_url: membership.unit.image_url,
        role: membership.local_role,
        permissions: this.permissionPolicy.permissionsFor(membership.local_role),
      })),
    };
  }
}
