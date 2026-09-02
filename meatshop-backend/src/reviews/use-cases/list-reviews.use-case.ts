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

  async execute(
    filters: FilterReviewsDto,
  ): Promise<ReviewListItemDto[] | { data: ReviewListItemDto[]; meta: Record<string, number> }> {
    const where: Record<string, unknown> = {};
    if (filters.unit_id) where.unit_id = filters.unit_id;
    if (filters.product_id) where.product_id = filters.product_id;

    const options = {
      where,
      relations: { client: true, product: true },
      order: { created_at: 'DESC' },
      ...(filters.marketplace === 'true'
        ? { skip: (filters.page - 1) * filters.limit, take: filters.limit }
        : {}),
    } as const;
    if (filters.marketplace === 'true') {
      const [reviews, total] = await this.reviewRepository.findAndCount(options);
      return {
        data: reviews.map(ReviewListItemDto.fromEntity),
        meta: {
          page: filters.page,
          limit: filters.limit,
          total,
          totalPages: Math.max(Math.ceil(total / filters.limit), 1),
        },
      };
    }
    const reviews = await this.reviewRepository.find(options);

    return reviews.map(ReviewListItemDto.fromEntity);
  }
}
