import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { Order } from '../../orders/entities/order.entity';
import { User } from '../../users/entities/user.entity';
import { CreateReviewDto } from '../dtos/create-review.dto';
import { Review } from '../entities/review.entity';
import { ReviewEligibilityService } from '../services/review-eligibility.service';

@Injectable()
export class CreateUnitReviewUseCase {
  constructor(
    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,
    @InjectRepository(Review)
    private readonly reviewRepository: Repository<Review>,
    private readonly reviewEligibilityService: ReviewEligibilityService,
  ) {}

  async execute(orderId: number, dto: CreateReviewDto, currentUser: User): Promise<Review> {
    const order = await this.orderRepository.findOne({ where: { id: orderId } });
    if (!order) {
      throw new NotFoundException('Order not found');
    }

    this.reviewEligibilityService.assertCanReview(order, currentUser);
    await this.ensureNotAlreadyReviewed(orderId);

    const review = this.reviewRepository.create({
      order_id: orderId,
      client_id: currentUser.id,
      unit_id: order.unit_id,
      product_id: null,
      rating: dto.rating,
      comment: dto.comment ?? null,
    });

    return this.reviewRepository.save(review);
  }

  private async ensureNotAlreadyReviewed(orderId: number): Promise<void> {
    const existing = await this.reviewRepository.findOne({
      where: { order_id: orderId, product_id: IsNull() },
    });
    if (existing) {
      throw new ConflictException('This order has already been reviewed');
    }
  }
}
