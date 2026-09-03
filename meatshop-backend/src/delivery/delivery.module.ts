import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OrdersModule } from '../orders/orders.module';
import { AuthModule } from '../auth/auth.module';
import { UnitsModule } from '../units/units.module';
import { Unit } from '../units/entities/unit.entity';
import { User } from '../users/entities/user.entity';
import { UserUnit } from '../units/entities/user-unit.entity';
import { NotificationsModule } from '../notifications/notifications.module';
import { DeliveryController } from './delivery.controller';
import { DeliveryGateway } from './delivery.gateway';
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
import { ListLiveDeliveriesUseCase } from './use-cases/list-live-deliveries.use-case';
import { AssignDeliveryPersonUseCase } from './use-cases/assign-delivery-person.use-case';
import { UnassignDeliveryPersonUseCase } from './use-cases/unassign-delivery-person.use-case';
import { VerifyPickupCodeUseCase } from './use-cases/verify-pickup-code.use-case';
import { ListUnitDeliveryPeopleUseCase } from './use-cases/list-unit-delivery-people.use-case';
import { ApproveUnitDeliveryPersonUseCase } from './use-cases/approve-unit-delivery-person.use-case';
import { RegenerateDeliveryCodeUseCase } from './use-cases/regenerate-delivery-code.use-case';
import { Order } from '../orders/entities/order.entity';
import { OrderItem } from '../orders/entities/order-item.entity';
import { DeliveryGoal } from './entities/delivery-goal.entity';
import { DeliveryOfferRejection } from './entities/delivery-offer-rejection.entity';
import { DeliveryMobileService } from './services/delivery-mobile.service';
import { DeliveryUploadController } from './delivery-upload.controller';
import { VehiclePhotoService } from './services/vehicle-photo.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      DeliveryPerson,
      Vehicle,
      DeliveryTracking,
      DeliveryGoal,
      DeliveryOfferRejection,
      Order,
      OrderItem,
      Unit,
      User,
      UserUnit,
    ]),
    AuthModule,
    NotificationsModule,
    OrdersModule,
    UnitsModule,
  ],
  controllers: [DeliveryController, DeliveryUploadController],
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
    ListLiveDeliveriesUseCase,
    DeliveryGateway,
    AssignDeliveryPersonUseCase,
    UnassignDeliveryPersonUseCase,
    VerifyPickupCodeUseCase,
    ListUnitDeliveryPeopleUseCase,
    ApproveUnitDeliveryPersonUseCase,
    RegenerateDeliveryCodeUseCase,
    DeliveryMobileService,
    VehiclePhotoService,
  ],
  exports: [TypeOrmModule],
})
export class DeliveryModule {}
