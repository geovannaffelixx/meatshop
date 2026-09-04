import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class RegisterDeviceTokenDto {
  @ApiProperty({
    description: 'Token FCM (Firebase Cloud Messaging) do navegador/dispositivo do usuário',
    example: 'dQw4w9WgXcQ:APA91bF...',
  })
  @IsNotEmpty()
  @IsString()
  @MaxLength(300)
  fcm_token: string;

  @ApiProperty({
    required: false,
    enum: ['ANDROID', 'IOS', 'WEB'],
    example: 'ANDROID',
  })
  @IsOptional()
  @IsString()
  @IsIn(['ANDROID', 'IOS', 'WEB'])
  platform?: 'ANDROID' | 'IOS' | 'WEB';

  @ApiProperty({ required: false, description: 'Versão pública do aplicativo' })
  @IsOptional()
  @IsString()
  @MaxLength(30)
  app_version?: string;
}
