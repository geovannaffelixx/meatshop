import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString } from 'class-validator';

export class LoginDto {
  @ApiProperty({
    description: 'Endereço de e-mail do usuário',
    example: 'cliente@meatshop.com',
  })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({
    description: 'Senha do usuário',
    example: 'Senha123!',
  })
  @IsNotEmpty()
  @IsString()
  password: string;
}