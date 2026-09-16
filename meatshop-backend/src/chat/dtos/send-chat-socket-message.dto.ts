import { IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { JoinChatRoomDto } from './join-chat-room.dto';

export class SendChatSocketMessageDto extends JoinChatRoomDto {
  @IsNotEmpty()
  @IsString()
  @MaxLength(2000)
  message: string;
}
