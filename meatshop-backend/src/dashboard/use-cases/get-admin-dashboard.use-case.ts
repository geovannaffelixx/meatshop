import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { GetMonthlyRevenueUseCase } from '../../finance/use-cases/get-monthly-revenue.use-case';
import { Order } from '../../orders/entities/order.entity';
import { PaymentStatus } from '../../orders/enums/payment-status.enum';
import { UnitAuthorizationService } from '../../units/services/unit-authorization.service';
import { User } from '../../users/entities/user.entity';
import { UnitScopedQueryDto } from '../dtos/unit-scoped-query.dto';
import { GetOrdersChartUseCase, OrdersChartResult } from './get-orders-chart.use-case';
import { GetStockAlertsUseCase } from './get-stock-alerts.use-case';
import { GetTopProductsUseCase, TopProductItem } from './get-top-products.use-case';

export type AdminDashboardResult = {
  revenueThisMonth: number;
  weeklyChart: OrdersChartResult;
  recentOrders: {
    id: number;
    client_name: string;
    status: string;
    value: number;
    order_date: Date;
  }[];
  lowStockCount: number;
  topProducts: TopProductItem[];
};

const RECENT_ORDERS_LIMIT = 20;
const WEEKLY_CHART_DAYS = 7;
const TOP_PRODUCTS_LIMIT = 3;

@Injectable()
export class GetAdminDashboardUseCase {
  constructor(
    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,
    private readonly unitAuthorizationService: UnitAuthorizationService,
    private readonly getOrdersChartUseCase: GetOrdersChartUseCase,
    private readonly getStockAlertsUseCase: GetStockAlertsUseCase,
    private readonly getTopProductsUseCase: GetTopProductsUseCase,
    private readonly getMonthlyRevenueUseCase: GetMonthlyRevenueUseCase,
  ) {}

  async execute(query: UnitScopedQueryDto, currentUser: User): Promise<AdminDashboardResult> {
    const unitId = await this.unitAuthorizationService.resolveRequiredUnitId(
      currentUser,
      query.unit_id,
    );

    const currentMonth = new Date().toISOString().slice(0, 7);

    const [weeklyChart, stockAlerts, topProducts, recentOrders, revenue] = await Promise.all([
      this.getOrdersChartUseCase.forUnit(unitId, WEEKLY_CHART_DAYS),
      this.getStockAlertsUseCase.forUnit(unitId),
      this.getTopProductsUseCase.forUnit(unitId, TOP_PRODUCTS_LIMIT),
      this.getRecentOrders(unitId),
      this.getMonthlyRevenueUseCase.forUnit(unitId, currentMonth),
    ]);

    return {
      revenueThisMonth: revenue.revenueTotal,
      weeklyChart,
      recentOrders,
      lowStockCount: stockAlerts.length,
      topProducts,
    };
  }

  private async getRecentOrders(unitId: number) {
    const orders = await this.orderRepository.find({
      where: { unit_id: unitId },
      relations: ['client'],
      order: { order_date: 'DESC' },
      take: RECENT_ORDERS_LIMIT,
    });

    return orders.map((o) => ({
      id: o.id,
      client_name: o.client?.name,
      status: o.status,
      value: o.payment_status === PaymentStatus.PAID ? Number(o.total_amount) : 0,
      order_date: o.order_date,
    }));
  }
}
