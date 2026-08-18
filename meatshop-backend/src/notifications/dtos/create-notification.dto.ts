import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsInt, IsNotEmpty, IsString } from 'class-validator';
import { NotificationType } from '../enums/notification-type.enum';

export class CreateNotificationDto {
  @ApiProperty({ description: 'Id do usuário que receberá a notificação', example: 5 })
  @IsInt()
  user_id: number;

  @ApiProperty({
    description: 'Texto da notificação',
    example: 'Nova promoção disponível na sua unidade favorita!',
  })
  @IsNotEmpty()
  @IsString()
  message: string;

  @ApiProperty({
    description: 'Tipo da notificação',
    enum: NotificationType,
    example: NotificationType.SYSTEM,
  })
  @IsEnum(NotificationType)
  type: NotificationType;
}
