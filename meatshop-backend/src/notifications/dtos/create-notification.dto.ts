import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsInt, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';
import { NotificationType } from '../enums/notification-type.enum';

export class CreateNotificationDto {
  @ApiProperty({
    description: 'ID of the user who will receive the notification',
    example: 5,
  })
  @IsInt()
  user_id: number;

  @ApiPropertyOptional({ description: 'Unit related to the event', example: 3 })
  @IsOptional()
  @IsInt()
  unit_id?: number;

  @ApiPropertyOptional({
    description: 'Short title displayed in the alert',
    example: 'New order',
  })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  title?: string;

  @ApiProperty({
    description: 'Notification text',
    example: 'New promotion available at your favorite unit!',
  })
  @IsNotEmpty()
  @IsString()
  message: string;

  @ApiPropertyOptional({
    description: 'Rota interna aberta ao clicar',
    example: '/orders/42',
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  action_url?: string;

  @ApiProperty({
    description: 'Notification type',
    enum: NotificationType,
    example: NotificationType.SYSTEM,
  })
  @IsEnum(NotificationType)
  type: NotificationType;
}
