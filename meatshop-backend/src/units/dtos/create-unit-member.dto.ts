import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsEnum,
  IsIn,
  IsNotEmpty,
  IsString,
  Matches,
  MaxLength,
  MinLength,
  ValidateIf,
} from 'class-validator';
import { LocalRole } from '../../common/enums/local-role.enum';
import { DeliveryMode } from '../../delivery/enums/delivery-mode.enum';

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

  @ApiProperty({
    enum: [LocalRole.MANAGER, LocalRole.OPERATOR, LocalRole.DELIVERY],
  })
  @IsIn([LocalRole.MANAGER, LocalRole.OPERATOR, LocalRole.DELIVERY])
  local_role: LocalRole.MANAGER | LocalRole.OPERATOR | LocalRole.DELIVERY;

  @ApiPropertyOptional({ enum: DeliveryMode })
  @ValidateIf((dto: CreateUnitMemberDto) => dto.local_role === LocalRole.DELIVERY)
  @IsEnum(DeliveryMode)
  vehicle?: DeliveryMode;
}
