import { BadRequestException, Injectable } from '@nestjs/common';
import { DataSource, EntityManager } from 'typeorm';
import { ExportPersonalDataUseCase } from '../../users/use-cases/export-personal-data.use-case';
import { personalReportSections } from '../../users/utils/personal-report';
import { User } from '../../users/entities/user.entity';
import { ReportDocument, ReportSection } from '../../exports/report.types';
import { DeliveryExportDto, DeliveryReportKind } from './dtos/delivery-export.dto';
import {
  deliveryEarningsReport,
  deliverySettlementsReport,
} from './queries/delivery-earnings.query';
import { deliveryExpensesReport } from './queries/delivery-expenses.query';
import { deliverySupportReport } from './queries/delivery-support.query';
import {
  deliveryEarningsSummary,
  deliveryMoneySummary,
  reportMoneyTotal,
} from './delivery-report-summary';
import { deliveryExportRange } from './delivery-export-range';

const titles: Record<DeliveryReportKind, string> = {
  earnings: 'Meus ganhos',
  history: 'Meu histórico de entregas',
  expenses: 'Minhas despesas',
  financial: 'Meu demonstrativo financeiro',
  settlements: 'Meus acertos recebidos',
  personal: 'Meus dados pessoais',
  support: 'Meus atendimentos',
};

@Injectable()
export class BuildDeliveryReportService {
  constructor(
    private readonly db: DataSource,
    private readonly personal: ExportPersonalDataUseCase,
  ) {}

  async build(filters: DeliveryExportDto, user: User, personId: number): Promise<ReportDocument> {
    this.validate(filters);
    const sections =
      filters.report === 'personal'
        ? personalReportSections((await this.personal.execute(user.id)).data)
        : await this.db.transaction('REPEATABLE READ', (manager) =>
            this.sections(manager, filters, user.id, personId),
          );
    return {
      title: titles[filters.report],
      person: { id: personId, name: user.name ?? 'Entregador' },
      generatedAt: new Date(),
      filters: this.filterLabels(filters),
      sections,
    };
  }

  private async sections(
    manager: EntityManager,
    filters: DeliveryExportDto,
    userId: number,
    personId: number,
  ): Promise<ReportSection[]> {
    if (filters.report === 'support') return deliverySupportReport(manager, userId, filters);
    if (filters.report === 'financial') return this.financial(manager, filters, userId, personId);
    if (filters.report === 'expenses') {
      const expenses = await deliveryExpensesReport(manager, userId, filters);
      return [
        deliveryMoneySummary({ 'Despesas do período': reportMoneyTotal(expenses, 'amount') }),
        expenses,
      ];
    }
    if (filters.report === 'settlements') {
      const paid = await deliverySettlementsReport(manager, personId, filters);
      return [
        deliveryMoneySummary({ 'Recebimentos no período': reportMoneyTotal(paid, 'amount') }),
        paid,
      ];
    }
    const earnings = await deliveryEarningsReport(manager, personId, filters);
    if (filters.report === 'history') earnings.title = 'Histórico de entregas concluídas';
    return [deliveryEarningsSummary(earnings), earnings];
  }

  private async financial(
    manager: EntityManager,
    filters: DeliveryExportDto,
    userId: number,
    personId: number,
  ): Promise<ReportSection[]> {
    const earnings = await deliveryEarningsReport(manager, personId, filters);
    const paid = await deliverySettlementsReport(manager, personId, filters);
    const expenses = await deliveryExpensesReport(manager, userId, filters);
    const received = reportMoneyTotal(paid, 'amount');
    const spent = reportMoneyTotal(expenses, 'amount');
    return [
      deliveryMoneySummary({
        'Ganhos gerados por entregas no período': reportMoneyTotal(earnings, 'amount'),
        'Recebimentos pela data do acerto': received,
        'Saldo a receber das entregas do período': reportMoneyTotal(earnings, 'pending'),
        'Despesas pessoais do período': spent,
        'Resultado de caixa (recebimentos menos despesas)':
          Math.round((received - spent) * 100) / 100,
      }),
      earnings,
      paid,
      expenses,
    ];
  }

  private validate(filters: DeliveryExportDto): void {
    if (filters.report !== 'personal') deliveryExportRange(filters);
    const invalid =
      (filters.payment && !['earnings', 'history'].includes(filters.report)) ||
      (filters.category && filters.report !== 'expenses') ||
      (filters.status && filters.report !== 'support') ||
      (filters.report === 'personal' && (filters.from || filters.to));
    if (invalid)
      throw new BadRequestException({
        code: 'EXPORT_INVALID_FILTERS',
        message: 'Revise os filtros disponíveis para este relatório.',
      });
  }

  private filterLabels(filters: DeliveryExportDto): string[] {
    const labels =
      filters.report === 'personal'
        ? ['Dados pessoais completos da conta autenticada.']
        : [`Período: ${filters.from} a ${filters.to} (dias completos).`];
    if (filters.payment)
      labels.push(
        `Recebimento: ${filters.payment === 'received' ? 'Com recebimento' : filters.payment === 'pending' ? 'Com saldo a receber' : 'Todos'}`,
      );
    if (filters.category) labels.push(`Categoria: ${filters.category}`);
    if (filters.status) labels.push(`Situação: ${filters.status}`);
    return [
      ...labels,
      'Horários: America/Sao_Paulo.',
      ...(filters.report === 'financial'
        ? [
            'Recebimentos pela data do acerto; ganhos pela conclusão da entrega; despesas pela data informada.',
          ]
        : []),
    ];
  }
}
