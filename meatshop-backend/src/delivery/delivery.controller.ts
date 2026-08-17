import { Body, Controller, Get, Param, ParseIntPipe, Patch, Post } from '@nestjs/common';
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

  @Post('register')
  register(
    @Body() dto: CreateDeliveryPersonDto,
    @CurrentUser() currentUser: User,
  ) {
    return this.registerDeliveryPersonUseCase.execute(dto, currentUser);
  }

  @Patch(':id/approve')
  approve(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() currentUser: User,
  ) {
    return this.approveDeliveryPersonUseCase.execute(id, currentUser);
  }

  @Post('vehicles')
  createVehicle(
    @Body() dto: CreateVehicleDto,
    @CurrentUser() currentUser: User,
  ) {
    return this.createVehicleUseCase.execute(dto, currentUser);
  }

  @Patch('vehicles/:id/activate')
  activateVehicle(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() currentUser: User,
  ) {
    return this.setActiveVehicleUseCase.execute(id, currentUser);
  }

  @Post('orders/:orderId/accept')
  acceptOrder(
    @Param('orderId', ParseIntPipe) orderId: number,
    @CurrentUser() currentUser: User,
  ) {
    return this.acceptDeliveryUseCase.execute(orderId, currentUser);
  }

  @Patch('orders/:orderId/status')
  updateStatus(
    @Param('orderId', ParseIntPipe) orderId: number,
    @Body() dto: UpdateDeliveryStatusDto,
    @CurrentUser() currentUser: User,
  ) {
    return this.updateDeliveryStatusUseCase.execute(orderId, dto, currentUser);
  }

  @Post('orders/:orderId/finish')
  finish(
    @Param('orderId', ParseIntPipe) orderId: number,
    @CurrentUser() currentUser: User,
  ) {
    return this.finishDeliveryUseCase.execute(orderId, currentUser);
  }

  @Post('orders/:orderId/location')
  updateLocation(
    @Param('orderId', ParseIntPipe) orderId: number,
    @Body() dto: UpdateLocationDto,
    @CurrentUser() currentUser: User,
  ) {
    return this.updateDeliveryLocationUseCase.execute(orderId, dto, currentUser);
  }

  @Get('orders/:orderId/tracking')
  getTracking(
    @Param('orderId', ParseIntPipe) orderId: number,
    @CurrentUser() currentUser: User,
  ) {
    return this.getDeliveryTrackingUseCase.execute(orderId, currentUser);
  }
}
