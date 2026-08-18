import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class AnswerSupportTicketDto {
  @ApiProperty({
    description: 'Resposta da equipe de suporte para o chamado',
    example: 'Identificamos o atraso e seu pedido já está a caminho, chegará em até 20 minutos.',
  })
  @IsNotEmpty()
  @IsString()
  @MaxLength(2000)
  response: string;
}
