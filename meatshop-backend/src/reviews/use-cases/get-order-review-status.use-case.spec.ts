import { NotFoundException } from '@nestjs/common';
import { describe, expect, it, jest } from '@jest/globals';
import type { Repository } from 'typeorm';
import type { Order } from '../../orders/entities/order.entity';
import type { User } from '../../users/entities/user.entity';
import type { DeliveryReview } from '../entities/delivery-review.entity';
import type { Review } from '../entities/review.entity';
import { GetOrderReviewStatusUseCase } from './get-order-review-status.use-case';

describe('GetOrderReviewStatusUseCase', () => {
  const orders = { findOne: jest.fn() } as unknown as Repository<Order>;
  const reviews = { find: jest.fn() } as unknown as Repository<Review>;
  const deliveryReviews = {
    findOne: jest.fn(),
  } as unknown as Repository<DeliveryReview>;
  const useCase = new GetOrderReviewStatusUseCase(orders, reviews, deliveryReviews);
  const user = { id: 9 } as User;

  it('returns the review state only for an order owned by the current client', async () => {
    jest.mocked(orders.findOne).mockResolvedValue({ id: 20 } as Order);
    jest
      .mocked(reviews.find)
      .mockResolvedValue([
        { product_id: null },
        { product_id: 31 },
        { product_id: 32 },
      ] as Review[]);
    jest.mocked(deliveryReviews.findOne).mockResolvedValue({ id: 4 } as DeliveryReview);

    await expect(useCase.execute(20, user)).resolves.toEqual({
      unit_reviewed: true,
      delivery_reviewed: true,
      reviewed_product_ids: [31, 32],
    });
    expect(orders.findOne).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 20, client_id: 9 } }),
    );
  });

  it('does not reveal review status for another client order', async () => {
    jest.mocked(orders.findOne).mockResolvedValue(null);
    await expect(useCase.execute(20, user)).rejects.toBeInstanceOf(NotFoundException);
  });
});
