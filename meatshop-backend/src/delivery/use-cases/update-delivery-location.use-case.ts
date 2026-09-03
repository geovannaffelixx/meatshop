import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { LessThan, Repository } from 'typeorm';
import { DeliveryStatus } from '../../orders/enums/delivery-status.enum';
import { Order } from '../../orders/entities/order.entity';
import { OrderAuthorizationService } from '../../orders/services/order-authorization.service';
import { User } from '../../users/entities/user.entity';
import { UpdateLocationDto } from '../dtos/update-location.dto';
import { DeliveryTracking } from '../entities/delivery-tracking.entity';
import { DeliveryGateway } from '../delivery.gateway';

const TRACKABLE_STATUSES = [DeliveryStatus.PICKUP, DeliveryStatus.ON_THE_WAY];

@Injectable()
export class UpdateDeliveryLocationUseCase {
  constructor(
    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,
    @InjectRepository(DeliveryTracking)
    private readonly trackingRepository: Repository<DeliveryTracking>,
    private readonly orderAuthorizationService: OrderAuthorizationService,
    private readonly deliveryGateway: DeliveryGateway,
  ) {}

  async execute(
    orderId: number,
    dto: UpdateLocationDto,
    currentUser: User,
  ): Promise<DeliveryTracking> {
    const deliveryPerson =
      await this.orderAuthorizationService.getActiveDeliveryPerson(currentUser);

    const order = await this.orderRepository.findOne({
      where: { id: orderId },
    });
    if (!order) {
      throw new NotFoundException('Order not found');
    }
    this.orderAuthorizationService.assertIsAssignedDeliveryPerson(order, deliveryPerson);

    if (!order.delivery_status || !TRACKABLE_STATUSES.includes(order.delivery_status)) {
      throw new BadRequestException('Order is not currently being delivered');
    }

    if (!deliveryPerson.is_online) {
      throw new BadRequestException('Delivery person must be online to share location');
    }

    const latest = await this.trackingRepository.findOne({
      where: { order_id: orderId },
      order: { created_at: 'DESC' },
    });
    if (latest && Date.now() - latest.created_at.getTime() < 5000) {
      throw new BadRequestException('Location updates must be at least 5 seconds apart');
    }

    const tracking = this.trackingRepository.create({
      order_id: orderId,
      latitude: dto.latitude,
      longitude: dto.longitude,
      accuracy: dto.accuracy ?? null,
    });
    const savedTracking = await this.trackingRepository.save(tracking);
    await this.trackingRepository.delete({
      created_at: LessThan(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)),
    });
    this.deliveryGateway.emitLocation(order, savedTracking);
    return savedTracking;
  }
}
