import { Body, Controller, Get, Headers, Param, ParseIntPipe, Patch, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { User } from '../users/entities/user.entity';
import { CancelOrderDto } from './dtos/cancel-order.dto';
import { CheckoutResponseDto } from './dtos/checkout-response.dto';
import { CreateOrderDto } from './dtos/create-order.dto';
import { OrderListItemDto } from './dtos/order-list-item.dto';
import { OrderResponseDto } from './dtos/order-response.dto';
import { ScheduleOrderDto } from './dtos/schedule-order.dto';
import { UpdateOrderStatusDto } from './dtos/update-order-status.dto';
import { CancelOrderUseCase } from './use-cases/cancel-order.use-case';
import { ConfirmOrderUseCase } from './use-cases/confirm-order.use-case';
import { CreateOrderUseCase } from './use-cases/create-order.use-case';
import { GetOrderUseCase } from './use-cases/get-order.use-case';
import { ListOrderHistoryUseCase } from './use-cases/list-order-history.use-case';
import { RepeatOrderUseCase } from './use-cases/repeat-order.use-case';
import { ScheduleOrderUseCase } from './use-cases/schedule-order.use-case';
import { UpdateOrderStatusUseCase } from './use-cases/update-order-status.use-case';

@ApiTags('Orders')
@ApiBearerAuth('access-token')
@Controller('orders')
export class OrdersController {
  constructor(
    private readonly createOrderUseCase: CreateOrderUseCase,
    private readonly getOrderUseCase: GetOrderUseCase,
    private readonly listOrderHistoryUseCase: ListOrderHistoryUseCase,
    private readonly confirmOrderUseCase: ConfirmOrderUseCase,
    private readonly updateOrderStatusUseCase: UpdateOrderStatusUseCase,
    private readonly cancelOrderUseCase: CancelOrderUseCase,
    private readonly scheduleOrderUseCase: ScheduleOrderUseCase,
    private readonly repeatOrderUseCase: RepeatOrderUseCase,
  ) {}

  @ApiOperation({
    summary: 'Creates a new order for the authenticated customer',
  })
  @ApiResponse({
    status: 201,
    description: 'Checkout created successfully',
    type: CheckoutResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid data or insufficient stock for order items',
  })
  @Post()
  create(
    @Body() dto: CreateOrderDto,
    @Headers('idempotency-key') idempotencyKey: string,
    @CurrentUser() currentUser: User,
  ) {
    return this.createOrderUseCase.execute(dto, currentUser, idempotencyKey);
  }

  @ApiOperation({
    summary: 'Lists the authenticated user order history',
  })
  @ApiResponse({
    status: 200,
    description: 'Order history returned successfully',
    type: OrderListItemDto,
    isArray: true,
  })
  @Get()
  async list(@CurrentUser() currentUser: User) {
    const orders = await this.listOrderHistoryUseCase.execute(currentUser);
    return orders.map((order) => OrderListItemDto.fromEntity(order));
  }

  @ApiOperation({ summary: 'Gets the details of a specific order' })
  @ApiResponse({
    status: 200,
    description: 'Order found successfully',
    type: OrderResponseDto,
  })
  @ApiResponse({
    status: 403,
    description: 'User is not allowed to access this order',
  })
  @ApiResponse({ status: 404, description: 'Order not found' })
  @Get(':id')
  getOne(@Param('id', ParseIntPipe) id: number, @CurrentUser() currentUser: User) {
    return this.getOrderUseCase.execute(id, currentUser);
  }

  @ApiOperation({
    summary: 'Confirms the order and advances its preparation status',
  })
  @ApiResponse({
    status: 200,
    description: 'Order confirmed successfully',
    type: OrderResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid status transition for the current order state',
  })
  @ApiResponse({
    status: 403,
    description: 'User is not allowed to confirm this order',
  })
  @ApiResponse({ status: 404, description: 'Order not found' })
  @Patch(':id/confirm')
  confirm(@Param('id', ParseIntPipe) id: number, @CurrentUser() currentUser: User) {
    return this.confirmOrderUseCase.execute(id, currentUser);
  }

  @ApiOperation({ summary: 'Updates the order status' })
  @ApiResponse({
    status: 200,
    description: 'Order status updated successfully',
    type: OrderResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid status transition for the current order state',
  })
  @ApiResponse({
    status: 403,
    description: 'User is not allowed to update this order status',
  })
  @ApiResponse({ status: 404, description: 'Order not found' })
  @Patch(':id/status')
  updateStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateOrderStatusDto,
    @CurrentUser() currentUser: User,
  ) {
    return this.updateOrderStatusUseCase.execute(id, dto, currentUser);
  }

  @ApiOperation({ summary: 'Cancels the order and restores item stock' })
  @ApiResponse({
    status: 200,
    description: 'Order canceled successfully',
    type: OrderResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Order cannot be canceled in its current status',
  })
  @ApiResponse({
    status: 403,
    description: 'User is not allowed to cancel this order',
  })
  @ApiResponse({ status: 404, description: 'Order not found' })
  @Patch(':id/cancel')
  cancel(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CancelOrderDto,
    @CurrentUser() currentUser: User,
  ) {
    return this.cancelOrderUseCase.execute(id, dto, currentUser);
  }

  @ApiOperation({
    summary: 'Schedules or reschedules the order delivery date and time',
  })
  @ApiResponse({
    status: 200,
    description: 'Order scheduled successfully',
    type: OrderResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid schedule date or the order cannot be scheduled in its current status',
  })
  @ApiResponse({
    status: 403,
    description: 'User is not allowed to schedule this order',
  })
  @ApiResponse({ status: 404, description: 'Order not found' })
  @Patch(':id/schedule')
  schedule(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ScheduleOrderDto,
    @CurrentUser() currentUser: User,
  ) {
    return this.scheduleOrderUseCase.execute(id, dto, currentUser);
  }

  @ApiOperation({
    summary: 'Repeats a previous order by creating a new order with the same items',
  })
  @ApiResponse({
    status: 201,
    description: 'New order created from the previous order',
    type: OrderResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Insufficient stock to repeat the order',
  })
  @ApiResponse({
    status: 403,
    description: 'User is not allowed to repeat this order',
  })
  @ApiResponse({ status: 404, description: 'Order not found' })
  @Post(':id/repeat')
  repeat(@Param('id', ParseIntPipe) id: number, @CurrentUser() currentUser: User) {
    return this.repeatOrderUseCase.execute(id, currentUser);
  }
}
