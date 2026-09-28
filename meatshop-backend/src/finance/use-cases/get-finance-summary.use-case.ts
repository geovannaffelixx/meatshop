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
    const { year, month, start, end } = normalizeMonthRange(query.month);
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
    const [deliveryCosts] = await this.orderRepository.manager.query(
      'SELECT COALESCE(SUM(s.amount),0) AS total FROM delivery_settlements s JOIN orders o ON o.id=s.order_id WHERE o.unit_id=$1 AND s.paid_at >= $2 AND s.paid_at < $3',
      [unitId, start, end],
    );
    const expensesTotal =
      expenses.reduce((s, e) => s + Number(e.paidAmount ?? 0), 0) + Number(deliveryCosts.total);

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

    return { revenueTotal, expensesTotal, payments };
  }
}
