import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { LocalRole } from '../../common/enums/local-role.enum';
import { UnitPermission } from '../../common/enums/unit-permission.enum';
import { UserUnitStatus } from '../../common/enums/user-unit-status.enum';
import { SendOrderStatusNotificationUseCase } from '../../notifications/use-cases/send-order-status-notification.use-case';
import { Order } from '../../orders/entities/order.entity';
import { DeliveryStatus } from '../../orders/enums/delivery-status.enum';
import { DeliveryStep } from '../../orders/enums/delivery-step.enum';
import { DeliveryType } from '../../orders/enums/delivery-type.enum';
import { OrderStatus } from '../../orders/enums/order-status.enum';
import { DeliveryCodeService } from '../../orders/services/delivery-code.service';
import { UnitAuthorizationService } from '../../units/services/unit-authorization.service';
import { UserUnit } from '../../units/entities/user-unit.entity';
import { User } from '../../users/entities/user.entity';
import { AssignDeliveryPersonDto } from '../dtos/assign-delivery-person.dto';
import { DeliveryPerson } from '../entities/delivery-person.entity';
import { DeliveryPersonStatus } from '../enums/delivery-person-status.enum';
import { DeliveryGateway } from '../delivery.gateway';

@Injectable()
export class AssignDeliveryPersonUseCase {
  constructor(
    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,
    @InjectRepository(DeliveryPerson)
    private readonly deliveryPersonRepository: Repository<DeliveryPerson>,
    @InjectRepository(UserUnit)
    private readonly membershipRepository: Repository<UserUnit>,
    private readonly unitAuthorizationService: UnitAuthorizationService,
    private readonly deliveryCodeService: DeliveryCodeService,
    private readonly notifications: SendOrderStatusNotificationUseCase,
    private readonly deliveryGateway: DeliveryGateway,
  ) {}

  async execute(
    unitId: number,
    orderId: number,
    dto: AssignDeliveryPersonDto,
    currentUser: User,
  ): Promise<Order> {
    await this.unitAuthorizationService.assertHasPermission(
      currentUser,
      unitId,
      UnitPermission.MANAGE_DELIVERIES,
    );

    const order = await this.orderRepository
      .createQueryBuilder('order')
      .addSelect('order.delivery_code_hash')
      .where('order.id = :orderId', { orderId })
      .andWhere('order.unit_id = :unitId', { unitId })
      .getOne();
    if (!order) throw new NotFoundException('Order not found');
    if (order.delivery_type !== DeliveryType.DELIVERY || order.status !== OrderStatus.READY) {
      throw new BadRequestException('Order is not ready for delivery assignment');
    }
    if (order.delivery_person_id) {
      throw new BadRequestException('Order already has a delivery person assigned');
    }

    const deliveryPerson = await this.deliveryPersonRepository.findOne({
      where: {
        id: dto.deliveryPersonId,
        status: DeliveryPersonStatus.ACTIVE,
      },
      relations: { user: true },
    });
    if (!deliveryPerson) throw new NotFoundException('Active delivery person not found');

    const membership = await this.membershipRepository.findOne({
      where: {
        user_id: deliveryPerson.user_id,
        unit_id: unitId,
        local_role: LocalRole.DELIVERY,
        status: UserUnitStatus.ACTIVE,
      },
    });
    if (!membership) {
      throw new BadRequestException('Delivery person is not active in this unit');
    }

    const pickupCode = this.deliveryCodeService.issue(order, 'PICKUP');
    const deliveryCode = order.delivery_code_hash
      ? null
      : this.deliveryCodeService.issue(order, 'DELIVERY');
    const result = await this.orderRepository.update(
      { id: orderId, unit_id: unitId, delivery_person_id: IsNull() },
      {
        delivery_person_id: deliveryPerson.id,
        delivery_status: DeliveryStatus.PICKUP,
        delivery_step: DeliveryStep.PICKUP,
        pickup_code_hash: order.pickup_code_hash,
        pickup_code_expires_at: order.pickup_code_expires_at,
        pickup_code_attempts: 0,
        pickup_code_locked_until: null,
        pickup_verified_at: null,
        ...(deliveryCode
          ? {
              delivery_code_hash: order.delivery_code_hash,
              delivery_code_expires_at: order.delivery_code_expires_at,
              delivery_code_attempts: 0,
              delivery_code_locked_until: null,
              delivery_verified_at: null,
            }
          : {}),
      },
    );
    if (result.affected === 0) {
      throw new BadRequestException('Order already has a delivery person assigned');
    }
    order.delivery_person_id = deliveryPerson.id;
    order.delivery_status = DeliveryStatus.PICKUP;
    order.delivery_step = DeliveryStep.PICKUP;

    await Promise.all([
      this.notifications.notifyDeliveryPersonOfPickupCode(
        order,
        deliveryPerson.user_id,
        pickupCode,
      ),
      this.notifications.notifyUnitOfDeliveryAssignment(
        order,
        deliveryPerson.user?.name ?? 'Entregador',
      ),
      ...(deliveryCode
        ? [this.notifications.notifyCustomerOfDeliveryCode(order, deliveryCode)]
        : []),
    ]);
    this.deliveryGateway.emitDeliveryChanged(order);
    return order;
  }
}
