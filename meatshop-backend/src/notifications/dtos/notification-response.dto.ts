import { ApiProperty } from '@nestjs/swagger';
import { Notification } from '../entities/notification.entity';
import { NotificationType } from '../enums/notification-type.enum';

export class NotificationResponseDto {
  @ApiProperty({ description: 'Notification ID', example: 1 })
  id: number;

  @ApiProperty({ description: 'Notification title', example: 'New order' })
  title: string;

  @ApiProperty({
    description: 'Notification text',
    example: 'Your order #42 was confirmed',
  })
  message: string;

  @ApiProperty({ nullable: true, description: 'Related unit' })
  unit_id: number | null;

  @ApiProperty({ nullable: true, description: 'Rota interna relacionada' })
  action_url: string | null;

  @ApiProperty({
    description: 'Notification type',
    enum: NotificationType,
    example: NotificationType.ORDER,
  })
  type: NotificationType;

  @ApiProperty({
    description: 'Indicates whether the notification has been read',
    example: false,
  })
  read: boolean;

  @ApiProperty({
    description: 'Creation date',
    example: '2026-08-18T12:00:00.000Z',
  })
  created_at: Date;

  static fromEntity(entity: Notification): NotificationResponseDto {
    const dto = new NotificationResponseDto();
    dto.id = entity.id;
    dto.title = entity.title;
    dto.message = entity.message;
    dto.unit_id = entity.unit_id;
    dto.action_url = entity.action_url;
    dto.type = entity.type;
    dto.read = entity.read;
    dto.created_at = entity.created_at;
    return dto;
  }

  static fromEntities(entities: Notification[]): NotificationResponseDto[] {
    return entities.map((entity) => NotificationResponseDto.fromEntity(entity));
  }
}
