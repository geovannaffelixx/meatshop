import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { GlobalRole } from '../../common/enums/global-role.enum';
import { Order } from '../../orders/entities/order.entity';
import { OrderAuthorizationService } from '../../orders/services/order-authorization.service';
import { User } from '../../users/entities/user.entity';
import { DeliveryTracking } from '../entities/delivery-tracking.entity';

@Injectable()
export class GetDeliveryTrackingUseCase {
  constructor(
    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,
    @InjectRepository(DeliveryTracking)
    private readonly trackingRepository: Repository<DeliveryTracking>,
    private readonly orderAuthorizationService: OrderAuthorizationService,
  ) {}

  async execute(orderId: number, currentUser: User): Promise<DeliveryTracking[]> {
    const order = await this.orderRepository.findOne({ where: { id: orderId } });
    if (!order) {
      throw new NotFoundException('Order not found');
    }

    if (order.client_id !== currentUser.id && currentUser.global_role !== GlobalRole.SUPER_ADMIN) {
      await this.orderAuthorizationService.assertCanManageOrder(order, currentUser);
    }

    return this.trackingRepository.find({
      where: { order_id: orderId },
      order: { created_at: 'DESC' },
      take: 1,
    });
  }
}
