import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsInt, IsNotEmpty } from 'class-validator';
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
    example: LocalRole.MEMBER,
  })
  @IsEnum(LocalRole)
  local_role: LocalRole;
}
