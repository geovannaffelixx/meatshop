import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CartModule } from '../cart/cart.module';
import { DeliveryPerson } from '../delivery/entities/delivery-person.entity';
import { NotificationsModule } from '../notifications/notifications.module';
import { PromotionsModule } from '../promotions/promotions.module';
import { ProductsModule } from '../products/products.module';
import { UnitsModule } from '../units/units.module';
import { UsersModule } from '../users/users.module';
import { Order } from './entities/order.entity';
import { OrderItem } from './entities/order-item.entity';
import { OrderStatusHistory } from './entities/order-status-history.entity';
import { Payment } from './entities/payment.entity';
import { OrdersController } from './orders.controller';
import { OrderAuthorizationService } from './services/order-authorization.service';
import { OrderStatusService } from './services/order-status.service';
import { CancelOrderUseCase } from './use-cases/cancel-order.use-case';
import { ConfirmOrderUseCase } from './use-cases/confirm-order.use-case';
import { CreateOrderUseCase } from './use-cases/create-order.use-case';
import { GetOrderUseCase } from './use-cases/get-order.use-case';
import { ListOrderHistoryUseCase } from './use-cases/list-order-history.use-case';
import { RepeatOrderUseCase } from './use-cases/repeat-order.use-case';
import { ScheduleOrderUseCase } from './use-cases/schedule-order.use-case';
import { UpdateOrderStatusUseCase } from './use-cases/update-order-status.use-case';
import { BusinessHoursValidator } from './validators/business-hours.validator';
import { OrderStatusTransitionValidator } from './validators/order-status-transition.validator';
import { StockAvailabilityValidator } from './validators/stock-availability.validator';

@Module({
  imports: [
    TypeOrmModule.forFeature([Order, OrderItem, Payment, OrderStatusHistory, DeliveryPerson]),
    UnitsModule,
    ProductsModule,
    UsersModule,
    PromotionsModule,
    CartModule,
    NotificationsModule,
  ],
  controllers: [OrdersController],
  providers: [
    OrderAuthorizationService,
    OrderStatusService,
    OrderStatusTransitionValidator,
    StockAvailabilityValidator,
    BusinessHoursValidator,
    CreateOrderUseCase,
    GetOrderUseCase,
    ListOrderHistoryUseCase,
    ConfirmOrderUseCase,
    UpdateOrderStatusUseCase,
    CancelOrderUseCase,
    ScheduleOrderUseCase,
    RepeatOrderUseCase,
  ],
  exports: [TypeOrmModule, OrderAuthorizationService, OrderStatusService, ConfirmOrderUseCase],
})
export class OrdersModule {}
