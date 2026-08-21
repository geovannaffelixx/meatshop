import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class VerifyEmailDto {
  @ApiProperty({
    description: 'Token de verificação de e-mail enviado ao usuário',
    example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  })
  @IsNotEmpty()
  @IsString()
  token: string;
}