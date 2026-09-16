import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional } from 'class-validator';
import { LocalRole } from '../../common/enums/local-role.enum';
import { UserUnitStatus } from '../../common/enums/user-unit-status.enum';

export class UpdateUnitMemberDto {
  @ApiPropertyOptional({ enum: [LocalRole.MANAGER, LocalRole.OPERATOR] })
  @IsOptional()
  @IsIn([LocalRole.MANAGER, LocalRole.OPERATOR])
  local_role?: LocalRole;

  @ApiPropertyOptional({ enum: UserUnitStatus })
  @IsOptional()
  @IsIn([UserUnitStatus.ACTIVE, UserUnitStatus.INACTIVE])
  status?: UserUnitStatus;
}
