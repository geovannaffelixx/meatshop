import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class RegisterDeviceTokenDto {
  @ApiProperty({
    description: 'User browser or device FCM token',
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

  @ApiProperty({ required: false, description: 'Public application version' })
  @IsOptional()
  @IsString()
  @MaxLength(30)
  app_version?: string;
}
