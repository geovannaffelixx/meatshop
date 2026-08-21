import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class RegisterDeviceTokenDto {
  @ApiProperty({
    description: 'Token FCM (Firebase Cloud Messaging) do navegador/dispositivo do usuário',
    example: 'dQw4w9WgXcQ:APA91bF...',
  })
  @IsNotEmpty()
  @IsString()
  fcm_token: string;
}
