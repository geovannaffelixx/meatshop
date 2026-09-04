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
    summary: 'Retorna as avaliações já enviadas pelo cliente para o pedido',
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
    summary: 'Lista avaliações de unidade/produto, opcionalmente filtradas',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de avaliações retornada com sucesso',
  })
  @Get('reviews')
  list(@Query() filters: FilterReviewsDto) {
    return this.listReviewsUseCase.execute(filters);
  }

  @Public()
  @ApiOperation({
    summary: 'Busca uma avaliação de unidade/produto pelo identificador',
  })
  @ApiResponse({ status: 200, description: 'Avaliação encontrada com sucesso' })
  @ApiResponse({ status: 404, description: 'Avaliação não encontrada' })
  @Get('reviews/:id')
  getOne(@Param('id', ParseIntPipe) id: number) {
    return this.getReviewUseCase.execute(id);
  }

  @ApiBearerAuth('access-token')
  @ApiOperation({
    summary: 'Avalia a unidade (açougue) responsável pelo pedido',
  })
  @ApiResponse({ status: 201, description: 'Avaliação registrada com sucesso' })
  @ApiResponse({ status: 400, description: 'Pedido ainda não foi entregue' })
  @ApiResponse({ status: 404, description: 'Pedido não encontrado' })
  @ApiResponse({ status: 409, description: 'Pedido já foi avaliado' })
  @Post('orders/:orderId/reviews/unit')
  reviewUnit(
    @Param('orderId', ParseIntPipe) orderId: number,
    @Body() dto: CreateReviewDto,
    @CurrentUser() currentUser: User,
  ) {
    return this.createUnitReviewUseCase.execute(orderId, dto, currentUser);
  }

  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Avalia um produto específico comprado no pedido' })
  @ApiResponse({ status: 201, description: 'Avaliação registrada com sucesso' })
  @ApiResponse({
    status: 400,
    description: 'Pedido ainda não foi entregue ou o produto não pertence ao pedido',
  })
  @ApiResponse({ status: 404, description: 'Pedido não encontrado' })
  @ApiResponse({
    status: 409,
    description: 'Produto já foi avaliado neste pedido',
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
  @ApiOperation({ summary: 'Avalia o entregador responsável pelo pedido' })
  @ApiResponse({ status: 201, description: 'Avaliação registrada com sucesso' })
  @ApiResponse({
    status: 400,
    description: 'Pedido ainda não foi entregue ou não teve entregador',
  })
  @ApiResponse({ status: 404, description: 'Pedido não encontrado' })
  @ApiResponse({ status: 409, description: 'Pedido já foi avaliado' })
  @Post('orders/:orderId/delivery-review')
  reviewDelivery(
    @Param('orderId', ParseIntPipe) orderId: number,
    @Body() dto: CreateDeliveryReviewDto,
    @CurrentUser() currentUser: User,
  ) {
    return this.createDeliveryReviewUseCase.execute(orderId, dto, currentUser);
  }

  @Public()
  @ApiOperation({ summary: 'Lista as avaliações recebidas por um entregador' })
  @ApiResponse({
    status: 200,
    description: 'Lista de avaliações retornada com sucesso',
  })
  @Get('delivery-persons/:deliveryPersonId/reviews')
  listDeliveryReviews(@Param('deliveryPersonId', ParseIntPipe) deliveryPersonId: number) {
    return this.listDeliveryReviewsUseCase.execute(deliveryPersonId);
  }
}
