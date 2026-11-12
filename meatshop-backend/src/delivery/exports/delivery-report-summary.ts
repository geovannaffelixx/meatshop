import { column as c } from '../../exports/queries/report-query';
import type { ReportSection } from '../../exports/report.types';

export function reportMoneyTotal(section: ReportSection, key: string): number {
  return section.rows.reduce((sum, row) => sum + Math.round(Number(row[key] ?? 0) * 100), 0) / 100;
}

export function deliveryMoneySummary(metrics: Record<string, number>): ReportSection {
  return {
    title: 'Resumo financeiro',
    columns: [c('indicator', 'Indicador'), c('amount', 'Valor', 'money')],
    rows: Object.entries(metrics).map(([indicator, amount]) => ({ indicator, amount })),
  };
}

export function deliveryEarningsSummary(section: ReportSection): ReportSection {
  return deliveryMoneySummary({
    'Ganhos das entregas concluídas no período': reportMoneyTotal(section, 'amount'),
    'Recebido desses pedidos até a emissão': reportMoneyTotal(section, 'received'),
    'Saldo a receber desses pedidos': reportMoneyTotal(section, 'pending'),
  });
}
