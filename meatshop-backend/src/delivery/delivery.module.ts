import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OrdersModule } from '../orders/orders.module';
import { DeliveryController } from './delivery.controller';
import { DeliveryPerson } from './entities/delivery-person.entity';
import { DeliveryTracking } from './entities/delivery-tracking.entity';
import { Vehicle } from './entities/vehicle.entity';
import { DeliveryPersonAccessService } from './services/delivery-person-access.service';
import { AcceptDeliveryUseCase } from './use-cases/accept-delivery.use-case';
import { ApproveDeliveryPersonUseCase } from './use-cases/approve-delivery-person.use-case';
import { CreateVehicleUseCase } from './use-cases/create-vehicle.use-case';
import { FinishDeliveryUseCase } from './use-cases/finish-delivery.use-case';
import { GetDeliveryTrackingUseCase } from './use-cases/get-delivery-tracking.use-case';
import { RegisterDeliveryPersonUseCase } from './use-cases/register-delivery-person.use-case';
import { SetActiveVehicleUseCase } from './use-cases/set-active-vehicle.use-case';
import { UpdateDeliveryLocationUseCase } from './use-cases/update-delivery-location.use-case';
import { UpdateDeliveryStatusUseCase } from './use-cases/update-delivery-status.use-case';

@Module({
  imports: [
    TypeOrmModule.forFeature([DeliveryPerson, Vehicle, DeliveryTracking]),
    OrdersModule,
  ],
  controllers: [DeliveryController],
  providers: [
    DeliveryPersonAccessService,
    RegisterDeliveryPersonUseCase,
    ApproveDeliveryPersonUseCase,
    CreateVehicleUseCase,
    SetActiveVehicleUseCase,
    AcceptDeliveryUseCase,
    UpdateDeliveryStatusUseCase,
    FinishDeliveryUseCase,
    UpdateDeliveryLocationUseCase,
    GetDeliveryTrackingUseCase,
  ],
  exports: [TypeOrmModule],
})
export class DeliveryModule {}
