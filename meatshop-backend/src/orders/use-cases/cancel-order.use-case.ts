import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { CouponRedemptionService } from '../../promotions/services/coupon-redemption.service';
import { Stock } from '../../products/entities/stock.entity';
import { User } from '../../users/entities/user.entity';
import { CancelOrderDto } from '../dtos/cancel-order.dto';
import { CancelledBy } from '../enums/cancelled-by.enum';
import { OrderStatus } from '../enums/order-status.enum';
import { Order } from '../entities/order.entity';
import { OrderItem } from '../entities/order-item.entity';
import { OrderAuthorizationService } from '../services/order-authorization.service';
import { OrderStatusService } from '../services/order-status.service';

const TERMINAL_STATUSES = [OrderStatus.DELIVERED, OrderStatus.CANCELLED];

@Injectable()
export class CancelOrderUseCase {
  constructor(
    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,
    @InjectRepository(OrderItem)
    private readonly orderItemRepository: Repository<OrderItem>,
    @InjectRepository(Stock)
    private readonly stockRepository: Repository<Stock>,
    private readonly orderAuthorizationService: OrderAuthorizationService,
    private readonly orderStatusService: OrderStatusService,
    private readonly dataSource: DataSource,
    private readonly couponRedemption: CouponRedemptionService,
  ) {}

  async execute(orderId: number, dto: CancelOrderDto, currentUser: User): Promise<Order> {
    const order = await this.orderRepository.findOne({ where: { id: orderId } });
    if (!order) {
      throw new NotFoundException('Order not found');
    }

    if (TERMINAL_STATUSES.includes(order.status)) {
      throw new BadRequestException('Order can no longer be cancelled');
    }

    const cancelledBy = await this.resolveCancelledBy(order, currentUser);
    await this.restoreStock(orderId);

    order.cancellation_reason = dto.reason;
    order.cancelled_at = new Date();
    order.cancelled_by = cancelledBy;

    const cancelled = await this.orderStatusService.transition(
      order,
      OrderStatus.CANCELLED,
      currentUser.id,
    );
    await this.dataSource.transaction((manager) =>
      this.couponRedemption.releaseOrder(orderId, manager),
    );
    return cancelled;
  }

  private async resolveCancelledBy(order: Order, currentUser: User): Promise<CancelledBy> {
    if (order.client_id === currentUser.id) {
      return CancelledBy.CLIENT;
    }
    await this.orderAuthorizationService.assertCanManageOrder(order, currentUser);
    return CancelledBy.UNIT;
  }

  private async restoreStock(orderId: number): Promise<void> {
    const items = await this.orderItemRepository.find({ where: { order_id: orderId } });
    for (const item of items) {
      await this.stockRepository.increment(
        { product_id: item.product_id },
        'quantity',
        item.quantity,
      );
    }
  }
}
