import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { ChatParticipantType } from '../enums/chat-participant-type.enum';

export class SendMessageDto {
  @ApiProperty({
    description:
      'Canal da conversa: cliente com a unidade (UNIT), cliente com o entregador (DELIVERY_PERSON) ou unidade com o entregador (UNIT_DELIVERY_PERSON)',
    enum: ChatParticipantType,
    example: ChatParticipantType.UNIT,
  })
  @IsEnum(ChatParticipantType)
  participant_type: ChatParticipantType;

  @ApiProperty({ description: 'Texto da mensagem', example: 'Meu pedido já saiu para entrega?' })
  @IsNotEmpty()
  @IsString()
  @MaxLength(2000)
  message: string;
}
