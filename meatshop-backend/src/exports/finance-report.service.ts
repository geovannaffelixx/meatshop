import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { GetFinanceSummaryUseCase } from '../finance/use-cases/get-finance-summary.use-case';
import { GetMonthlyRevenueUseCase } from '../finance/use-cases/get-monthly-revenue.use-case';
import { User } from '../users/entities/user.entity';
import { ExportReportDto } from './dtos/export-report.dto';
import { ReportSection } from './report.types';
import { financeDetails } from './queries/finance-report.query';
import { column } from './queries/report-query';

@Injectable()
export class FinanceReportService {
  constructor(
    private readonly db: DataSource,
    private readonly summary: GetFinanceSummaryUseCase,
    private readonly revenue: GetMonthlyRevenueUseCase,
  ) {}

  async build(filters: ExportReportDto, user: User): Promise<ReportSection[]> {
    return this.db.transaction('REPEATABLE READ', async (manager) => {
      const summary = await this.summary.execute(
        { unit_id: filters.unit_id, month: filters.month! },
        user,
        manager,
      );
      const revenue = await this.revenue.forUnit(filters.unit_id, filters.month!, manager);
      const details = await financeDetails(manager, filters);
      return [
        this.summarySection(summary.revenueTotal, summary.expensesTotal),
        {
          title: 'Recebimentos por dia',
          columns: [column('day', 'Dia'), column('value', 'Líquido recebido', 'money')],
          rows: revenue.series,
        },
        {
          title: 'Formas de pagamento',
          columns: [column('name', 'Forma'), column('value', 'Líquido recebido', 'money')],
          rows: summary.payments,
        },
        ...details,
      ];
    });
  }

  private summarySection(revenue: number, expenses: number): ReportSection {
    return {
      title: 'Resumo',
      columns: [column('indicator', 'Indicador'), column('value', 'Valor', 'money')],
      rows: [
        { indicator: 'Recebimentos líquidos', value: revenue },
        { indicator: 'Despesas e repasses', value: expenses },
        { indicator: 'Resultado do mês', value: Math.round((revenue - expenses) * 100) / 100 },
      ],
    };
  }
}
