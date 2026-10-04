import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { MoreThanOrEqual, Repository } from 'typeorm';
import { Order } from '../../orders/entities/order.entity';
import { UnitAuthorizationService } from '../../units/services/unit-authorization.service';
import { User } from '../../users/entities/user.entity';
import { DeliveryTracking } from '../entities/delivery-tracking.entity';
import { DeliveryPerson } from '../entities/delivery-person.entity';
import { assertTrackingAccess, isTrackable } from '../services/tracking-policy';

@Injectable()
export class GetDeliveryTrackingUseCase {
  constructor(
    @InjectRepository(Order) private readonly orders: Repository<Order>,
    @InjectRepository(DeliveryTracking) private readonly tracking: Repository<DeliveryTracking>,
    @InjectRepository(DeliveryPerson) private readonly people: Repository<DeliveryPerson>,
    private readonly units: UnitAuthorizationService,
  ) {}

  async execute(orderId: number, user: User): Promise<DeliveryTracking[]> {
    const order = await this.orders.findOne({ where: { id: orderId } });
    if (!order) throw new NotFoundException('Order not found');
    await assertTrackingAccess(order, user, this.people, this.units);
    if (!isTrackable(order) || order.tracking_revoked_at || !order.tracking_consent_at) return [];
    const sender = await this.people.findOne({ where: { id: order.delivery_person_id! } });
    if (!sender?.is_online || sender.status !== 'ACTIVE') return [];
    return this.tracking.find({
      where: {
        order_id: orderId,
        delivery_person_id: order.delivery_person_id!,
        created_at: MoreThanOrEqual(order.tracking_consent_at),
      },
      order: { created_at: 'DESC', id: 'DESC' },
      take: 1,
    });
  }
}
