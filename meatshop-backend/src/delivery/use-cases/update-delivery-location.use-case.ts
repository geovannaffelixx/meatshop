import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
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

    const order = await this.orderRepository.findOne({ where: { id: orderId } });
    if (!order) {
      throw new NotFoundException('Order not found');
    }
    this.orderAuthorizationService.assertIsAssignedDeliveryPerson(order, deliveryPerson);

    if (!order.delivery_status || !TRACKABLE_STATUSES.includes(order.delivery_status)) {
      throw new BadRequestException('Order is not currently being delivered');
    }

    const tracking = this.trackingRepository.create({
      order_id: orderId,
      latitude: dto.latitude,
      longitude: dto.longitude,
    });
    const savedTracking = await this.trackingRepository.save(tracking);
    this.deliveryGateway.emitLocation(order, savedTracking);
    return savedTracking;
  }
}
