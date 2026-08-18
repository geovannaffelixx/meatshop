import { ApiProperty } from '@nestjs/swagger';
import { Notification } from '../entities/notification.entity';
import { NotificationType } from '../enums/notification-type.enum';

export class NotificationResponseDto {
  @ApiProperty({ description: 'Id da notificação', example: 1 })
  id: number;

  @ApiProperty({ description: 'Texto da notificação', example: 'Seu pedido #42 foi confirmado' })
  message: string;

  @ApiProperty({
    description: 'Tipo da notificação',
    enum: NotificationType,
    example: NotificationType.ORDER,
  })
  type: NotificationType;

  @ApiProperty({ description: 'Indica se a notificação já foi lida', example: false })
  read: boolean;

  @ApiProperty({ description: 'Data de criação', example: '2026-08-18T12:00:00.000Z' })
  created_at: Date;

  static fromEntity(entity: Notification): NotificationResponseDto {
    const dto = new NotificationResponseDto();
    dto.id = entity.id;
    dto.message = entity.message;
    dto.type = entity.type;
    dto.read = entity.read;
    dto.created_at = entity.created_at;
    return dto;
  }

  static fromEntities(entities: Notification[]): NotificationResponseDto[] {
    return entities.map((entity) => NotificationResponseDto.fromEntity(entity));
  }
}
