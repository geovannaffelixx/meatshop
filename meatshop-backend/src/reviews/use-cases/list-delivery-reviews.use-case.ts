import { firstName } from '../../common/utils/first-name';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DeliveryReview } from '../entities/delivery-review.entity';

@Injectable()
export class ListDeliveryReviewsUseCase {
  constructor(
    @InjectRepository(DeliveryReview)
    private readonly deliveryReviewRepository: Repository<DeliveryReview>,
  ) {}

  async execute(deliveryPersonId: number): Promise<
    Array<{
      id: number;
      order_id: number;
      client_id: number;
      delivery_person_id: number;
      client_name: string;
      rating: number;
      comment: string | null;
      created_at: Date;
    }>
  > {
    const reviews = await this.deliveryReviewRepository.find({
      where: { delivery_person_id: deliveryPersonId },
      order: { created_at: 'DESC' },
      relations: { client: true },
    });
    return reviews.map((review) => ({
      id: review.id,
      order_id: review.order_id,
      client_id: review.client_id,
      delivery_person_id: review.delivery_person_id,
      client_name: firstName(review.client?.name),
      rating: review.rating,
      comment: review.comment,
      created_at: review.created_at,
    }));
  }
}
