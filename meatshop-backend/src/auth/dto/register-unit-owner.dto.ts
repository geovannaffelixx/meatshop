import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString, Matches, MaxLength, MinLength } from 'class-validator';

export class RegisterUnitOwnerDto {
  @ApiProperty({ description: 'Unit owner full name', example: 'John Smith' })
  @IsNotEmpty()
  @IsString()
  @MaxLength(100)
  name: string;

  @ApiProperty({
    description: 'Unit owner email address',
    example: 'owner@meatshop.com',
  })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({
    description: 'Unit owner CPF (digits only or formatted)',
    example: '12345678900',
  })
  @IsNotEmpty()
  @IsString()
  @MinLength(11)
  @MaxLength(14)
  cpf: string;

  @ApiProperty({
    description:
      'Password (minimum 8 characters, including uppercase, lowercase, number, and special character)',
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
