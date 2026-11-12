import type { EntityManager, Repository } from 'typeorm';
import { jest } from '@jest/globals';
import type { Order } from '../../orders/entities/order.entity';
import type { UnitAuthorizationService } from '../../units/services/unit-authorization.service';
import type { User } from '../../users/entities/user.entity';
import type { Expense } from '../entities/expense.entity';
import { GetFinanceSummaryUseCase } from './get-finance-summary.use-case';
import type { GetMonthlyRevenueUseCase } from './get-monthly-revenue.use-case';

describe('Shared financial summary calculations', () => {
  it('uses the report transaction and includes expenses, delivery payments, refunds and fees', async () => {
    const builder = Object.fromEntries(
      ['leftJoin', 'addSelect', 'where', 'andWhere'].map((method) => [
        method,
        jest.fn().mockReturnThis(),
      ]),
    );
    builder.getRawAndEntities = jest.fn<() => Promise<unknown>>().mockResolvedValue({
      entities: [{ total_amount: 95 }],
      raw: [{ payment_method: 'Pix', refunded_amount: 5, fee_amount: 2 }],
    });
    const orders = {
      createQueryBuilder: () => builder,
      manager: {
        query: jest.fn<() => Promise<unknown>>().mockResolvedValue([{ day: '01', total: '5' }]),
      },
    };
    const expenses = {
      find: jest
        .fn<() => Promise<unknown>>()
        .mockResolvedValue([{ paidAt: '2026-11-01', paidAmount: 20 }]),
    };
    const manager = {
      getRepository: jest.fn().mockReturnValueOnce(expenses).mockReturnValueOnce(orders),
    } as unknown as EntityManager;
    const revenue = {
      forUnit: jest.fn<() => Promise<unknown>>().mockResolvedValue({ revenueTotal: 88 }),
    };
    const access = { resolveRequiredUnitId: async () => 1 };
    const service = new GetFinanceSummaryUseCase(
      {} as Repository<Expense>,
      {} as Repository<Order>,
      access as unknown as UnitAuthorizationService,
      revenue as unknown as GetMonthlyRevenueUseCase,
    );
    const result = await service.execute(
      { unit_id: 1, month: '2026-11' },
      { id: 1 } as User,
      manager,
    );
    expect(result.revenueTotal).toBe(88);
    expect(result.expensesTotal).toBe(25);
    expect(result.expensesByDay[0]).toEqual({ day: 1, value: 25 });
    expect(result.payments).toEqual([{ name: 'Pix', value: 88 }]);
    expect(revenue.forUnit).toHaveBeenCalledWith(1, '2026-11', manager);
    expect(builder.andWhere).toHaveBeenCalledWith('o.unit_id = :unitId', { unitId: 1 });
  });
});
