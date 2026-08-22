import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsInt, IsNotEmpty } from 'class-validator';
import { LocalRole } from '../../common/enums/local-role.enum';

export class CreateUserUnitDto {
  @ApiProperty({
    description: 'ID do usuario a ser adicionado como membro da unidade',
    example: 1,
  })
  @IsNotEmpty()
  @IsInt()
  user_id: number;

  @ApiProperty({
    description: 'Papel (role) do usuario dentro da unidade',
    enum: LocalRole,
    example: LocalRole.OPERATOR,
  })
  @IsIn([LocalRole.MANAGER, LocalRole.OPERATOR])
  local_role: LocalRole;
}
