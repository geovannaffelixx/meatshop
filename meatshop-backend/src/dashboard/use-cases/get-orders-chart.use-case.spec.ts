import { jest } from '@jest/globals';
import type { Repository } from 'typeorm';
import { businessDateKey } from '../../finance/utils/month-range.util';
import type { Order } from '../../orders/entities/order.entity';
import { OrderStatus } from '../../orders/enums/order-status.enum';
import { PaymentStatus } from '../../orders/enums/payment-status.enum';
import type { UnitAuthorizationService } from '../../units/services/unit-authorization.service';
import { GetOrdersChartUseCase } from './get-orders-chart.use-case';

describe('GetOrdersChartUseCase', () => {
  it('keeps operational order counts separate from settled-payment revenue', async () => {
    const today = businessDateKey(new Date());
    const orders = [
      {
        order_date: new Date(`${today}T10:00:00-03:00`),
        status: OrderStatus.PENDING,
        payment_status: PaymentStatus.PAID,
        total_amount: 999,
      },
      {
        order_date: new Date(`${today}T11:00:00-03:00`),
        status: OrderStatus.CANCELLED,
        payment_status: PaymentStatus.PENDING,
        total_amount: 500,
      },
    ] as Order[];

    const queryBuilder = {
      innerJoin: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      groupBy: jest.fn().mockReturnThis(),
      getRawMany: jest.fn(async () => [{ day: today, revenue: '75.50' }]),
    };
    const repository = {
      find: jest.fn(async () => orders),
      createQueryBuilder: jest.fn().mockReturnValue(queryBuilder),
    } as unknown as Repository<Order>;
    const useCase = new GetOrdersChartUseCase(repository, {} as UnitAuthorizationService);

    const result = await useCase.forUnit(7, 1);

    expect(result.series).toEqual([{ date: today, orderCount: 2, revenue: 75.5 }]);
    expect(result.statusBreakdown[OrderStatus.PENDING]).toBe(1);
    expect(result.statusBreakdown[OrderStatus.CANCELLED]).toBe(1);
    expect(queryBuilder.andWhere).toHaveBeenCalledWith("p.status IN ('PAID','PARTIALLY_REFUNDED')");
  });
});
