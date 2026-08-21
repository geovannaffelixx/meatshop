import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FinanceModule } from '../finance/finance.module';
import { OrderItem } from '../orders/entities/order-item.entity';
import { Order } from '../orders/entities/order.entity';
import { Stock } from '../products/entities/stock.entity';
import { UnitsModule } from '../units/units.module';
import { DashboardController } from './dashboard.controller';
import { GetAdminDashboardUseCase } from './use-cases/get-admin-dashboard.use-case';
import { GetCustomerInsightsUseCase } from './use-cases/get-customer-insights.use-case';
import { GetDeliveryPerformanceUseCase } from './use-cases/get-delivery-performance.use-case';
import { GetOrdersChartUseCase } from './use-cases/get-orders-chart.use-case';
import { GetStockAlertsUseCase } from './use-cases/get-stock-alerts.use-case';
import { GetTopProductsUseCase } from './use-cases/get-top-products.use-case';

@Module({
  imports: [TypeOrmModule.forFeature([Order, OrderItem, Stock]), UnitsModule, FinanceModule],
  controllers: [DashboardController],
  providers: [
    GetAdminDashboardUseCase,
    GetOrdersChartUseCase,
    GetStockAlertsUseCase,
    GetTopProductsUseCase,
    GetCustomerInsightsUseCase,
    GetDeliveryPerformanceUseCase,
  ],
})
export class DashboardModule {}
