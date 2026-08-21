import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Like, Repository } from 'typeorm';
import { Order } from '../../orders/entities/order.entity';
import { OrderStatus } from '../../orders/enums/order-status.enum';
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
    );
    const { year, month, start, end } = normalizeMonthRange(query.month);
    const mm = String(month).padStart(2, '0');

    const expenses = await this.expenseRepository.find({
      where: [
        { unit_id: unitId, paidAt: Like(`${year}-${mm}-%`) },
        { unit_id: unitId, paidAt: IsNull(), postedAt: Like(`${year}-${mm}-%`) },
      ],
    });
    const expensesTotal = expenses.reduce((s, e) => s + Number(e.paidAmount ?? 0), 0);

    const { entities: orders, raw } = await this.orderRepository
      .createQueryBuilder('o')
      .leftJoin('payments', 'p', 'p.order_id = o.id')
      .addSelect('p.method', 'payment_method')
      .where('o.status = :st', { st: OrderStatus.DELIVERED })
      .andWhere('o.unit_id = :unitId', { unitId })
      .andWhere('o.order_date >= :start AND o.order_date < :end', { start, end })
      .getRawAndEntities();

    const paymentsMap = new Map<string, number>();
    orders.forEach((o, i) => {
      const key = raw[i]?.payment_method ?? 'Outros';
      paymentsMap.set(key, (paymentsMap.get(key) ?? 0) + Number(o.total_amount ?? 0));
    });

    const payments = Array.from(paymentsMap.entries()).map(([name, value]) => ({ name, value }));
    const { revenueTotal } = await this.getMonthlyRevenueUseCase.forUnit(unitId, query.month);

    return { revenueTotal, expensesTotal, payments };
  }
}
