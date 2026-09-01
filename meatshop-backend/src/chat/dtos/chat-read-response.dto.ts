import { ApiProperty } from '@nestjs/swagger';
import { ChatParticipantType } from '../enums/chat-participant-type.enum';

export class ChatReadResponseDto {
  @ApiProperty({ example: 42 })
  order_id: number;

  @ApiProperty({ enum: ChatParticipantType })
  participant_type: ChatParticipantType;

  @ApiProperty({ example: 2 })
  reader_id: number;

  @ApiProperty({ example: 3 })
  updated_count: number;

  @ApiProperty({ example: '2026-08-20T12:01:00.000Z' })
  read_at: Date;
}
