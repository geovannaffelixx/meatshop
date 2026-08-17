import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Order } from '../../orders/entities/order.entity';
import { OrderItem } from '../../orders/entities/order-item.entity';
import { User } from '../../users/entities/user.entity';
import { CreateReviewDto } from '../dtos/create-review.dto';
import { Review } from '../entities/review.entity';
import { ReviewEligibilityService } from '../services/review-eligibility.service';

@Injectable()
export class CreateProductReviewUseCase {
  constructor(
    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,
    @InjectRepository(OrderItem)
    private readonly orderItemRepository: Repository<OrderItem>,
    @InjectRepository(Review)
    private readonly reviewRepository: Repository<Review>,
    private readonly reviewEligibilityService: ReviewEligibilityService,
  ) {}

  async execute(
    orderId: number,
    productId: number,
    dto: CreateReviewDto,
    currentUser: User,
  ): Promise<Review> {
    const order = await this.orderRepository.findOne({ where: { id: orderId } });
    if (!order) {
      throw new NotFoundException('Order not found');
    }

    this.reviewEligibilityService.assertCanReview(order, currentUser);
    await this.assertProductWasOrdered(orderId, productId);
    await this.ensureNotAlreadyReviewed(orderId, productId);

    const review = this.reviewRepository.create({
      order_id: orderId,
      client_id: currentUser.id,
      unit_id: order.unit_id,
      product_id: productId,
      rating: dto.rating,
      comment: dto.comment ?? null,
    });

    return this.reviewRepository.save(review);
  }

  private async assertProductWasOrdered(orderId: number, productId: number): Promise<void> {
    const item = await this.orderItemRepository.findOne({
      where: { order_id: orderId, product_id: productId },
    });
    if (!item) {
      throw new BadRequestException('This product was not part of the order');
    }
  }

  private async ensureNotAlreadyReviewed(orderId: number, productId: number): Promise<void> {
    const existing = await this.reviewRepository.findOne({
      where: { order_id: orderId, product_id: productId },
    });
    if (existing) {
      throw new ConflictException('This product has already been reviewed for this order');
    }
  }
}
