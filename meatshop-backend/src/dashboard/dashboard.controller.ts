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
      'Retorna a visão geral do dashboard de uma unidade (receita do mês, gráfico semanal, pedidos recentes, alertas de estoque e produtos mais vendidos)',
  })
  @ApiResponse({ status: 200, description: 'Dados do dashboard retornados com sucesso' })
  @ApiResponse({ status: 403, description: 'Usuário não administra a unidade informada' })
  @Get()
  getDashboard(@Query() query: UnitScopedQueryDto, @CurrentUser() currentUser: User) {
    return this.getAdminDashboardUseCase.execute(query, currentUser);
  }

  @ApiOperation({
    summary: 'Retorna o número de pedidos e a receita por dia, além da contagem por status',
  })
  @ApiResponse({ status: 200, description: 'Gráfico de pedidos retornado com sucesso' })
  @ApiResponse({ status: 403, description: 'Usuário não administra a unidade informada' })
  @Get('orders-chart')
  getOrdersChart(@Query() query: OrdersChartQueryDto, @CurrentUser() currentUser: User) {
    return this.getOrdersChartUseCase.execute(query, currentUser);
  }

  @ApiOperation({
    summary: 'Lista os produtos da unidade com estoque igual ou abaixo do mínimo definido',
  })
  @ApiResponse({ status: 200, description: 'Alertas de estoque retornados com sucesso' })
  @ApiResponse({ status: 403, description: 'Usuário não administra a unidade informada' })
  @Get('stock-alerts')
  getStockAlerts(@Query() query: UnitScopedQueryDto, @CurrentUser() currentUser: User) {
    return this.getStockAlertsUseCase.execute(query, currentUser);
  }

  @ApiOperation({
    summary: 'Ranking dos produtos mais vendidos da unidade (com base em pedidos entregues)',
  })
  @ApiResponse({ status: 200, description: 'Ranking de produtos retornado com sucesso' })
  @ApiResponse({ status: 403, description: 'Usuário não administra a unidade informada' })
  @Get('top-products')
  getTopProducts(@Query() query: RankedListQueryDto, @CurrentUser() currentUser: User) {
    return this.getTopProductsUseCase.execute(query, currentUser);
  }

  @ApiOperation({
    summary: 'Ranking dos clientes que mais compraram na unidade (com base em pedidos entregues)',
  })
  @ApiResponse({ status: 200, description: 'Ranking de clientes retornado com sucesso' })
  @ApiResponse({ status: 403, description: 'Usuário não administra a unidade informada' })
  @Get('customer-insights')
  getCustomerInsights(@Query() query: RankedListQueryDto, @CurrentUser() currentUser: User) {
    return this.getCustomerInsightsUseCase.execute(query, currentUser);
  }

  @ApiOperation({
    summary:
      'Indicadores de performance de entrega da unidade (tempo médio, taxa de cancelamento e entregas por entregador)',
  })
  @ApiResponse({ status: 200, description: 'Indicadores de entrega retornados com sucesso' })
  @ApiResponse({ status: 403, description: 'Usuário não administra a unidade informada' })
  @Get('delivery-performance')
  getDeliveryPerformance(@Query() query: UnitScopedQueryDto, @CurrentUser() currentUser: User) {
    return this.getDeliveryPerformanceUseCase.execute(query, currentUser);
  }
}
