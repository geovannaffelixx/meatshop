import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Review } from '../entities/review.entity';

export class ReviewListItemDto {
  @ApiProperty({ description: 'Review identifier', example: 1 })
  id: number;

  @ApiProperty({ description: 'Order identifier avaliado', example: 10 })
  order_id: number;

  @ApiProperty({ description: 'Unit identifier avaliada', example: 1 })
  unit_id: number;

  @ApiProperty({
    description: 'Name of the customer who submitted the review',
    example: 'John Smith',
  })
  client_name: string;

  @ApiPropertyOptional({
    description: 'Reviewed product identifier. Null when the review is for the unit',
    example: 42,
    nullable: true,
  })
  product_id: number | null;

  @ApiPropertyOptional({
    description: 'Reviewed product name. Null when the review is for the unit',
    example: 'Picanha',
    nullable: true,
  })
  product_name: string | null;

  @ApiProperty({ description: 'Review rating from 1 to 5', example: 5 })
  rating: number;

  @ApiPropertyOptional({ description: 'Review comment', nullable: true })
  comment: string | null;

  @ApiProperty({ description: 'Review date' })
  created_at: Date;

  static fromEntity(review: Review): ReviewListItemDto {
    const dto = new ReviewListItemDto();
    dto.id = review.id;
    dto.order_id = review.order_id;
    dto.unit_id = review.unit_id;
    dto.client_name = review.client?.name ?? 'Customer';
    dto.product_id = review.product_id;
    dto.product_name = review.product?.name ?? null;
    dto.rating = review.rating;
    dto.comment = review.comment;
    dto.created_at = review.created_at;
    return dto;
  }
}
