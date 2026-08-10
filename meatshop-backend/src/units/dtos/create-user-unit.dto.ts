import { IsEnum, IsInt, IsNotEmpty } from 'class-validator';
import { LocalRole } from '../../common/enums/local-role.enum';

export class CreateUserUnitDto {
  @IsNotEmpty()
  @IsInt()
  user_id: number;

  @IsEnum(LocalRole)
  local_role: LocalRole;
}
