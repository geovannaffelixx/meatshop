import { Body, Controller, Get, Param, ParseIntPipe, Patch, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { User } from '../users/entities/user.entity';
import { CancelOrderDto } from './dtos/cancel-order.dto';
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

  @ApiOperation({ summary: 'Cria um novo pedido para o cliente autenticado' })
  @ApiResponse({ status: 201, description: 'Pedido criado com sucesso', type: OrderResponseDto })
  @ApiResponse({ status: 400, description: 'Dados inválidos ou estoque insuficiente para os itens do pedido' })
  @Post()
  create(@Body() dto: CreateOrderDto, @CurrentUser() currentUser: User) {
    return this.createOrderUseCase.execute(dto, currentUser);
  }

  @ApiOperation({ summary: 'Lista o histórico de pedidos do usuário autenticado' })
  @ApiResponse({ status: 200, description: 'Histórico de pedidos retornado com sucesso', type: OrderListItemDto, isArray: true })
  @Get()
  async list(@CurrentUser() currentUser: User) {
    const orders = await this.listOrderHistoryUseCase.execute(currentUser);
    return orders.map((order) => OrderListItemDto.fromEntity(order));
  }

  @ApiOperation({ summary: 'Busca os detalhes de um pedido específico' })
  @ApiResponse({ status: 200, description: 'Pedido encontrado com sucesso', type: OrderResponseDto })
  @ApiResponse({ status: 403, description: 'Usuário não tem permissão para acessar este pedido' })
  @ApiResponse({ status: 404, description: 'Pedido não encontrado' })
  @Get(':id')
  getOne(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() currentUser: User,
  ) {
    return this.getOrderUseCase.execute(id, currentUser);
  }

  @ApiOperation({ summary: 'Confirma o pedido, avançando seu status no fluxo de preparo' })
  @ApiResponse({ status: 200, description: 'Pedido confirmado com sucesso', type: OrderResponseDto })
  @ApiResponse({ status: 400, description: 'Transição de status inválida para o estado atual do pedido' })
  @ApiResponse({ status: 403, description: 'Usuário não tem permissão para confirmar este pedido' })
  @ApiResponse({ status: 404, description: 'Pedido não encontrado' })
  @Patch(':id/confirm')
  confirm(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() currentUser: User,
  ) {
    return this.confirmOrderUseCase.execute(id, currentUser);
  }

  @ApiOperation({ summary: 'Atualiza o status do pedido' })
  @ApiResponse({ status: 200, description: 'Status do pedido atualizado com sucesso', type: OrderResponseDto })
  @ApiResponse({ status: 400, description: 'Transição de status inválida para o estado atual do pedido' })
  @ApiResponse({ status: 403, description: 'Usuário não tem permissão para atualizar o status deste pedido' })
  @ApiResponse({ status: 404, description: 'Pedido não encontrado' })
  @Patch(':id/status')
  updateStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateOrderStatusDto,
    @CurrentUser() currentUser: User,
  ) {
    return this.updateOrderStatusUseCase.execute(id, dto, currentUser);
  }

  @ApiOperation({ summary: 'Cancela o pedido e restaura o estoque dos itens' })
  @ApiResponse({ status: 200, description: 'Pedido cancelado com sucesso', type: OrderResponseDto })
  @ApiResponse({ status: 400, description: 'Pedido não pode ser cancelado no status atual' })
  @ApiResponse({ status: 403, description: 'Usuário não tem permissão para cancelar este pedido' })
  @ApiResponse({ status: 404, description: 'Pedido não encontrado' })
  @Patch(':id/cancel')
  cancel(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CancelOrderDto,
    @CurrentUser() currentUser: User,
  ) {
    return this.cancelOrderUseCase.execute(id, dto, currentUser);
  }

  @ApiOperation({ summary: 'Agenda ou reagenda a data e hora de entrega do pedido' })
  @ApiResponse({ status: 200, description: 'Pedido agendado com sucesso', type: OrderResponseDto })
  @ApiResponse({ status: 400, description: 'Data de agendamento inválida ou pedido não pode ser agendado no status atual' })
  @ApiResponse({ status: 403, description: 'Usuário não tem permissão para agendar este pedido' })
  @ApiResponse({ status: 404, description: 'Pedido não encontrado' })
  @Patch(':id/schedule')
  schedule(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ScheduleOrderDto,
    @CurrentUser() currentUser: User,
  ) {
    return this.scheduleOrderUseCase.execute(id, dto, currentUser);
  }

  @ApiOperation({ summary: 'Repete um pedido anterior, criando um novo pedido com os mesmos itens' })
  @ApiResponse({ status: 201, description: 'Novo pedido criado a partir do pedido anterior', type: OrderResponseDto })
  @ApiResponse({ status: 400, description: 'Estoque insuficiente para repetir o pedido' })
  @ApiResponse({ status: 403, description: 'Usuário não tem permissão para repetir este pedido' })
  @ApiResponse({ status: 404, description: 'Pedido não encontrado' })
  @Post(':id/repeat')
  repeat(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() currentUser: User,
  ) {
    return this.repeatOrderUseCase.execute(id, currentUser);
  }
}
