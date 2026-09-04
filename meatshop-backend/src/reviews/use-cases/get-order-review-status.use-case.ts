import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Order } from '../../orders/entities/order.entity';
import { User } from '../../users/entities/user.entity';
import { DeliveryReview } from '../entities/delivery-review.entity';
import { Review } from '../entities/review.entity';

export interface IOrderReviewStatus {
  unit_reviewed: boolean;
  delivery_reviewed: boolean;
  reviewed_product_ids: number[];
}

@Injectable()
export class GetOrderReviewStatusUseCase {
  constructor(
    @InjectRepository(Order) private readonly orders: Repository<Order>,
    @InjectRepository(Review) private readonly reviews: Repository<Review>,
    @InjectRepository(DeliveryReview)
    private readonly deliveryReviews: Repository<DeliveryReview>,
  ) {}

  async execute(orderId: number, currentUser: User): Promise<IOrderReviewStatus> {
    const order = await this.orders.findOne({
      where: { id: orderId, client_id: currentUser.id },
      select: { id: true },
    });
    if (!order) throw new NotFoundException('Order not found');

    const [reviews, deliveryReview] = await Promise.all([
      this.reviews.find({
        where: { order_id: orderId, client_id: currentUser.id },
        select: { product_id: true },
      }),
      this.deliveryReviews.findOne({
        where: { order_id: orderId, client_id: currentUser.id },
        select: { id: true },
      }),
    ]);

    return {
      unit_reviewed: reviews.some((review) => review.product_id === null),
      delivery_reviewed: deliveryReview !== null,
      reviewed_product_ids: reviews
        .map((review) => review.product_id)
        .filter((id): id is number => id !== null),
    };
  }
}
