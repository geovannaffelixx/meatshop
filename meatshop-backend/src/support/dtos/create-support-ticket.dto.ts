import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsNotEmpty, IsOptional, IsString, MaxLength, Min } from 'class-validator';
import { SupportTicketCategory } from '../enums/support-ticket-category.enum';
import { SupportTicketPriority } from '../enums/support-ticket-priority.enum';

export class CreateSupportTicketDto {
  @ApiProperty({
    enum: SupportTicketCategory,
    example: SupportTicketCategory.TECHNICAL,
  })
  @IsEnum(SupportTicketCategory)
  category: SupportTicketCategory;

  @ApiPropertyOptional({
    enum: SupportTicketPriority,
    default: SupportTicketPriority.NORMAL,
  })
  @IsOptional()
  @IsEnum(SupportTicketPriority)
  priority?: SupportTicketPriority;

  @ApiPropertyOptional({ description: 'Unit related to the support ticket' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  unit_id?: number;

  @ApiPropertyOptional({ description: 'Order related to the support ticket' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  order_id?: number;

  @ApiProperty({
    description: 'Support ticket subject',
    example: 'Order did not arrive',
  })
  @IsNotEmpty()
  @IsString()
  @MaxLength(150)
  subject: string;

  @ApiProperty({
    description: 'Detailed description of the problem or question',
    example: 'My order #123 is two hours late and I have not received an update.',
  })
  @IsNotEmpty()
  @IsString()
  @MaxLength(2000)
  description: string;
}
