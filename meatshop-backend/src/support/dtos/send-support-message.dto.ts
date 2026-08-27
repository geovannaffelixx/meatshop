import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class SendSupportMessageDto {
  @ApiPropertyOptional({ description: 'Mensagem enviada no chamado', maxLength: 4000 })
  @IsOptional()
  @IsString()
  @MaxLength(4000)
  message?: string;
}
