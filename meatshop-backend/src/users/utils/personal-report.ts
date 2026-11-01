import { PayloadTooLargeException } from '@nestjs/common';
import { MAX_REPORT_ROWS, column } from '../../exports/queries/report-query';
import type { ReportSection, UnitReport } from '../../exports/report.types';

const groupNames: Record<string, string> = {
  profile: 'Perfil',
  addresses: 'Endereços',
  orders: 'Compras',
  order_items: 'Itens comprados',
  payments: 'Pagamentos',
  cart: 'Carrinho',
  reviews: 'Avaliações',
  support: 'Chamados',
  support_messages: 'Mensagens de suporte',
  chat_messages: 'Conversas',
  notifications: 'Notificações',
  notification_preferences: 'Preferências de notificação',
  legal_acceptances: 'Aceites legais',
  delivery_profile: 'Perfil de entregador',
  delivery_expenses: 'Despesas de entregador',
  vehicles: 'Veículos',
  unit_memberships: 'Vínculos com unidades',
  delivery_goals: 'Metas de entregador',
  delivery_reviews: 'Avaliações de entregador',
  delivery_receipts: 'Acertos de entregador',
  ai_conversations: 'Conversas com IA',
  ai_messages: 'Mensagens com IA',
};

export function personalReport(
  data: Record<string, unknown>,
  unit: UnitReport['unit'],
): UnitReport {
  const sections = personalReportSections(data);
  return {
    title: 'Meus dados pessoais',
    unit: { id: unit.id, name: unit.name },
    generatedAt: new Date(),
    filters: [
      'Dados pessoais da conta autenticada; inclui vínculos e atividades em outras unidades.',
    ],
    sections,
  };
}

export function personalReportSections(data: Record<string, unknown>): ReportSection[] {
  const sections = Object.entries(data).map(([name, records]) =>
    personalSection(name, records as Record<string, unknown>[]),
  );
  if (sections.reduce((sum, section) => sum + section.rows.length, 0) > MAX_REPORT_ROWS)
    throw new PayloadTooLargeException({
      code: 'EXPORT_TOO_LARGE',
      message: 'Seus dados ultrapassam o limite desta exportação. Entre em contato com o suporte.',
    });
  return sections;
}

function personalSection(name: string, records: Record<string, unknown>[]): ReportSection {
  const columns = [
    { ...column('record', 'Registro'), width: 12 },
    { ...column('field', 'Campo'), width: 28 },
    { ...column('value', 'Valor'), width: 80 },
  ];
  const rows = records.flatMap((record, index) =>
    Object.entries(record).flatMap(([field, value]) => {
      const text =
        value === null ? '' : typeof value === 'object' ? JSON.stringify(value) : String(value);
      const chunks = Math.max(1, Math.ceil(text.length / 30000));
      return Array.from({ length: chunks }, (_, part) => ({
        record: index + 1,
        field: `${field}${part ? ` (continuação ${part + 1})` : ''}`,
        value: value === null ? null : text.slice(part * 30000, (part + 1) * 30000),
      }));
    }),
  );
  return { title: groupNames[name] ?? name, columns, rows };
}
