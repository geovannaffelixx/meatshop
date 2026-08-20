import { IsEnum, IsInt } from 'class-validator';
import { ChatParticipantType } from '../enums/chat-participant-type.enum';

export class JoinChatRoomDto {
  @IsInt()
  order_id: number;

  @IsEnum(ChatParticipantType)
  participant_type: ChatParticipantType;
}
