import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { User } from '../users/entities/user.entity';
import { OrdersChartQueryDto } from './dtos/orders-chart-query.dto';
import { RankedListQueryDto } from './dtos/ranked-list-query.dto';
import { UnitScopedQueryDto } from './dtos/unit-scoped-query.dto';
import { GetAdminDashboardUseCase } from './use-cases/get-admin-dashboard.use-case';
import { GetCustomerInsightsUseCase } from './use-cases/get-customer-insights.use-case';
import { GetDeliveryPerformanceUseCase } from './use-cases/get-delivery-performance.use-case';
import { GetOrdersChartUseCase } from './use-cases/get-orders-chart.use-case';
import { GetStockAlertsUseCase } from './use-cases/get-stock-alerts.use-case';
import { GetTopProductsUseCase } from './use-cases/get-top-products.use-case';

@ApiTags('Dashboard')
@ApiBearerAuth('access-token')
@Controller('dashboard')
export class DashboardController {
  constructor(
    private readonly getAdminDashboardUseCase: GetAdminDashboardUseCase,
    private readonly getOrdersChartUseCase: GetOrdersChartUseCase,
    private readonly getStockAlertsUseCase: GetStockAlertsUseCase,
    private readonly getTopProductsUseCase: GetTopProductsUseCase,
    private readonly getCustomerInsightsUseCase: GetCustomerInsightsUseCase,
    private readonly getDeliveryPerformanceUseCase: GetDeliveryPerformanceUseCase,
  ) {}

  @ApiOperation({
    summary:
      'Returns the unit dashboard overview with monthly revenue, weekly chart, recent orders, stock alerts, and top-selling products',
  })
  @ApiResponse({
    status: 200,
    description: 'Dashboard data returned successfully',
  })
  @ApiResponse({
    status: 403,
    description: 'User does not manage the specified unit',
  })
  @Get()
  getDashboard(@Query() query: UnitScopedQueryDto, @CurrentUser() currentUser: User) {
    return this.getAdminDashboardUseCase.execute(query, currentUser);
  }

  @ApiOperation({
    summary: 'Returns daily order count and revenue, plus totals by status',
  })
  @ApiResponse({
    status: 200,
    description: 'Order chart returned successfully',
  })
  @ApiResponse({
    status: 403,
    description: 'User does not manage the specified unit',
  })
  @Get('orders-chart')
  getOrdersChart(@Query() query: OrdersChartQueryDto, @CurrentUser() currentUser: User) {
    return this.getOrdersChartUseCase.execute(query, currentUser);
  }

  @ApiOperation({
    summary: 'Lists unit products with stock at or below the configured minimum',
  })
  @ApiResponse({
    status: 200,
    description: 'Stock alerts returned successfully',
  })
  @ApiResponse({
    status: 403,
    description: 'User does not manage the specified unit',
  })
  @Get('stock-alerts')
  getStockAlerts(@Query() query: UnitScopedQueryDto, @CurrentUser() currentUser: User) {
    return this.getStockAlertsUseCase.execute(query, currentUser);
  }

  @ApiOperation({
    summary: 'Ranks the unit top-selling products based on delivered orders',
  })
  @ApiResponse({
    status: 200,
    description: 'Product ranking returned successfully',
  })
  @ApiResponse({
    status: 403,
    description: 'User does not manage the specified unit',
  })
  @Get('top-products')
  getTopProducts(@Query() query: RankedListQueryDto, @CurrentUser() currentUser: User) {
    return this.getTopProductsUseCase.execute(query, currentUser);
  }

  @ApiOperation({
    summary: 'Ranks the unit top customers based on delivered orders',
  })
  @ApiResponse({
    status: 200,
    description: 'Customer ranking returned successfully',
  })
  @ApiResponse({
    status: 403,
    description: 'User does not manage the specified unit',
  })
  @Get('customer-insights')
  getCustomerInsights(@Query() query: RankedListQueryDto, @CurrentUser() currentUser: User) {
    return this.getCustomerInsightsUseCase.execute(query, currentUser);
  }

  @ApiOperation({
    summary:
      'Unit delivery performance metrics including average time, cancellation rate, and deliveries per delivery person',
  })
  @ApiResponse({
    status: 200,
    description: 'Delivery metrics returned successfully',
  })
  @ApiResponse({
    status: 403,
    description: 'User does not manage the specified unit',
  })
  @Get('delivery-performance')
  getDeliveryPerformance(@Query() query: UnitScopedQueryDto, @CurrentUser() currentUser: User) {
    return this.getDeliveryPerformanceUseCase.execute(query, currentUser);
  }
}
