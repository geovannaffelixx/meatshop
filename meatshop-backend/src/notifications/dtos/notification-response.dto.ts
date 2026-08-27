import { ApiProperty } from '@nestjs/swagger';
import { Notification } from '../entities/notification.entity';
import { NotificationType } from '../enums/notification-type.enum';

export class NotificationResponseDto {
  @ApiProperty({ description: 'Id da notificação', example: 1 })
  id: number;

  @ApiProperty({ description: 'Título da notificação', example: 'Novo pedido' })
  title: string;

  @ApiProperty({ description: 'Texto da notificação', example: 'Seu pedido #42 foi confirmado' })
  message: string;

  @ApiProperty({ nullable: true, description: 'Unidade relacionada' })
  unit_id: number | null;

  @ApiProperty({ nullable: true, description: 'Rota interna relacionada' })
  action_url: string | null;

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
