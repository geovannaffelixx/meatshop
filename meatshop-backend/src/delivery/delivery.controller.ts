import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseEnumPipe,
  ParseIntPipe,
  Patch,
  Post,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { User } from '../users/entities/user.entity';
import { CreateDeliveryPersonDto } from './dtos/create-delivery-person.dto';
import { CreateVehicleDto } from './dtos/create-vehicle.dto';
import { UpdateDeliveryStatusDto } from './dtos/update-delivery-status.dto';
import { UpdateLocationDto, SharingConsentDto } from './dtos/update-location.dto';
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
import { UpdateAvailabilityDto } from './dtos/update-availability.dto';
import { RejectDeliveryOfferDto } from './dtos/reject-delivery-offer.dto';
import { UpdateDeliveryGoalDto } from './dtos/update-delivery-goal.dto';
import { UpdateVehicleDto } from './dtos/update-vehicle.dto';
import { DeliveryGoalPeriod } from './entities/delivery-goal.entity';
import { DeliveryTrackingRetentionService } from './services/delivery-tracking-retention.service';
import { DeliveryMobileService } from './services/delivery-mobile.service';

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
    private readonly mobileService: DeliveryMobileService,
    private readonly trackingRetention: DeliveryTrackingRetentionService,
  ) {}

  @Get('tracking-policy')
  trackingPolicy() {
    return this.trackingRetention.policy();
  }

  @Get('me')
  me(@CurrentUser() currentUser: User) {
    return this.mobileService.profile(currentUser);
  }

  @ApiOperation({
    summary: 'Returns the assigned delivery person public profile to the customer',
  })
  @Get(':id/public-profile')
  publicProfile(@Param('id', ParseIntPipe) id: number, @CurrentUser() currentUser: User) {
    return this.mobileService.publicProfile(id, currentUser);
  }

  @Patch('me/availability')
  setAvailability(@Body() dto: UpdateAvailabilityDto, @CurrentUser() currentUser: User) {
    return this.mobileService.availability(currentUser, dto.is_online);
  }

  @Get('me/vehicles')
  listOwnVehicles(@CurrentUser() currentUser: User) {
    return this.mobileService.listVehicles(currentUser);
  }

  @Patch('me/vehicles/:id')
  updateOwnVehicle(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateVehicleDto,
    @CurrentUser() currentUser: User,
  ) {
    return this.mobileService.updateVehicle(id, dto, currentUser);
  }

  @Delete('me/vehicles/:id')
  deleteOwnVehicle(@Param('id', ParseIntPipe) id: number, @CurrentUser() currentUser: User) {
    return this.mobileService.deleteVehicle(id, currentUser);
  }

  @Get('me/orders/available')
  availableOrders(@CurrentUser() currentUser: User) {
    return this.mobileService.available(currentUser);
  }

  @Get('me/orders/active')
  activeOrder(@CurrentUser() currentUser: User) {
    return this.mobileService.active(currentUser);
  }

  @Get('me/orders/history')
  deliveryHistory(@CurrentUser() currentUser: User) {
    return this.mobileService.history(currentUser);
  }

  @Post('orders/:orderId/reject')
  rejectOrder(
    @Param('orderId', ParseIntPipe) orderId: number,
    @Body() dto: RejectDeliveryOfferDto,
    @CurrentUser() currentUser: User,
  ) {
    return this.mobileService.reject(orderId, dto, currentUser);
  }

  @Get('me/earnings')
  earnings(@CurrentUser() currentUser: User) {
    return this.mobileService.earnings(currentUser);
  }

  @Get('me/goals')
  goals(@CurrentUser() currentUser: User) {
    return this.mobileService.listGoals(currentUser);
  }

  @Patch('me/goals/:period')
  updateGoal(
    @Param('period', new ParseEnumPipe(DeliveryGoalPeriod))
    period: DeliveryGoalPeriod,
    @Body() dto: UpdateDeliveryGoalDto,
    @CurrentUser() currentUser: User,
  ) {
    return this.mobileService.updateGoal(period, dto, currentUser);
  }

  @ApiOperation({
    summary: 'Lists the active delivery operation for a unit',
  })
  @Get('units/:unitId/live')
  listLiveDeliveries(
    @Param('unitId', ParseIntPipe) unitId: number,
    @CurrentUser() currentUser: User,
  ) {
    return this.listLiveDeliveriesUseCase.execute(unitId, currentUser);
  }

  @ApiOperation({ summary: 'Lists delivery people linked to the unit' })
  @Get('units/:unitId/people')
  listDeliveryPeople(
    @Param('unitId', ParseIntPipe) unitId: number,
    @CurrentUser() currentUser: User,
  ) {
    return this.listUnitDeliveryPeopleUseCase.execute(unitId, currentUser);
  }

  @ApiOperation({ summary: 'Approves a delivery person linked to the unit' })
  @Patch('units/:unitId/people/:deliveryPersonId/approve')
  approveUnitDeliveryPerson(
    @Param('unitId', ParseIntPipe) unitId: number,
    @Param('deliveryPersonId', ParseIntPipe) deliveryPersonId: number,
    @CurrentUser() currentUser: User,
  ) {
    return this.approveUnitDeliveryPersonUseCase.execute(unitId, deliveryPersonId, currentUser);
  }

  @ApiOperation({ summary: 'Assigns a delivery person to the order' })
  @Post('units/:unitId/orders/:orderId/assign')
  assignDeliveryPerson(
    @Param('unitId', ParseIntPipe) unitId: number,
    @Param('orderId', ParseIntPipe) orderId: number,
    @Body() dto: AssignDeliveryPersonDto,
    @CurrentUser() currentUser: User,
  ) {
    return this.assignDeliveryPersonUseCase.execute(unitId, orderId, dto, currentUser);
  }

  @ApiOperation({
    summary: 'Removes the delivery person from the order before pickup',
  })
  @Delete('units/:unitId/orders/:orderId/assignment')
  unassignDeliveryPerson(
    @Param('unitId', ParseIntPipe) unitId: number,
    @Param('orderId', ParseIntPipe) orderId: number,
    @CurrentUser() currentUser: User,
  ) {
    return this.unassignDeliveryPersonUseCase.execute(unitId, orderId, currentUser);
  }

  @ApiOperation({
    summary: 'Validates the delivery person code and releases pickup',
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

  @ApiOperation({
    summary: 'Registers the authenticated user as a delivery person',
  })
  @ApiResponse({
    status: 201,
    description: 'Delivery person registered successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'User is already registered as a delivery person',
  })
  @Post('register')
  register(@Body() dto: CreateDeliveryPersonDto, @CurrentUser() currentUser: User) {
    return this.registerDeliveryPersonUseCase.execute(dto, currentUser);
  }

  @ApiOperation({ summary: 'Approves a delivery person registration' })
  @ApiResponse({
    status: 200,
    description: 'Delivery person approved successfully',
  })
  @ApiResponse({
    status: 403,
    description: 'User is not allowed to approve delivery people',
  })
  @ApiResponse({ status: 404, description: 'Delivery person not found' })
  @Patch(':id/approve')
  approve(@Param('id', ParseIntPipe) id: number, @CurrentUser() currentUser: User) {
    return this.approveDeliveryPersonUseCase.execute(id, currentUser);
  }

  @ApiOperation({
    summary: 'Registers a new vehicle for the authenticated delivery person',
  })
  @ApiResponse({ status: 201, description: 'Vehicle registered successfully' })
  @ApiResponse({ status: 400, description: 'Invalid vehicle data' })
  @ApiResponse({
    status: 403,
    description: 'User is not allowed to register vehicles',
  })
  @Post('vehicles')
  createVehicle(@Body() dto: CreateVehicleDto, @CurrentUser() currentUser: User) {
    return this.createVehicleUseCase.execute(dto, currentUser);
  }

  @ApiOperation({
    summary: 'Sets the authenticated delivery person active vehicle',
  })
  @ApiResponse({ status: 200, description: 'Vehicle activated successfully' })
  @ApiResponse({
    status: 403,
    description: 'User is not allowed to activate this vehicle',
  })
  @ApiResponse({ status: 404, description: 'Vehicle not found' })
  @Patch('vehicles/:id/activate')
  activateVehicle(@Param('id', ParseIntPipe) id: number, @CurrentUser() currentUser: User) {
    return this.setActiveVehicleUseCase.execute(id, currentUser);
  }

  @ApiOperation({
    summary: 'Accepts an order for delivery and assigns it to the authenticated delivery person',
  })
  @ApiResponse({ status: 200, description: 'Order accepted successfully' })
  @ApiResponse({
    status: 400,
    description: 'Order is not available for acceptance',
  })
  @ApiResponse({
    status: 403,
    description: 'User is not allowed to accept deliveries',
  })
  @ApiResponse({ status: 404, description: 'Order not found' })
  @Post('orders/:orderId/accept')
  acceptOrder(@Param('orderId', ParseIntPipe) orderId: number, @CurrentUser() currentUser: User) {
    return this.acceptDeliveryUseCase.execute(orderId, currentUser);
  }

  @ApiOperation({ summary: 'Updates the order delivery status' })
  @ApiResponse({
    status: 200,
    description: 'Delivery status updated successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid delivery status transition',
  })
  @ApiResponse({
    status: 403,
    description: 'User is not allowed to update this delivery',
  })
  @ApiResponse({ status: 404, description: 'Order not found' })
  @Patch('orders/:orderId/status')
  updateStatus(
    @Param('orderId', ParseIntPipe) orderId: number,
    @Body() dto: UpdateDeliveryStatusDto,
    @CurrentUser() currentUser: User,
  ) {
    return this.updateDeliveryStatusUseCase.execute(orderId, dto, currentUser);
  }

  @ApiOperation({ summary: 'Completes the order delivery' })
  @ApiResponse({ status: 200, description: 'Delivery completed successfully' })
  @ApiResponse({
    status: 400,
    description: 'Delivery cannot be completed in its current status',
  })
  @ApiResponse({
    status: 403,
    description: 'User is not allowed to complete this delivery',
  })
  @ApiResponse({ status: 404, description: 'Order not found' })
  @Post('orders/:orderId/finish')
  finish(
    @Param('orderId', ParseIntPipe) orderId: number,
    @Body() dto: VerifyDeliveryCodeDto,
    @CurrentUser() currentUser: User,
  ) {
    return this.finishDeliveryUseCase.execute(orderId, dto, currentUser);
  }

  @ApiOperation({
    summary: 'Regenerates the code provided by the customer at delivery',
  })
  @Post('orders/:orderId/delivery-code/regenerate')
  regenerateCustomerCode(
    @Param('orderId', ParseIntPipe) orderId: number,
    @CurrentUser() currentUser: User,
  ) {
    return this.regenerateDeliveryCodeUseCase.execute(orderId, 'DELIVERY', currentUser);
  }

  @ApiOperation({
    summary: 'Regenerates the code used by the delivery person at pickup',
  })
  @Post('orders/:orderId/pickup-code/regenerate')
  regeneratePickupCode(
    @Param('orderId', ParseIntPipe) orderId: number,
    @CurrentUser() currentUser: User,
  ) {
    return this.regenerateDeliveryCodeUseCase.execute(orderId, 'PICKUP', currentUser);
  }

  @ApiOperation({
    summary: 'Updates the delivery person current location during order delivery',
  })
  @ApiResponse({
    status: 201,
    description: 'Location updated successfully',
  })
  @ApiResponse({
    status: 403,
    description: 'User is not allowed to update this delivery location',
  })
  @ApiResponse({ status: 404, description: 'Order not found' })
  @Patch('orders/:orderId/sharing')
  setSharing(
    @Param('orderId', ParseIntPipe) orderId: number,
    @Body() dto: SharingConsentDto,
    @CurrentUser() user: User,
  ) {
    return this.updateDeliveryLocationUseCase.sharing(orderId, dto, user);
  }

  @Post('orders/:orderId/location')
  updateLocation(
    @Param('orderId', ParseIntPipe) orderId: number,
    @Body() dto: UpdateLocationDto,
    @CurrentUser() currentUser: User,
  ) {
    return this.updateDeliveryLocationUseCase.execute(orderId, dto, currentUser);
  }

  @ApiOperation({
    summary: 'Gets order delivery tracking',
  })
  @ApiResponse({
    status: 200,
    description: 'Tracking information returned successfully',
  })
  @ApiResponse({
    status: 403,
    description: 'User is not allowed to track this delivery',
  })
  @ApiResponse({ status: 404, description: 'Order not found' })
  @Get('orders/:orderId/tracking')
  getTracking(@Param('orderId', ParseIntPipe) orderId: number, @CurrentUser() currentUser: User) {
    return this.getDeliveryTrackingUseCase.execute(orderId, currentUser);
  }
}
