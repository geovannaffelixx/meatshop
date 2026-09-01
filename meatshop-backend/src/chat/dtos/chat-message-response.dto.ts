import { ApiProperty } from '@nestjs/swagger';
import { Chat } from '../entities/chat.entity';
import { ChatParticipantType } from '../enums/chat-participant-type.enum';

export class ChatMessageResponseDto {
  @ApiProperty({ description: 'Id da mensagem', example: 1 })
  id: number;

  @ApiProperty({ description: 'Id do pedido relacionado', example: 42 })
  order_id: number;

  @ApiProperty({ description: 'Id de quem enviou a mensagem', example: 5 })
  sender_id: number;

  @ApiProperty({ description: 'Id de quem recebe a mensagem', example: 9 })
  receiver_id: number;

  @ApiProperty({
    description: 'Nome de quem enviou a mensagem',
    example: 'João da Silva',
  })
  sender_name: string;

  @ApiProperty({
    description: 'Nome de quem recebe a mensagem',
    example: 'Açougue Central',
  })
  receiver_name: string;

  @ApiProperty({
    description: 'Canal da conversa',
    enum: ChatParticipantType,
    example: ChatParticipantType.UNIT,
  })
  participant_type: ChatParticipantType;

  @ApiProperty({
    description: 'Texto da mensagem',
    example: 'Meu pedido já saiu para entrega?',
  })
  message: string;

  @ApiProperty({
    description: 'Data de envio',
    example: '2026-08-20T12:00:00.000Z',
  })
  sent_at: Date;

  @ApiProperty({
    description: 'Data em que a mensagem foi lida pelo outro lado da conversa',
    nullable: true,
    example: '2026-08-20T12:01:00.000Z',
  })
  read_at: Date | null;

  static fromEntity(entity: Chat): ChatMessageResponseDto {
    const dto = new ChatMessageResponseDto();
    dto.id = entity.id;
    dto.order_id = entity.order_id;
    dto.sender_id = entity.sender_id;
    dto.receiver_id = entity.receiver_id;
    dto.sender_name = entity.sender?.name ?? `Usuário #${entity.sender_id}`;
    dto.receiver_name = entity.receiver?.name ?? `Usuário #${entity.receiver_id}`;
    dto.participant_type = entity.participant_type;
    dto.message = entity.message;
    dto.sent_at = entity.sent_at;
    dto.read_at = entity.read_at;
    return dto;
  }

  static fromEntities(entities: Chat[]): ChatMessageResponseDto[] {
    return entities.map((entity) => ChatMessageResponseDto.fromEntity(entity));
  }
}
