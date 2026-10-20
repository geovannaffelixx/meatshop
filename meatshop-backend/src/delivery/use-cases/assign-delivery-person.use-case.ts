import { Injectable } from '@nestjs/common';
import { UnitPermission } from '../../common/enums/unit-permission.enum';
import { SendOrderStatusNotificationUseCase } from '../../notifications/use-cases/send-order-status-notification.use-case';
import { UnitAuthorizationService } from '../../units/services/unit-authorization.service';
import { User } from '../../users/entities/user.entity';
import { AssignDeliveryPersonDto } from '../dtos/assign-delivery-person.dto';
import { DeliveryGateway } from '../delivery.gateway';
import { DeliveryAssignmentService } from '../services/delivery-assignment.service';

@Injectable()
export class AssignDeliveryPersonUseCase {
  constructor(
    private readonly authorization: UnitAuthorizationService,
    private readonly assignment: DeliveryAssignmentService,
    private readonly notifications: SendOrderStatusNotificationUseCase,
    private readonly gateway: DeliveryGateway,
  ) {}

  async execute(unitId: number, orderId: number, dto: AssignDeliveryPersonDto, currentUser: User) {
    await this.authorization.assertHasPermission(
      currentUser,
      unitId,
      UnitPermission.MANAGE_DELIVERIES,
    );
    const { order, pickupCode, deliveryCode, user } = await this.assignment.assign(
      orderId,
      dto.deliveryPersonId,
      unitId,
    );
    await Promise.allSettled([
      this.notifications.notifyDeliveryPersonOfPickupCode(order, user.id, pickupCode),
      this.notifications.notifyUnitOfDeliveryAssignment(order, user.name ?? 'Entregador'),
      ...(deliveryCode
        ? [this.notifications.notifyCustomerOfDeliveryCode(order, deliveryCode)]
        : []),
    ]);
    this.gateway.emitDeliveryChanged(order);
    return order;
  }
}
