import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { User } from '../users/entities/user.entity';
import { CreateDeliveryPersonDto } from './dtos/create-delivery-person.dto';
import { CreateVehicleDto } from './dtos/create-vehicle.dto';
import { UpdateDeliveryStatusDto } from './dtos/update-delivery-status.dto';
import { UpdateLocationDto } from './dtos/update-location.dto';
import { AssignDeliveryPersonDto } from './dtos/assign-delivery-person.dto';
import { VerifyDeliveryCodeDto } from './dtos/verify-delivery-code.dto';
import { AcceptDeliveryUseCase } from './use-cases/accept-delivery.use-case';
import { ApproveDeliveryPersonUseCase } from './use-cases/approve-delivery-person.use-case';
import { CreateVehicleUseCase } from './use-cases/create-vehicle.use-case';
import { FinishDeliveryUseCase } from './use-cases/finish-delivery.use-case';
import { GetDeliveryTrackingUseCase } from './use-cases/get-delivery-tracking.use-case';
import { ListLiveDeliveriesUseCase } from './use-cases/list-live-deliveries.use-case';
import { RegisterDeliveryPersonUseCase } from './use-cases/register-delivery-person.use-case';
import { SetActiveVehicleUseCase } from './use-cases/set-active-vehicle.use-case';
import { UpdateDeliveryLocationUseCase } from './use-cases/update-delivery-location.use-case';
import { UpdateDeliveryStatusUseCase } from './use-cases/update-delivery-status.use-case';
import { AssignDeliveryPersonUseCase } from './use-cases/assign-delivery-person.use-case';
import { UnassignDeliveryPersonUseCase } from './use-cases/unassign-delivery-person.use-case';
import { VerifyPickupCodeUseCase } from './use-cases/verify-pickup-code.use-case';
import { ListUnitDeliveryPeopleUseCase } from './use-cases/list-unit-delivery-people.use-case';
import { ApproveUnitDeliveryPersonUseCase } from './use-cases/approve-unit-delivery-person.use-case';
import { RegenerateDeliveryCodeUseCase } from './use-cases/regenerate-delivery-code.use-case';

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
    private readonly listLiveDeliveriesUseCase: ListLiveDeliveriesUseCase,
    private readonly assignDeliveryPersonUseCase: AssignDeliveryPersonUseCase,
    private readonly unassignDeliveryPersonUseCase: UnassignDeliveryPersonUseCase,
    private readonly verifyPickupCodeUseCase: VerifyPickupCodeUseCase,
    private readonly listUnitDeliveryPeopleUseCase: ListUnitDeliveryPeopleUseCase,
    private readonly approveUnitDeliveryPersonUseCase: ApproveUnitDeliveryPersonUseCase,
    private readonly regenerateDeliveryCodeUseCase: RegenerateDeliveryCodeUseCase,
  ) {}

  @ApiOperation({
    summary: 'Lista a operação de entregas ativa de uma unidade',
  })
  @Get('units/:unitId/live')
  listLiveDeliveries(
    @Param('unitId', ParseIntPipe) unitId: number,
    @CurrentUser() currentUser: User,
  ) {
    return this.listLiveDeliveriesUseCase.execute(unitId, currentUser);
  }

  @ApiOperation({ summary: 'Lista os entregadores vinculados à unidade' })
  @Get('units/:unitId/people')
  listDeliveryPeople(
    @Param('unitId', ParseIntPipe) unitId: number,
    @CurrentUser() currentUser: User,
  ) {
    return this.listUnitDeliveryPeopleUseCase.execute(unitId, currentUser);
  }

  @ApiOperation({ summary: 'Aprova um entregador vinculado à unidade' })
  @Patch('units/:unitId/people/:deliveryPersonId/approve')
  approveUnitDeliveryPerson(
    @Param('unitId', ParseIntPipe) unitId: number,
    @Param('deliveryPersonId', ParseIntPipe) deliveryPersonId: number,
    @CurrentUser() currentUser: User,
  ) {
    return this.approveUnitDeliveryPersonUseCase.execute(unitId, deliveryPersonId, currentUser);
  }

  @ApiOperation({ summary: 'Atribui um entregador ao pedido' })
  @Post('units/:unitId/orders/:orderId/assign')
  assignDeliveryPerson(
    @Param('unitId', ParseIntPipe) unitId: number,
    @Param('orderId', ParseIntPipe) orderId: number,
    @Body() dto: AssignDeliveryPersonDto,
    @CurrentUser() currentUser: User,
  ) {
    return this.assignDeliveryPersonUseCase.execute(unitId, orderId, dto, currentUser);
  }

  @ApiOperation({ summary: 'Remove o entregador do pedido antes da retirada' })
  @Delete('units/:unitId/orders/:orderId/assignment')
  unassignDeliveryPerson(
    @Param('unitId', ParseIntPipe) unitId: number,
    @Param('orderId', ParseIntPipe) orderId: number,
    @CurrentUser() currentUser: User,
  ) {
    return this.unassignDeliveryPersonUseCase.execute(unitId, orderId, currentUser);
  }

  @ApiOperation({
    summary: 'Valida o código do entregador e libera a retirada',
  })
  @Post('units/:unitId/orders/:orderId/verify-pickup')
  verifyPickup(
    @Param('unitId', ParseIntPipe) unitId: number,
    @Param('orderId', ParseIntPipe) orderId: number,
    @Body() dto: VerifyDeliveryCodeDto,
    @CurrentUser() currentUser: User,
  ) {
    return this.verifyPickupCodeUseCase.execute(unitId, orderId, dto, currentUser);
  }

  @ApiOperation({ summary: 'Registra o usuário autenticado como entregador' })
  @ApiResponse({
    status: 201,
    description: 'Entregador registrado com sucesso',
  })
  @ApiResponse({
    status: 400,
    description: 'Usuário já está registrado como entregador',
  })
  @Post('register')
  register(@Body() dto: CreateDeliveryPersonDto, @CurrentUser() currentUser: User) {
    return this.registerDeliveryPersonUseCase.execute(dto, currentUser);
  }

  @ApiOperation({ summary: 'Aprova o cadastro de um entregador' })
  @ApiResponse({ status: 200, description: 'Entregador aprovado com sucesso' })
  @ApiResponse({
    status: 403,
    description: 'Usuário não tem permissão para aprovar entregadores',
  })
  @ApiResponse({ status: 404, description: 'Entregador não encontrado' })
  @Patch(':id/approve')
  approve(@Param('id', ParseIntPipe) id: number, @CurrentUser() currentUser: User) {
    return this.approveDeliveryPersonUseCase.execute(id, currentUser);
  }

  @ApiOperation({
    summary: 'Cadastra um novo veículo para o entregador autenticado',
  })
  @ApiResponse({ status: 201, description: 'Veículo cadastrado com sucesso' })
  @ApiResponse({ status: 400, description: 'Dados do veículo inválidos' })
  @ApiResponse({
    status: 403,
    description: 'Usuário não tem permissão para cadastrar veículos',
  })
  @Post('vehicles')
  createVehicle(@Body() dto: CreateVehicleDto, @CurrentUser() currentUser: User) {
    return this.createVehicleUseCase.execute(dto, currentUser);
  }

  @ApiOperation({ summary: 'Define o veículo ativo do entregador autenticado' })
  @ApiResponse({ status: 200, description: 'Veículo ativado com sucesso' })
  @ApiResponse({
    status: 403,
    description: 'Usuário não tem permissão para ativar este veículo',
  })
  @ApiResponse({ status: 404, description: 'Veículo não encontrado' })
  @Patch('vehicles/:id/activate')
  activateVehicle(@Param('id', ParseIntPipe) id: number, @CurrentUser() currentUser: User) {
    return this.setActiveVehicleUseCase.execute(id, currentUser);
  }

  @ApiOperation({
    summary: 'Aceita um pedido para entrega, vinculando-o ao entregador autenticado',
  })
  @ApiResponse({ status: 200, description: 'Pedido aceito com sucesso' })
  @ApiResponse({
    status: 400,
    description: 'Pedido não está disponível para aceite',
  })
  @ApiResponse({
    status: 403,
    description: 'Usuário não tem permissão para aceitar entregas',
  })
  @ApiResponse({ status: 404, description: 'Pedido não encontrado' })
  @Post('orders/:orderId/accept')
  acceptOrder(@Param('orderId', ParseIntPipe) orderId: number, @CurrentUser() currentUser: User) {
    return this.acceptDeliveryUseCase.execute(orderId, currentUser);
  }

  @ApiOperation({ summary: 'Atualiza o status da entrega do pedido' })
  @ApiResponse({
    status: 200,
    description: 'Status da entrega atualizado com sucesso',
  })
  @ApiResponse({
    status: 400,
    description: 'Transição de status de entrega inválida',
  })
  @ApiResponse({
    status: 403,
    description: 'Usuário não tem permissão para atualizar esta entrega',
  })
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
  @ApiResponse({
    status: 400,
    description: 'Entrega não pode ser finalizada no status atual',
  })
  @ApiResponse({
    status: 403,
    description: 'Usuário não tem permissão para finalizar esta entrega',
  })
  @ApiResponse({ status: 404, description: 'Pedido não encontrado' })
  @Post('orders/:orderId/finish')
  finish(
    @Param('orderId', ParseIntPipe) orderId: number,
    @Body() dto: VerifyDeliveryCodeDto,
    @CurrentUser() currentUser: User,
  ) {
    return this.finishDeliveryUseCase.execute(orderId, dto, currentUser);
  }

  @ApiOperation({
    summary: 'Gera novamente o código que o cliente informa na entrega',
  })
  @Post('orders/:orderId/delivery-code/regenerate')
  regenerateCustomerCode(
    @Param('orderId', ParseIntPipe) orderId: number,
    @CurrentUser() currentUser: User,
  ) {
    return this.regenerateDeliveryCodeUseCase.execute(orderId, 'DELIVERY', currentUser);
  }

  @ApiOperation({
    summary: 'Gera novamente o código usado pelo entregador na retirada',
  })
  @Post('orders/:orderId/pickup-code/regenerate')
  regeneratePickupCode(
    @Param('orderId', ParseIntPipe) orderId: number,
    @CurrentUser() currentUser: User,
  ) {
    return this.regenerateDeliveryCodeUseCase.execute(orderId, 'PICKUP', currentUser);
  }

  @ApiOperation({
    summary: 'Atualiza a localização atual do entregador durante a entrega do pedido',
  })
  @ApiResponse({
    status: 201,
    description: 'Localização atualizada com sucesso',
  })
  @ApiResponse({
    status: 403,
    description: 'Usuário não tem permissão para atualizar a localização desta entrega',
  })
  @ApiResponse({ status: 404, description: 'Pedido não encontrado' })
  @Post('orders/:orderId/location')
  updateLocation(
    @Param('orderId', ParseIntPipe) orderId: number,
    @Body() dto: UpdateLocationDto,
    @CurrentUser() currentUser: User,
  ) {
    return this.updateDeliveryLocationUseCase.execute(orderId, dto, currentUser);
  }

  @ApiOperation({
    summary: 'Consulta o acompanhamento (tracking) da entrega do pedido',
  })
  @ApiResponse({
    status: 200,
    description: 'Informações de rastreamento retornadas com sucesso',
  })
  @ApiResponse({
    status: 403,
    description: 'Usuário não tem permissão para acompanhar esta entrega',
  })
  @ApiResponse({ status: 404, description: 'Pedido não encontrado' })
  @Get('orders/:orderId/tracking')
  getTracking(@Param('orderId', ParseIntPipe) orderId: number, @CurrentUser() currentUser: User) {
    return this.getDeliveryTrackingUseCase.execute(orderId, currentUser);
  }
}
