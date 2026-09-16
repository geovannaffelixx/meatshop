import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsInt, IsNotEmpty } from 'class-validator';
import { LocalRole } from '../../common/enums/local-role.enum';

export class CreateUserUnitDto {
  @ApiProperty({
    description: 'ID of the user to add as a unit member',
    example: 1,
  })
  @IsNotEmpty()
  @IsInt()
  user_id: number;

  @ApiProperty({
    description: 'Papel (role) do user dentro da unit',
    enum: LocalRole,
    example: LocalRole.OPERATOR,
  })
  @IsIn([LocalRole.MANAGER, LocalRole.OPERATOR])
  local_role: LocalRole;
}
