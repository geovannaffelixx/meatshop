import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class UnregisterDeviceTokenDto {
  @ApiProperty({ description: 'FCM token to unlink from this user' })
  @IsNotEmpty()
  @IsString()
  @MaxLength(300)
  fcm_token: string;
}
