import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { ChatParticipantType } from '../enums/chat-participant-type.enum';

export class SendMessageDto {
  @ApiProperty({
    description:
      'Conversation channel: customer and unit (UNIT), customer and delivery person (DELIVERY_PERSON), or unit and delivery person (UNIT_DELIVERY_PERSON)',
    enum: ChatParticipantType,
    example: ChatParticipantType.UNIT,
  })
  @IsEnum(ChatParticipantType)
  participant_type: ChatParticipantType;

  @ApiProperty({
    description: 'Message text',
    example: 'Is my order out for delivery?',
  })
  @IsNotEmpty()
  @IsString()
  @MaxLength(2000)
  message: string;
}
