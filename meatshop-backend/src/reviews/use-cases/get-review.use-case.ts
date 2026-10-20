import { ReviewListItemDto } from '../dtos/review-list-item.dto';
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Review } from '../entities/review.entity';

@Injectable()
export class GetReviewUseCase {
  constructor(
    @InjectRepository(Review)
    private readonly reviewRepository: Repository<Review>,
  ) {}

  async execute(reviewId: number): Promise<ReviewListItemDto> {
    const review = await this.reviewRepository.findOne({
      where: { id: reviewId },
      relations: { client: true, product: true },
    });
    if (!review) {
      throw new NotFoundException('Review not found');
    }
    return ReviewListItemDto.fromEntity(review);
  }
}
