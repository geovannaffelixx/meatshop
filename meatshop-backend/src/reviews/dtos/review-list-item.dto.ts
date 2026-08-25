import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Review } from '../entities/review.entity';

export class ReviewListItemDto {
  @ApiProperty({ description: 'Identificador da avaliação', example: 1 })
  id: number;

  @ApiProperty({ description: 'Identificador do pedido avaliado', example: 10 })
  order_id: number;

  @ApiProperty({ description: 'Identificador da unidade avaliada', example: 1 })
  unit_id: number;

  @ApiProperty({ description: 'Nome do cliente que avaliou', example: 'João da Silva' })
  client_name: string;

  @ApiPropertyOptional({
    description: 'Identificador do produto avaliado. Nulo quando a avaliação é sobre a unidade',
    example: 42,
    nullable: true,
  })
  product_id: number | null;

  @ApiPropertyOptional({
    description: 'Nome do produto avaliado. Nulo quando a avaliação é sobre a unidade',
    example: 'Picanha',
    nullable: true,
  })
  product_name: string | null;

  @ApiProperty({ description: 'Nota da avaliação, de 1 a 5', example: 5 })
  rating: number;

  @ApiPropertyOptional({ description: 'Comentário da avaliação', nullable: true })
  comment: string | null;

  @ApiProperty({ description: 'Data da avaliação' })
  created_at: Date;

  static fromEntity(review: Review): ReviewListItemDto {
    const dto = new ReviewListItemDto();
    dto.id = review.id;
    dto.order_id = review.order_id;
    dto.unit_id = review.unit_id;
    dto.client_name = review.client?.name ?? 'Cliente';
    dto.product_id = review.product_id;
    dto.product_name = review.product?.name ?? null;
    dto.rating = review.rating;
    dto.comment = review.comment;
    dto.created_at = review.created_at;
    return dto;
  }
}
