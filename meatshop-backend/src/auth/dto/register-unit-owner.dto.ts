import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString, Matches, MaxLength, MinLength } from 'class-validator';

export class RegisterUnitOwnerDto {
  @ApiProperty({ description: 'Nome completo do dono da unidade', example: 'João da Silva' })
  @IsNotEmpty()
  @IsString()
  @MaxLength(100)
  name: string;

  @ApiProperty({
    description: 'Endereço de e-mail do dono da unidade',
    example: 'dono@meatshop.com',
  })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({
    description: 'CPF do dono da unidade (somente números ou com máscara)',
    example: '12345678900',
  })
  @IsNotEmpty()
  @IsString()
  @MinLength(11)
  @MaxLength(14)
  cpf: string;

  @ApiProperty({
    description:
      'Senha (mínimo 8 caracteres, deve conter maiúscula, minúscula, número e caractere especial)',
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
}
