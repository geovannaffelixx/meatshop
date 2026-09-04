import { ApiProperty } from '@nestjs/swagger';
import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';
import { AppProfile } from '../../common/enums/app-profile.enum';

export class RegisterDto {
  @ApiProperty({
    description: 'Nome completo do usuário',
    example: 'João da Silva',
  })
  @IsNotEmpty()
  @IsString()
  @MaxLength(100)
  name: string;

  @ApiProperty({
    description: 'Endereço de e-mail do usuário',
    example: 'cliente@meatshop.com',
  })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({
    description: 'CPF do usuário (somente números ou com máscara)',
    example: '12345678900',
  })
  @IsNotEmpty()
  @IsString()
  @MinLength(11)
  @MaxLength(14)
  cpf: string;

  @ApiProperty({
    description:
      'Senha do usuário (mínimo 8 caracteres, deve conter maiúscula, minúscula, número e caractere especial)',
    example: 'Senha123!',
  })
  @IsNotEmpty()
  @IsString()
  @MinLength(8)
  @MaxLength(64)
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).+$/, {
    message: 'Password must contain uppercase, lowercase, number and special character',
  })
  password: string;

  @ApiProperty({
    description: 'Perfil de acesso do usuário na aplicação',
    example: AppProfile.CLIENT,
    enum: AppProfile,
  })
  @IsEnum(AppProfile)
  app_profile: AppProfile;
}
