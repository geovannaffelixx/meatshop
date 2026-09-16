import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Order } from '../../orders/entities/order.entity';
import { OrderStatus } from '../../orders/enums/order-status.enum';
import { PaymentStatus } from '../../orders/enums/payment-status.enum';
import { UnitAuthorizationService } from '../../units/services/unit-authorization.service';
import { User } from '../../users/entities/user.entity';
import { OrdersChartQueryDto } from '../dtos/orders-chart-query.dto';

export type OrdersChartResult = {
  series: { date: string; orderCount: number; revenue: number }[];
  statusBreakdown: Record<OrderStatus, number>;
};

const DEFAULT_DAYS = 7;

@Injectable()
export class GetOrdersChartUseCase {
  constructor(
    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,
    private readonly unitAuthorizationService: UnitAuthorizationService,
  ) {}

  async execute(query: OrdersChartQueryDto, currentUser: User): Promise<OrdersChartResult> {
    const unitId = await this.unitAuthorizationService.resolveRequiredUnitId(
      currentUser,
      query.unit_id,
    );
    return this.forUnit(unitId, query.days ?? DEFAULT_DAYS);
  }

  async forUnit(unitId: number, days: number): Promise<OrdersChartResult> {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    start.setDate(start.getDate() - (days - 1));

    const orders = await this.orderRepository.find({
      where: { unit_id: unitId },
      order: { order_date: 'ASC' },
    });

    const inRange = orders.filter((o) => o.order_date >= start);
    const series = this.buildDailySeries(inRange, start, days);
    const statusBreakdown = this.buildStatusBreakdown(inRange);

    return { series, statusBreakdown };
  }

  private buildDailySeries(
    orders: Order[],
    start: Date,
    days: number,
  ): { date: string; orderCount: number; revenue: number }[] {
    const byDate = new Map<string, { orderCount: number; revenue: number }>();

    orders.forEach((o) => {
      const key = o.order_date.toISOString().slice(0, 10);
      const bucket = byDate.get(key) ?? { orderCount: 0, revenue: 0 };
      bucket.orderCount += 1;
      if (o.payment_status === PaymentStatus.PAID) {
        bucket.revenue += Number(o.total_amount);
      }
      byDate.set(key, bucket);
    });

    return Array.from({ length: days }, (_, i) => {
      const date = new Date(start);
      date.setDate(start.getDate() + i);
      const key = date.toISOString().slice(0, 10);
      const bucket = byDate.get(key) ?? { orderCount: 0, revenue: 0 };
      return { date: key, ...bucket };
    });
  }

  private buildStatusBreakdown(orders: Order[]): Record<OrderStatus, number> {
    const breakdown = Object.fromEntries(
      Object.values(OrderStatus).map((status) => [status, 0]),
    ) as Record<OrderStatus, number>;

    orders.forEach((o) => {
      breakdown[o.status] += 1;
    });

    return breakdown;
  }
}
