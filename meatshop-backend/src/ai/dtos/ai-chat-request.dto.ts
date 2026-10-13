import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export class AiChatRequestDto {
  @ApiProperty({ example: 'Como preparar picanha para quatro pessoas?' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(1000)
  message: string;

  @ApiPropertyOptional({
    description: 'Identificador opaco da conversa anterior pertencente ao usuário autenticado',
    format: 'uuid',
  })
  @IsOptional()
  @IsUUID('4')
  conversation_id?: string;
}
