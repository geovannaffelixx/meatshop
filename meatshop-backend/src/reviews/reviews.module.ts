import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OrdersModule } from '../orders/orders.module';
import { DeliveryReview } from './entities/delivery-review.entity';
import { Review } from './entities/review.entity';
import { ReviewsController } from './reviews.controller';
import { ReviewEligibilityService } from './services/review-eligibility.service';
import { CreateDeliveryReviewUseCase } from './use-cases/create-delivery-review.use-case';
import { CreateProductReviewUseCase } from './use-cases/create-product-review.use-case';
import { CreateUnitReviewUseCase } from './use-cases/create-unit-review.use-case';
import { GetReviewUseCase } from './use-cases/get-review.use-case';
import { ListDeliveryReviewsUseCase } from './use-cases/list-delivery-reviews.use-case';
import { ListReviewsUseCase } from './use-cases/list-reviews.use-case';
import { GetOrderReviewStatusUseCase } from './use-cases/get-order-review-status.use-case';

@Module({
  imports: [TypeOrmModule.forFeature([Review, DeliveryReview]), OrdersModule],
  controllers: [ReviewsController],
  providers: [
    ReviewEligibilityService,
    CreateUnitReviewUseCase,
    CreateProductReviewUseCase,
    CreateDeliveryReviewUseCase,
    ListReviewsUseCase,
    GetReviewUseCase,
    ListDeliveryReviewsUseCase,
    GetOrderReviewStatusUseCase,
  ],
})
export class ReviewsModule {}
