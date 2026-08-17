import { Body, Controller, Get, Param, ParseIntPipe, Patch, Post } from '@nestjs/common';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { User } from '../users/entities/user.entity';
import { CancelOrderDto } from './dtos/cancel-order.dto';
import { CreateOrderDto } from './dtos/create-order.dto';
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

  @Post()
  create(@Body() dto: CreateOrderDto, @CurrentUser() currentUser: User) {
    return this.createOrderUseCase.execute(dto, currentUser);
  }

  @Get()
  list(@CurrentUser() currentUser: User) {
    return this.listOrderHistoryUseCase.execute(currentUser);
  }

  @Get(':id')
  getOne(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() currentUser: User,
  ) {
    return this.getOrderUseCase.execute(id, currentUser);
  }

  @Patch(':id/confirm')
  confirm(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() currentUser: User,
  ) {
    return this.confirmOrderUseCase.execute(id, currentUser);
  }

  @Patch(':id/status')
  updateStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateOrderStatusDto,
    @CurrentUser() currentUser: User,
  ) {
    return this.updateOrderStatusUseCase.execute(id, dto, currentUser);
  }

  @Patch(':id/cancel')
  cancel(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CancelOrderDto,
    @CurrentUser() currentUser: User,
  ) {
    return this.cancelOrderUseCase.execute(id, dto, currentUser);
  }

  @Patch(':id/schedule')
  schedule(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ScheduleOrderDto,
    @CurrentUser() currentUser: User,
  ) {
    return this.scheduleOrderUseCase.execute(id, dto, currentUser);
  }

  @Post(':id/repeat')
  repeat(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() currentUser: User,
  ) {
    return this.repeatOrderUseCase.execute(id, currentUser);
  }
}
