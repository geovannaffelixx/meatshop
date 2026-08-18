import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { ScheduleOrderDto } from '../dtos/schedule-order.dto';
import { OrderStatus } from '../enums/order-status.enum';
import { Order } from '../entities/order.entity';
import { OrderAuthorizationService } from '../services/order-authorization.service';
import { BusinessHoursValidator } from '../validators/business-hours.validator';

const SCHEDULABLE_STATUSES = [OrderStatus.PENDING, OrderStatus.CONFIRMED];

@Injectable()
export class ScheduleOrderUseCase {
  constructor(
    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,
    private readonly orderAuthorizationService: OrderAuthorizationService,
    private readonly businessHoursValidator: BusinessHoursValidator,
  ) {}

  async execute(orderId: number, dto: ScheduleOrderDto, currentUser: User): Promise<Order> {
    const order = await this.orderRepository.findOne({ where: { id: orderId } });
    if (!order) {
      throw new NotFoundException('Order not found');
    }

    await this.assertCanSchedule(order, currentUser);

    if (!SCHEDULABLE_STATUSES.includes(order.status)) {
      throw new BadRequestException('Order can no longer be rescheduled');
    }

    const scheduledDate = new Date(dto.scheduled_delivery_date);
    if (scheduledDate <= new Date()) {
      throw new BadRequestException('scheduled_delivery_date must be in the future');
    }

    await this.businessHoursValidator.assertWithinBusinessHours(order.unit_id, scheduledDate);

    order.is_scheduled = true;
    order.scheduled_delivery_date = scheduledDate;
    return this.orderRepository.save(order);
  }

  private async assertCanSchedule(order: Order, currentUser: User): Promise<void> {
    if (order.client_id === currentUser.id) {
      return;
    }
    await this.orderAuthorizationService.assertCanManageOrder(order, currentUser);
  }
}
