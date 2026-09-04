import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty } from 'class-validator';

export class ForgotPasswordDto {
  @ApiProperty({
    description:
      'Endereço de e-mail do usuário para o qual o link de redefinição de senha será enviado',
    example: 'cliente@meatshop.com',
  })
  @IsEmail()
  @IsNotEmpty()
  email: string;
}
