import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UnitPermission } from '../../common/enums/unit-permission.enum';
import { OrderStatus } from '../../orders/enums/order-status.enum';
import { Order } from '../../orders/entities/order.entity';
import { UnitAuthorizationService } from '../../units/services/unit-authorization.service';
import { User } from '../../users/entities/user.entity';
import { FinanceReportQueryDto } from '../dtos/finance-report-query.dto';
import { normalizeMonthRange } from '../utils/month-range.util';

export type MonthlyRevenueResult = {
  series: { day: number; value: number }[];
  revenueTotal: number;
};

@Injectable()
export class GetMonthlyRevenueUseCase {
  constructor(
    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,
    private readonly unitAuthorizationService: UnitAuthorizationService,
  ) {}

  async execute(query: FinanceReportQueryDto, currentUser: User): Promise<MonthlyRevenueResult> {
    const unitId = await this.unitAuthorizationService.resolveRequiredUnitId(
      currentUser,
      query.unit_id,
      UnitPermission.VIEW_FINANCE,
    );
    return this.forUnit(unitId, query.month);
  }

  async forUnit(unitId: number, month: string): Promise<MonthlyRevenueResult> {
    const { start, end, daysInMonth } = normalizeMonthRange(month);

    const rows = await this.orderRepository
      .createQueryBuilder('o')
      .select(["TO_CHAR(o.order_date, 'DD') AS day", 'SUM(o.total_amount) AS total'])
      .where('o.status = :st', { st: OrderStatus.DELIVERED })
      .andWhere('o.unit_id = :unitId', { unitId })
      .andWhere('o.order_date >= :start AND o.order_date < :end', { start, end })
      .groupBy("TO_CHAR(o.order_date, 'DD')")
      .getRawMany<{ day: string; total: string }>();

    const map = new Map<number, number>();
    for (const r of rows) {
      const d = Number(r.day);
      map.set(d, (map.get(d) ?? 0) + Number(r.total));
    }

    const series = Array.from({ length: daysInMonth }, (_, i) => ({
      day: i + 1,
      value: map.get(i + 1) ?? 0,
    }));

    const revenueTotal = series.reduce((s, r) => s + r.value, 0);

    return { series, revenueTotal };
  }
}
