import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DeliveryPerson } from '../../delivery/entities/delivery-person.entity';
import { Order } from '../../orders/entities/order.entity';
import { User } from '../../users/entities/user.entity';
import { CreateDeliveryReviewDto } from '../dtos/create-delivery-review.dto';
import { DeliveryReview } from '../entities/delivery-review.entity';
import { ReviewEligibilityService } from '../services/review-eligibility.service';

@Injectable()
export class CreateDeliveryReviewUseCase {
  constructor(
    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,
    @InjectRepository(DeliveryReview)
    private readonly deliveryReviewRepository: Repository<DeliveryReview>,
    @InjectRepository(DeliveryPerson)
    private readonly deliveryPersonRepository: Repository<DeliveryPerson>,
    private readonly reviewEligibilityService: ReviewEligibilityService,
  ) {}

  async execute(
    orderId: number,
    dto: CreateDeliveryReviewDto,
    currentUser: User,
  ): Promise<DeliveryReview> {
    const order = await this.orderRepository.findOne({ where: { id: orderId } });
    if (!order) {
      throw new NotFoundException('Order not found');
    }

    this.reviewEligibilityService.assertCanReview(order, currentUser);

    if (!order.delivery_person_id) {
      throw new BadRequestException('This order has no delivery person to review');
    }

    await this.ensureNotAlreadyReviewed(orderId);

    const review = this.deliveryReviewRepository.create({
      order_id: orderId,
      client_id: currentUser.id,
      delivery_person_id: order.delivery_person_id,
      rating: dto.rating,
      comment: dto.comment ?? null,
    });
    await this.deliveryReviewRepository.save(review);

    await this.recalculateAverageRating(order.delivery_person_id);

    return review;
  }

  private async ensureNotAlreadyReviewed(orderId: number): Promise<void> {
    const existing = await this.deliveryReviewRepository.findOne({
      where: { order_id: orderId },
    });
    if (existing) {
      throw new ConflictException('This order has already been reviewed');
    }
  }

  private async recalculateAverageRating(deliveryPersonId: number): Promise<void> {
    const result = await this.deliveryReviewRepository
      .createQueryBuilder('review')
      .select('AVG(review.rating)', 'average')
      .where('review.delivery_person_id = :id', { id: deliveryPersonId })
      .getRawOne<{ average: string }>();

    await this.deliveryPersonRepository.update(
      { id: deliveryPersonId },
      { average_rating: Number(result?.average ?? 0) },
    );
  }
}
