import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { ScheduleOrderDto } from '../dtos/schedule-order.dto';
import { OrderStatus } from '../enums/order-status.enum';
import { Order } from '../entities/order.entity';
import { OrderAuthorizationService } from '../services/order-authorization.service';
import { SchedulingAvailabilityService } from '../services/scheduling-availability.service';

const SCHEDULABLE_STATUSES = [OrderStatus.PENDING, OrderStatus.CONFIRMED];

@Injectable()
export class ScheduleOrderUseCase {
  constructor(
    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,
    private readonly orderAuthorizationService: OrderAuthorizationService,
    private readonly schedulingAvailability: SchedulingAvailabilityService,
    @InjectDataSource()
    private readonly dataSource: DataSource,
  ) {}

  async execute(orderId: number, dto: ScheduleOrderDto, currentUser: User): Promise<Order> {
    const order = await this.orderRepository.findOne({
      where: { id: orderId },
    });
    if (!order) {
      throw new NotFoundException('Order not found');
    }

    await this.assertCanSchedule(order, currentUser);

    const scheduledDate = new Date(dto.scheduled_delivery_date);
    if (Number.isNaN(scheduledDate.getTime()) || scheduledDate <= new Date()) {
      throw new BadRequestException('scheduled_delivery_date must be in the future');
    }

    return this.dataSource.transaction(async (manager) => {
      const lockedOrder = await manager
        .getRepository(Order)
        .createQueryBuilder('order')
        .setLock('pessimistic_write')
        .where('order.id = :orderId', { orderId })
        .getOne();
      if (!lockedOrder) throw new NotFoundException('Order not found');
      if (!SCHEDULABLE_STATUSES.includes(lockedOrder.status)) {
        throw new BadRequestException('Order can no longer be rescheduled');
      }
      await this.schedulingAvailability.assertAvailable(
        lockedOrder.unit_id,
        scheduledDate,
        manager,
        lockedOrder.id,
      );
      lockedOrder.is_scheduled = true;
      lockedOrder.scheduled_delivery_date = scheduledDate;
      return manager.save(Order, lockedOrder);
    });
  }

  private async assertCanSchedule(order: Order, currentUser: User): Promise<void> {
    if (order.client_id === currentUser.id) {
      return;
    }
    await this.orderAuthorizationService.assertCanManageOrder(order, currentUser);
  }
}
