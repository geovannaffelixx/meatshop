import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, Max, Min } from 'class-validator';
import { ChatParticipantType } from '../enums/chat-participant-type.enum';

export class ListChatMessagesDto {
  @ApiProperty({
    description: 'Canal da conversa a ser consultado',
    enum: ChatParticipantType,
    example: ChatParticipantType.UNIT,
  })
  @IsEnum(ChatParticipantType)
  participant_type: ChatParticipantType;

  @ApiPropertyOptional({ description: 'Página (1-based)', example: 1, default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ description: 'Itens por página (1 a 100)', example: 50, default: 50 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;
}
