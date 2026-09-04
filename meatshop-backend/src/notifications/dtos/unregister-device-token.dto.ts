import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class UnregisterDeviceTokenDto {
  @ApiProperty({ description: 'Token FCM que deve ser desvinculado deste usuário' })
  @IsNotEmpty()
  @IsString()
  @MaxLength(300)
  fcm_token: string;
}
