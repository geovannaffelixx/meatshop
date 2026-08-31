import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UnitPermission } from '../../common/enums/unit-permission.enum';
import { Order } from '../../orders/entities/order.entity';
import { DeliveryStatus } from '../../orders/enums/delivery-status.enum';
import { DeliveryStep } from '../../orders/enums/delivery-step.enum';
import { OrderStatus } from '../../orders/enums/order-status.enum';
import { DeliveryCodeService } from '../../orders/services/delivery-code.service';
import { OrderStatusService } from '../../orders/services/order-status.service';
import { UnitAuthorizationService } from '../../units/services/unit-authorization.service';
import { User } from '../../users/entities/user.entity';
import { VerifyDeliveryCodeDto } from '../dtos/verify-delivery-code.dto';
import { DeliveryGateway } from '../delivery.gateway';

@Injectable()
export class VerifyPickupCodeUseCase {
  constructor(
    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,
    private readonly unitAuthorizationService: UnitAuthorizationService,
    private readonly deliveryCodeService: DeliveryCodeService,
    private readonly orderStatusService: OrderStatusService,
    private readonly deliveryGateway: DeliveryGateway,
  ) {}

  async execute(
    unitId: number,
    orderId: number,
    dto: VerifyDeliveryCodeDto,
    currentUser: User,
  ): Promise<Order> {
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
    if (
      order.status !== OrderStatus.READY ||
      order.delivery_status !== DeliveryStatus.PICKUP ||
      !order.delivery_person_id
    ) {
      throw new BadRequestException('Order is not waiting for pickup verification');
    }

    await this.deliveryCodeService.verify(order, 'PICKUP', dto.code);
    order.delivery_status = DeliveryStatus.ON_THE_WAY;
    order.delivery_step = DeliveryStep.DELIVERING;
    const savedOrder = await this.orderStatusService.transition(
      order,
      OrderStatus.OUT_FOR_DELIVERY,
      currentUser.id,
    );
    this.deliveryGateway.emitDeliveryChanged(savedOrder);
    return savedOrder;
  }
}
