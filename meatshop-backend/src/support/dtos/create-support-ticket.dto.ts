import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsNotEmpty, IsOptional, IsString, MaxLength, Min } from 'class-validator';
import { SupportTicketCategory } from '../enums/support-ticket-category.enum';
import { SupportTicketPriority } from '../enums/support-ticket-priority.enum';

export class CreateSupportTicketDto {
  @ApiProperty({ enum: SupportTicketCategory, example: SupportTicketCategory.TECHNICAL })
  @IsEnum(SupportTicketCategory)
  category: SupportTicketCategory;

  @ApiPropertyOptional({ enum: SupportTicketPriority, default: SupportTicketPriority.NORMAL })
  @IsOptional()
  @IsEnum(SupportTicketPriority)
  priority?: SupportTicketPriority;

  @ApiPropertyOptional({ description: 'Unidade relacionada ao chamado' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  unit_id?: number;

  @ApiPropertyOptional({ description: 'Pedido relacionado ao chamado' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  order_id?: number;

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
