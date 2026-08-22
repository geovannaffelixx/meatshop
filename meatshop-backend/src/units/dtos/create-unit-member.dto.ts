import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsIn, IsNotEmpty, IsString, Matches, MaxLength, MinLength } from 'class-validator';
import { LocalRole } from '../../common/enums/local-role.enum';

export class CreateUnitMemberDto {
  @ApiProperty({ example: 'Maria Silva' })
  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  @MaxLength(100)
  name: string;

  @ApiProperty({ example: 'maria@exemplo.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: '12345678901' })
  @Matches(/^\d{11}$/, { message: 'cpf must contain exactly 11 digits' })
  cpf: string;

  @ApiProperty({ example: 'SenhaTemporaria123!' })
  @MinLength(8)
  @MaxLength(64)
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).+$/, {
    message: 'password must contain uppercase, lowercase, number and special character',
  })
  password: string;

  @ApiProperty({ enum: [LocalRole.MANAGER, LocalRole.OPERATOR] })
  @IsIn([LocalRole.MANAGER, LocalRole.OPERATOR])
  local_role: LocalRole.MANAGER | LocalRole.OPERATOR;
}
