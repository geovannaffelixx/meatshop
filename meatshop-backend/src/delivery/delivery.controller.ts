import { Body, Controller, Get, Param, ParseIntPipe, Patch, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { User } from '../users/entities/user.entity';
import { CreateDeliveryPersonDto } from './dtos/create-delivery-person.dto';
import { CreateVehicleDto } from './dtos/create-vehicle.dto';
import { UpdateDeliveryStatusDto } from './dtos/update-delivery-status.dto';
import { UpdateLocationDto } from './dtos/update-location.dto';
import { AcceptDeliveryUseCase } from './use-cases/accept-delivery.use-case';
import { ApproveDeliveryPersonUseCase } from './use-cases/approve-delivery-person.use-case';
import { CreateVehicleUseCase } from './use-cases/create-vehicle.use-case';
import { FinishDeliveryUseCase } from './use-cases/finish-delivery.use-case';
import { GetDeliveryTrackingUseCase } from './use-cases/get-delivery-tracking.use-case';
import { RegisterDeliveryPersonUseCase } from './use-cases/register-delivery-person.use-case';
import { SetActiveVehicleUseCase } from './use-cases/set-active-vehicle.use-case';
import { UpdateDeliveryLocationUseCase } from './use-cases/update-delivery-location.use-case';
import { UpdateDeliveryStatusUseCase } from './use-cases/update-delivery-status.use-case';

@ApiTags('Delivery')
@ApiBearerAuth('access-token')
@Controller('delivery')
export class DeliveryController {
  constructor(
    private readonly registerDeliveryPersonUseCase: RegisterDeliveryPersonUseCase,
    private readonly approveDeliveryPersonUseCase: ApproveDeliveryPersonUseCase,
    private readonly createVehicleUseCase: CreateVehicleUseCase,
    private readonly setActiveVehicleUseCase: SetActiveVehicleUseCase,
    private readonly acceptDeliveryUseCase: AcceptDeliveryUseCase,
    private readonly updateDeliveryStatusUseCase: UpdateDeliveryStatusUseCase,
    private readonly finishDeliveryUseCase: FinishDeliveryUseCase,
    private readonly updateDeliveryLocationUseCase: UpdateDeliveryLocationUseCase,
    private readonly getDeliveryTrackingUseCase: GetDeliveryTrackingUseCase,
  ) {}

  @ApiOperation({ summary: 'Registra o usuário autenticado como entregador' })
  @ApiResponse({ status: 201, description: 'Entregador registrado com sucesso' })
  @ApiResponse({ status: 400, description: 'Usuário já está registrado como entregador' })
  @Post('register')
  register(
    @Body() dto: CreateDeliveryPersonDto,
    @CurrentUser() currentUser: User,
  ) {
    return this.registerDeliveryPersonUseCase.execute(dto, currentUser);
  }

  @ApiOperation({ summary: 'Aprova o cadastro de um entregador' })
  @ApiResponse({ status: 200, description: 'Entregador aprovado com sucesso' })
  @ApiResponse({ status: 403, description: 'Usuário não tem permissão para aprovar entregadores' })
  @ApiResponse({ status: 404, description: 'Entregador não encontrado' })
  @Patch(':id/approve')
  approve(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() currentUser: User,
  ) {
    return this.approveDeliveryPersonUseCase.execute(id, currentUser);
  }

  @ApiOperation({ summary: 'Cadastra um novo veículo para o entregador autenticado' })
  @ApiResponse({ status: 201, description: 'Veículo cadastrado com sucesso' })
  @ApiResponse({ status: 400, description: 'Dados do veículo inválidos' })
  @ApiResponse({ status: 403, description: 'Usuário não tem permissão para cadastrar veículos' })
  @Post('vehicles')
  createVehicle(
    @Body() dto: CreateVehicleDto,
    @CurrentUser() currentUser: User,
  ) {
    return this.createVehicleUseCase.execute(dto, currentUser);
  }

  @ApiOperation({ summary: 'Define o veículo ativo do entregador autenticado' })
  @ApiResponse({ status: 200, description: 'Veículo ativado com sucesso' })
  @ApiResponse({ status: 403, description: 'Usuário não tem permissão para ativar este veículo' })
  @ApiResponse({ status: 404, description: 'Veículo não encontrado' })
  @Patch('vehicles/:id/activate')
  activateVehicle(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() currentUser: User,
  ) {
    return this.setActiveVehicleUseCase.execute(id, currentUser);
  }

  @ApiOperation({ summary: 'Aceita um pedido para entrega, vinculando-o ao entregador autenticado' })
  @ApiResponse({ status: 200, description: 'Pedido aceito com sucesso' })
  @ApiResponse({ status: 400, description: 'Pedido não está disponível para aceite' })
  @ApiResponse({ status: 403, description: 'Usuário não tem permissão para aceitar entregas' })
  @ApiResponse({ status: 404, description: 'Pedido não encontrado' })
  @Post('orders/:orderId/accept')
  acceptOrder(
    @Param('orderId', ParseIntPipe) orderId: number,
    @CurrentUser() currentUser: User,
  ) {
    return this.acceptDeliveryUseCase.execute(orderId, currentUser);
  }

  @ApiOperation({ summary: 'Atualiza o status da entrega do pedido' })
  @ApiResponse({ status: 200, description: 'Status da entrega atualizado com sucesso' })
  @ApiResponse({ status: 400, description: 'Transição de status de entrega inválida' })
  @ApiResponse({ status: 403, description: 'Usuário não tem permissão para atualizar esta entrega' })
  @ApiResponse({ status: 404, description: 'Pedido não encontrado' })
  @Patch('orders/:orderId/status')
  updateStatus(
    @Param('orderId', ParseIntPipe) orderId: number,
    @Body() dto: UpdateDeliveryStatusDto,
    @CurrentUser() currentUser: User,
  ) {
    return this.updateDeliveryStatusUseCase.execute(orderId, dto, currentUser);
  }

  @ApiOperation({ summary: 'Finaliza a entrega do pedido' })
  @ApiResponse({ status: 200, description: 'Entrega finalizada com sucesso' })
  @ApiResponse({ status: 400, description: 'Entrega não pode ser finalizada no status atual' })
  @ApiResponse({ status: 403, description: 'Usuário não tem permissão para finalizar esta entrega' })
  @ApiResponse({ status: 404, description: 'Pedido não encontrado' })
  @Post('orders/:orderId/finish')
  finish(
    @Param('orderId', ParseIntPipe) orderId: number,
    @CurrentUser() currentUser: User,
  ) {
    return this.finishDeliveryUseCase.execute(orderId, currentUser);
  }

  @ApiOperation({ summary: 'Atualiza a localização atual do entregador durante a entrega do pedido' })
  @ApiResponse({ status: 201, description: 'Localização atualizada com sucesso' })
  @ApiResponse({ status: 403, description: 'Usuário não tem permissão para atualizar a localização desta entrega' })
  @ApiResponse({ status: 404, description: 'Pedido não encontrado' })
  @Post('orders/:orderId/location')
  updateLocation(
    @Param('orderId', ParseIntPipe) orderId: number,
    @Body() dto: UpdateLocationDto,
    @CurrentUser() currentUser: User,
  ) {
    return this.updateDeliveryLocationUseCase.execute(orderId, dto, currentUser);
  }

  @ApiOperation({ summary: 'Consulta o acompanhamento (tracking) da entrega do pedido' })
  @ApiResponse({ status: 200, description: 'Informações de rastreamento retornadas com sucesso' })
  @ApiResponse({ status: 403, description: 'Usuário não tem permissão para acompanhar esta entrega' })
  @ApiResponse({ status: 404, description: 'Pedido não encontrado' })
  @Get('orders/:orderId/tracking')
  getTracking(
    @Param('orderId', ParseIntPipe) orderId: number,
    @CurrentUser() currentUser: User,
  ) {
    return this.getDeliveryTrackingUseCase.execute(orderId, currentUser);
  }
}
