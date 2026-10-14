import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Like, Repository } from 'typeorm';
import { UnitPermission } from '../../common/enums/unit-permission.enum';
import { Order } from '../../orders/entities/order.entity';
import { UnitAuthorizationService } from '../../units/services/unit-authorization.service';
import { User } from '../../users/entities/user.entity';
import { FinanceReportQueryDto } from '../dtos/finance-report-query.dto';
import { Expense } from '../entities/expense.entity';
import { normalizeMonthRange } from '../utils/month-range.util';
import { GetMonthlyRevenueUseCase } from './get-monthly-revenue.use-case';

export type FinanceSummaryResult = {
  revenueTotal: number;
  expensesTotal: number;
  payments: { name: string; value: number }[];
  expensesByDay: { day: number; value: number }[];
};

@Injectable()
export class GetFinanceSummaryUseCase {
  constructor(
    @InjectRepository(Expense)
    private readonly expenseRepository: Repository<Expense>,
    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,
    private readonly unitAuthorizationService: UnitAuthorizationService,
    private readonly getMonthlyRevenueUseCase: GetMonthlyRevenueUseCase,
  ) {}

  async execute(query: FinanceReportQueryDto, currentUser: User): Promise<FinanceSummaryResult> {
    const unitId = await this.unitAuthorizationService.resolveRequiredUnitId(
      currentUser,
      query.unit_id,
      UnitPermission.VIEW_FINANCE,
    );
    const { year, month, start, end, daysInMonth } = normalizeMonthRange(query.month);
    const mm = String(month).padStart(2, '0');

    const expenses = await this.expenseRepository.find({
      where: [
        { unit_id: unitId, paidAt: Like(`${year}-${mm}-%`) },
        {
          unit_id: unitId,
          paidAt: IsNull(),
          postedAt: Like(`${year}-${mm}-%`),
        },
      ],
    });
    const deliveryCosts: { day: string; total: string }[] =
      await this.orderRepository.manager.query(
        "SELECT TO_CHAR(s.paid_at AT TIME ZONE 'America/Sao_Paulo','DD') AS day,SUM(s.amount) AS total FROM delivery_settlements s JOIN orders o ON o.id=s.order_id WHERE o.unit_id=$1 AND s.paid_at >= $2 AND s.paid_at < $3 GROUP BY 1",
        [unitId, start, end],
      );
    const byDay = new Map<number, number>();
    for (const e of expenses) {
      const day = Number(String(e.paidAt ?? e.postedAt).slice(8, 10));
      byDay.set(day, (byDay.get(day) ?? 0) + Number(e.paidAmount ?? 0));
    }
    for (const r of deliveryCosts)
      byDay.set(Number(r.day), (byDay.get(Number(r.day)) ?? 0) + Number(r.total));
    const expensesByDay = Array.from({ length: daysInMonth }, (_, i) => ({
      day: i + 1,
      value: byDay.get(i + 1) ?? 0,
    }));
    const expensesTotal = expensesByDay.reduce((sum, p) => sum + p.value, 0);

    const { entities: orders, raw } = await this.orderRepository
      .createQueryBuilder('o')
      .leftJoin('payments', 'p', 'p.order_id = o.id')
      .addSelect('p.method', 'payment_method')
      .addSelect('p.refunded_amount', 'refunded_amount')
      .addSelect('p.fee_amount', 'fee_amount')
      .where("p.status IN ('PAID','PARTIALLY_REFUNDED')")
      .andWhere('o.unit_id = :unitId', { unitId })
      .andWhere('p.payment_date >= :start AND p.payment_date < :end', {
        start,
        end,
      })
      .getRawAndEntities();

    const paymentsMap = new Map<string, number>();
    orders.forEach((o, i) => {
      const key = raw[i]?.payment_method ?? 'Other';
      paymentsMap.set(
        key,
        (paymentsMap.get(key) ?? 0) +
          Math.max(
            0,
            Number(o.total_amount ?? 0) -
              Number(raw[i]?.refunded_amount ?? 0) -
              Number(raw[i]?.fee_amount ?? 0),
          ),
      );
    });

    const payments = Array.from(paymentsMap.entries()).map(([name, value]) => ({
      name,
      value,
    }));
    const { revenueTotal } = await this.getMonthlyRevenueUseCase.forUnit(unitId, query.month);

    return { revenueTotal, expensesTotal, payments, expensesByDay };
  }
}
