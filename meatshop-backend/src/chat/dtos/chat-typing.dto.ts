import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean } from 'class-validator';
import { JoinChatRoomDto } from './join-chat-room.dto';

export class ChatTypingDto extends JoinChatRoomDto {
  @ApiProperty({
    description: 'Indicates whether the participant is typing',
    example: true,
  })
  @IsBoolean()
  typing: boolean;
}
