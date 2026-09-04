import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class RefreshTokenDto {
  @ApiProperty({
    description:
      'Token de atualização (refresh token) emitido no login. Opcional quando enviado via cookie HttpOnly.',
    example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    required: false,
  })
  @IsOptional()
  @IsString()
  refresh_token?: string;
}
