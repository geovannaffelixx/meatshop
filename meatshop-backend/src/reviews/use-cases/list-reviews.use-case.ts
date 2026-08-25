import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FilterReviewsDto } from '../dtos/filter-reviews.dto';
import { ReviewListItemDto } from '../dtos/review-list-item.dto';
import { Review } from '../entities/review.entity';

@Injectable()
export class ListReviewsUseCase {
  constructor(
    @InjectRepository(Review)
    private readonly reviewRepository: Repository<Review>,
  ) {}

  async execute(filters: FilterReviewsDto): Promise<ReviewListItemDto[]> {
    const where: Record<string, unknown> = {};
    if (filters.unit_id) where.unit_id = filters.unit_id;
    if (filters.product_id) where.product_id = filters.product_id;

    const reviews = await this.reviewRepository.find({
      where,
      relations: { client: true, product: true },
      order: { created_at: 'DESC' },
    });

    return reviews.map(ReviewListItemDto.fromEntity);
  }
}
