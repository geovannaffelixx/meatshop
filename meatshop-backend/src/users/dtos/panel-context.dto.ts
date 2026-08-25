import { ApiProperty } from '@nestjs/swagger';
import { LocalRole } from '../../common/enums/local-role.enum';
import { UnitPermission } from '../../common/enums/unit-permission.enum';

export class PanelMembershipDto {
  @ApiProperty({ example: 3 })
  unit_id: number;

  @ApiProperty({ example: 'Master Carnes' })
  unit_name: string;

  @ApiProperty({ enum: LocalRole, nullable: true })
  role: LocalRole | null;

  @ApiProperty({ enum: UnitPermission, isArray: true })
  permissions: UnitPermission[];
}

export class PanelContextDto {
  @ApiProperty()
  can_access: boolean;

  @ApiProperty()
  requires_unit_selection: boolean;

  @ApiProperty({ type: PanelMembershipDto, isArray: true })
  memberships: PanelMembershipDto[];
}
