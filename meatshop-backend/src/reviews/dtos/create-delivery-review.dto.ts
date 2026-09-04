import { ApiPropertyOptional, ApiProperty } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

export class CreateDeliveryReviewDto {
  @ApiProperty({
    description: 'Nota da avaliação do entregador, de 1 a 5',
    example: 5,
    minimum: 1,
    maximum: 5,
  })
  @IsInt()
  @Min(1)
  @Max(5)
  rating: number;

  @ApiPropertyOptional({
    description: 'Comentário sobre a entrega',
    example: 'Entregador muito educado e pontual',
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  comment?: string;
}
