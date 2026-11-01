import { FinanceReportService } from './finance-report.service';
import { Injectable } from '@nestjs/common';
import { DataSource, EntityManager } from 'typeorm';
import { User } from '../users/entities/user.entity';
import { ExportReportDto, ReportKind } from './dtos/export-report.dto';
import { UnitReport, ReportSection } from './report.types';
import { catalogReport, performanceReport } from './queries/catalog-report.query';
import { ordersReport } from './queries/orders-report.query';
import { paymentsReport } from './queries/payments-report.query';
import { couponsReport, promotionsReport } from './queries/marketing-report.query';
import { deliveriesReport, reviewsReport, supportReport } from './queries/service-report.query';
import { validateReportDates } from './queries/report-query';
import { reportSummary } from './report-summary';

export const REPORT_TITLES: Record<ReportKind, string> = {
  finance: 'Financeiro',
  payments: 'Pagamentos',
  orders: 'Pedidos',
  deliveries: 'Entregadores',
  catalog: 'Catálogo e estoque',
  performance: 'Desempenho por produto',
  coupons: 'Cupons',
  promotions: 'Promoções',
  support: 'Atendimento',
  reviews: 'Avaliações',
};

@Injectable()
export class BuildUnitReportUseCase {
  constructor(
    private readonly db: DataSource,
    private readonly finance: FinanceReportService,
  ) {}

  async execute(
    filters: ExportReportDto,
    user: User,
    unit: UnitReport['unit'],
  ): Promise<UnitReport> {
    validateReportDates(filters);
    const sections =
      filters.report === 'finance'
        ? await this.finance.build(filters, user)
        : await this.db.transaction('REPEATABLE READ', async (manager) => {
            const detail = await this.detail(manager, filters);
            return [reportSummary(filters.report, detail), detail];
          });
    return {
      title: REPORT_TITLES[filters.report],
      unit: { id: unit.id, name: unit.name },
      generatedAt: new Date(),
      filters: this.filterLabels(filters),
      sections,
    };
  }

  private detail(manager: EntityManager, filters: ExportReportDto): Promise<ReportSection> {
    const builders = {
      orders: ordersReport,
      catalog: catalogReport,
      performance: performanceReport,
      payments: paymentsReport,
      coupons: couponsReport,
      promotions: promotionsReport,
      support: supportReport,
      reviews: reviewsReport,
      deliveries: deliveriesReport,
    };
    return builders[filters.report as keyof typeof builders](manager, filters);
  }

  private filterLabels(filters: ExportReportDto): string[] {
    const labels: Record<string, string> = {
      month: 'Mês',
      date_from: 'Data inicial',
      date_to: 'Data final',
      scheduled_from: 'Agendamento inicial',
      scheduled_to: 'Agendamento final',
      search: 'Busca',
      status: 'Situação',
      category: 'Categoria',
      id: 'Código',
      active: 'Ativo',
      view: 'Visão de pagamentos',
      product_id: 'Avaliado',
      stock: 'Estoque',
    };
    const values = Object.entries(filters).filter(
      ([key, value]) => labels[key] && value !== undefined && value !== '',
    );
    return [
      ...values.map(([key, value]) => `${labels[key]}: ${value}`),
      'Horários: America/Sao_Paulo',
      ...(filters.report === 'performance'
        ? [
            'Pedidos entregues e com pagamento recebido; valor bruto dos itens, sem frete e sem rateio de descontos.',
          ]
        : []),
    ];
  }
}
