import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class UpdateSupportTicketDto {
  @ApiPropertyOptional({ description: 'Assunto atualizado do chamado' })
  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(150)
  subject?: string;
}
