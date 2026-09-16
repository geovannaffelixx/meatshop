import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UnitPermission } from '../../common/enums/unit-permission.enum';
import { Order } from '../../orders/entities/order.entity';
import { DeliveryStatus } from '../../orders/enums/delivery-status.enum';
import { OrderStatus } from '../../orders/enums/order-status.enum';
import { DeliveryCodeService } from '../../orders/services/delivery-code.service';
import { UnitAuthorizationService } from '../../units/services/unit-authorization.service';
import { User } from '../../users/entities/user.entity';
import { DeliveryGateway } from '../delivery.gateway';

@Injectable()
export class UnassignDeliveryPersonUseCase {
  constructor(
    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,
    private readonly unitAuthorizationService: UnitAuthorizationService,
    private readonly deliveryCodeService: DeliveryCodeService,
    private readonly deliveryGateway: DeliveryGateway,
  ) {}

  async execute(unitId: number, orderId: number, currentUser: User): Promise<Order> {
    await this.unitAuthorizationService.assertHasPermission(
      currentUser,
      unitId,
      UnitPermission.MANAGE_DELIVERIES,
    );
    const order = await this.orderRepository
      .createQueryBuilder('order')
      .addSelect('order.pickup_code_hash')
      .where('order.id = :orderId AND order.unit_id = :unitId', {
        orderId,
        unitId,
      })
      .getOne();
    if (!order) throw new NotFoundException('Order not found');
    if (order.status !== OrderStatus.READY || order.pickup_verified_at) {
      throw new BadRequestException('Delivery person cannot be changed after pickup verification');
    }

    order.delivery_person_id = null;
    order.delivery_status = DeliveryStatus.WAITING_DELIVERY_PERSON;
    order.delivery_step = null;
    this.deliveryCodeService.clearPickup(order);
    const savedOrder = await this.orderRepository.save(order);
    this.deliveryGateway.emitDeliveryChanged(savedOrder);
    return savedOrder;
  }
}
