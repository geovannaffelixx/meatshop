import { reportLabel } from './report-labels';

export type ReportCell = string | number | Date | null;
export type ReportColumn = {
  key: string;
  label: string;
  kind?: 'money' | 'number' | 'date' | 'label';
  width?: number;
};
export type ReportSection = {
  title: string;
  columns: ReportColumn[];
  rows: Record<string, ReportCell>[];
};
export type UnitReport = {
  title: string;
  unit: { id: number; name: string };
  generatedAt: Date;
  filters: string[];
  sections: ReportSection[];
};

export type ReportDocument = Omit<UnitReport, 'unit'> & {
  unit?: UnitReport['unit'];
  person?: { id: number; name: string };
};

export function reportIdentity(report: ReportDocument): string {
  if (report.person) return `Entregador: ${report.person.name} (#${report.person.id})`;
  return report.unit ? `Unidade: ${report.unit.name} (#${report.unit.id})` : 'MeatShop';
}

export function displayCell(value: ReportCell, kind?: ReportColumn['kind']): string {
  if (value === null || value === undefined) return '—';
  if (kind === 'label') return reportLabel(String(value));
  if (kind === 'money')
    return Number(value).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  if (kind === 'number') return Number(value).toLocaleString('pt-BR', { maximumFractionDigits: 3 });
  if (kind === 'date')
    return new Date(value).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });
  return String(value);
}
