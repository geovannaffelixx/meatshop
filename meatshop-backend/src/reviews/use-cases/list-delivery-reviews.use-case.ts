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

  async execute(deliveryPersonId: number): Promise<DeliveryReview[]> {
    return this.deliveryReviewRepository.find({
      where: { delivery_person_id: deliveryPersonId },
      order: { created_at: 'DESC' },
    });
  }
}
