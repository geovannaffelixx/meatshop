import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThanOrEqual } from 'typeorm';
import { Order } from '../../orders/entities/order.entity';
import { OrderStatus } from '../../orders/enums/order-status.enum';
import { PaymentStatus } from '../../orders/enums/payment-status.enum';
import { UnitAuthorizationService } from '../../units/services/unit-authorization.service';
import { User } from '../../users/entities/user.entity';
import { OrdersChartQueryDto } from '../dtos/orders-chart-query.dto';
import { businessDateKey, businessMidnight } from '../../finance/utils/month-range.util';

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
    const calendar = new Date(`${businessDateKey(new Date())}T00:00:00Z`);
    calendar.setUTCDate(calendar.getUTCDate() - (days - 1));
    const start = businessMidnight(calendar);

    const orders = await this.orderRepository.find({
      where: { unit_id: unitId, order_date: MoreThanOrEqual(start) },
      order: { order_date: 'ASC' },
    });

    const inRange = orders.filter((o) => o.order_date >= start);
    const series = this.buildDailySeries(inRange, start, days);
    const receipts = await this.orderRepository
      .createQueryBuilder('o')
      .innerJoin('payments', 'p', 'p.order_id=o.id')
      .select([
        "TO_CHAR(p.payment_date AT TIME ZONE 'America/Sao_Paulo','YYYY-MM-DD') AS day",
        'SUM(GREATEST(0,o.total_amount-p.refunded_amount-p.fee_amount)) AS revenue',
      ])
      .where('o.unit_id=:unitId', { unitId })
      .andWhere("p.status IN ('PAID','PARTIALLY_REFUNDED')")
      .andWhere('p.payment_date>=:start', { start })
      .groupBy("TO_CHAR(p.payment_date AT TIME ZONE 'America/Sao_Paulo','YYYY-MM-DD')")
      .getRawMany();
    for (const point of series)
      point.revenue = Number(receipts.find((r) => r.day === point.date)?.revenue ?? 0);
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
      const key = businessDateKey(o.order_date);
      const bucket = byDate.get(key) ?? { orderCount: 0, revenue: 0 };
      bucket.orderCount += 1;
      if (o.payment_status === PaymentStatus.PAID) {
        bucket.revenue += Number(o.total_amount);
      }
      byDate.set(key, bucket);
    });

    return Array.from({ length: days }, (_, i) => {
      const date = new Date(`${businessDateKey(start)}T00:00:00Z`);
      date.setUTCDate(date.getUTCDate() + i);
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
