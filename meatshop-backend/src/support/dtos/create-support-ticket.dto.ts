import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class CreateSupportTicketDto {
  @ApiProperty({ description: 'Assunto do chamado', example: 'Pedido não chegou' })
  @IsNotEmpty()
  @IsString()
  @MaxLength(150)
  subject: string;

  @ApiProperty({
    description: 'Descrição detalhada do problema ou dúvida',
    example: 'Meu pedido #123 está atrasado há 2 horas e não recebi nenhuma atualização.',
  })
  @IsNotEmpty()
  @IsString()
  @MaxLength(2000)
  description: string;
}
