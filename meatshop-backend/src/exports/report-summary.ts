import type { ReportKind } from './dtos/export-report.dto';
import type { ReportSection } from './report.types';
import { column } from './queries/report-query';

export function reportSummary(kind: ReportKind, section: ReportSection): ReportSection {
  const metrics: { indicator: string; value: string | number }[] = [
    { indicator: 'Registros exportados', value: section.rows.length },
  ];
  const totals: Partial<Record<ReportKind, Record<string, string>>> = {
    orders: { total: 'Valor total dos pedidos', discount: 'Descontos', fee: 'Fretes' },
    payments: { net: 'Recebimentos líquidos', refunded: 'Estornos', fees: 'Taxas' },
    performance: { gross: 'Venda bruta dos itens (sem frete e sem ratear descontos)' },
    coupons: { uses: 'Utilizações na unidade', discounts: 'Descontos na unidade' },
  };
  for (const [key, label] of Object.entries(totals[kind] ?? {})) {
    const value =
      section.rows.reduce((sum, row) => sum + Math.round(Number(row[key] ?? 0) * 100), 0) / 100;
    metrics.push({
      indicator: label,
      value:
        key === 'uses'
          ? value
          : value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }),
    });
  }
  if (kind === 'reviews' && section.rows.length)
    metrics.push({
      indicator: 'Nota média',
      value: (
        section.rows.reduce((sum, row) => sum + Number(row.rating), 0) / section.rows.length
      ).toFixed(2),
    });
  return {
    title: 'Resumo',
    columns: [column('indicator', 'Indicador'), column('value', 'Resultado')],
    rows: metrics,
  };
}
