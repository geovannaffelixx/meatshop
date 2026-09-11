import { Body, Controller, Get, Param, ParseIntPipe, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Public } from '../common/decorators/public.decorator';
import { User } from '../users/entities/user.entity';
import { CreateDeliveryReviewDto } from './dtos/create-delivery-review.dto';
import { CreateReviewDto } from './dtos/create-review.dto';
import { FilterReviewsDto } from './dtos/filter-reviews.dto';
import { CreateDeliveryReviewUseCase } from './use-cases/create-delivery-review.use-case';
import { CreateProductReviewUseCase } from './use-cases/create-product-review.use-case';
import { CreateUnitReviewUseCase } from './use-cases/create-unit-review.use-case';
import { GetReviewUseCase } from './use-cases/get-review.use-case';
import { ListDeliveryReviewsUseCase } from './use-cases/list-delivery-reviews.use-case';
import { ListReviewsUseCase } from './use-cases/list-reviews.use-case';
import { GetOrderReviewStatusUseCase } from './use-cases/get-order-review-status.use-case';

@ApiTags('Reviews')
@Controller()
export class ReviewsController {
  constructor(
    private readonly createUnitReviewUseCase: CreateUnitReviewUseCase,
    private readonly createProductReviewUseCase: CreateProductReviewUseCase,
    private readonly createDeliveryReviewUseCase: CreateDeliveryReviewUseCase,
    private readonly listReviewsUseCase: ListReviewsUseCase,
    private readonly getReviewUseCase: GetReviewUseCase,
    private readonly listDeliveryReviewsUseCase: ListDeliveryReviewsUseCase,
    private readonly getOrderReviewStatusUseCase: GetOrderReviewStatusUseCase,
  ) {}

  @ApiBearerAuth('access-token')
  @ApiOperation({
    summary: 'Returns reviews already submitted by the customer for the order',
  })
  @Get('orders/:orderId/reviews/status')
  getOrderReviewStatus(
    @Param('orderId', ParseIntPipe) orderId: number,
    @CurrentUser() currentUser: User,
  ) {
    return this.getOrderReviewStatusUseCase.execute(orderId, currentUser);
  }

  @Public()
  @ApiOperation({
    summary: 'Lists unit or product reviews with optional filters',
  })
  @ApiResponse({
    status: 200,
    description: 'Review list returned successfully',
  })
  @Get('reviews')
  list(@Query() filters: FilterReviewsDto) {
    return this.listReviewsUseCase.execute(filters);
  }

  @Public()
  @ApiOperation({
    summary: 'Gets a unit or product review by identifier',
  })
  @ApiResponse({ status: 200, description: 'Review found successfully' })
  @ApiResponse({ status: 404, description: 'Review not found' })
  @Get('reviews/:id')
  getOne(@Param('id', ParseIntPipe) id: number) {
    return this.getReviewUseCase.execute(id);
  }

  @ApiBearerAuth('access-token')
  @ApiOperation({
    summary: 'Reviews the butcher shop unit responsible for the order',
  })
  @ApiResponse({ status: 201, description: 'Review submitted successfully' })
  @ApiResponse({ status: 400, description: 'Order has not been delivered yet' })
  @ApiResponse({ status: 404, description: 'Order not found' })
  @ApiResponse({ status: 409, description: 'Order has already been reviewed' })
  @Post('orders/:orderId/reviews/unit')
  reviewUnit(
    @Param('orderId', ParseIntPipe) orderId: number,
    @Body() dto: CreateReviewDto,
    @CurrentUser() currentUser: User,
  ) {
    return this.createUnitReviewUseCase.execute(orderId, dto, currentUser);
  }

  @ApiBearerAuth('access-token')
  @ApiOperation({
    summary: 'Reviews a specific product purchased in the order',
  })
  @ApiResponse({ status: 201, description: 'Review submitted successfully' })
  @ApiResponse({
    status: 400,
    description: 'Order has not been delivered yet or the product does not belong to the order',
  })
  @ApiResponse({ status: 404, description: 'Order not found' })
  @ApiResponse({
    status: 409,
    description: 'Product has already been reviewed for this order',
  })
  @Post('orders/:orderId/reviews/products/:productId')
  reviewProduct(
    @Param('orderId', ParseIntPipe) orderId: number,
    @Param('productId', ParseIntPipe) productId: number,
    @Body() dto: CreateReviewDto,
    @CurrentUser() currentUser: User,
  ) {
    return this.createProductReviewUseCase.execute(orderId, productId, dto, currentUser);
  }

  @ApiBearerAuth('access-token')
  @ApiOperation({
    summary: 'Reviews the delivery person responsible for the order',
  })
  @ApiResponse({ status: 201, description: 'Review submitted successfully' })
  @ApiResponse({
    status: 400,
    description: 'Order has not been delivered yet ou did not have a delivery person',
  })
  @ApiResponse({ status: 404, description: 'Order not found' })
  @ApiResponse({ status: 409, description: 'Order has already been reviewed' })
  @Post('orders/:orderId/delivery-review')
  reviewDelivery(
    @Param('orderId', ParseIntPipe) orderId: number,
    @Body() dto: CreateDeliveryReviewDto,
    @CurrentUser() currentUser: User,
  ) {
    return this.createDeliveryReviewUseCase.execute(orderId, dto, currentUser);
  }

  @Public()
  @ApiOperation({ summary: 'Lists reviews received by a delivery person' })
  @ApiResponse({
    status: 200,
    description: 'Review list returned successfully',
  })
  @Get('delivery-persons/:deliveryPersonId/reviews')
  listDeliveryReviews(@Param('deliveryPersonId', ParseIntPipe) deliveryPersonId: number) {
    return this.listDeliveryReviewsUseCase.execute(deliveryPersonId);
  }
}
