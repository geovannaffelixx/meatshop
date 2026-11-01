export const reportTitles = {
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
  personal: 'Meus dados pessoais',
  audit: 'Auditoria',
};
export type ReportKind = keyof typeof reportTitles;
export type ReportFilters = Record<string, string>;
export type ExportField = {
  key: string;
  label: string;
  type?: string;
  options?: [string, string][];
};
const period: ExportField[] = [
  { key: 'date_from', label: 'Data inicial', type: 'date' },
  { key: 'date_to', label: 'Data final', type: 'date' },
];
const search: ExportField = { key: 'search', label: 'Buscar' };
const active: ExportField = {
  key: 'active',
  label: 'Disponibilidade',
  options: [
    ['', 'Todas'],
    ['true', 'Ativo'],
    ['false', 'Inativo'],
  ],
};
const fields: Record<ReportKind, ExportField[]> = {
  finance: [{ key: 'month', label: 'Competência', type: 'month' }],
  payments: [
    { key: 'month', label: 'Competência', type: 'month' },
    {
      key: 'view',
      label: 'Pagamentos',
      options: [
        ['all', 'Todos'],
        ['pending', 'Pendentes'],
        ['receivable', 'A receber presencialmente'],
        ['refunds', 'Estornos pendentes'],
        ['issues', 'Problemas'],
      ],
    },
  ],
  orders: [
    ...period,
    { key: 'scheduled_from', label: 'Agendamento inicial', type: 'date' },
    { key: 'scheduled_to', label: 'Agendamento final', type: 'date' },
    { key: 'id', label: 'Número do pedido' },
    { ...search, label: 'Cliente' },
    {
      key: 'status',
      label: 'Situação',
      options: [
        ['', 'Todas'],
        ['PENDING', 'Pendente'],
        ['CONFIRMED', 'Confirmado'],
        ['PREPARING', 'Em preparo'],
        ['READY', 'Pronto'],
        ['OUT_FOR_DELIVERY', 'Saiu para entrega'],
        ['DELIVERED', 'Entregue'],
        ['CANCELLED', 'Cancelado'],
      ],
    },
  ],
  catalog: [
    search,
    { key: 'id', label: 'Código do produto' },
    { key: 'category', label: 'Categoria' },
    active,
    {
      key: 'stock',
      label: 'Estoque',
      options: [
        ['all', 'Todos'],
        ['low', 'No mínimo ou abaixo'],
        ['available', 'Com estoque'],
        ['empty', 'Sem estoque'],
      ],
    },
  ],
  performance: [
    ...period,
    search,
    { key: 'id', label: 'Código do produto' },
    { key: 'category', label: 'Categoria' },
    active,
  ],
  coupons: [search, active],
  promotions: [
    search,
    {
      key: 'status',
      label: 'Situação',
      options: [
        ['', 'Todas'],
        ['Ativa', 'Ativa'],
        ['Agendada', 'Agendada'],
        ['Expirada', 'Expirada'],
        ['Inativa', 'Inativa'],
      ],
    },
  ],
  deliveries: [{ ...search, label: 'Nome ou e-mail do entregador' }],
  reviews: [
    ...period,
    {
      key: 'product_id',
      label: 'Avaliações',
      options: [
        ['all', 'Todas'],
        ['unit', 'Da unidade'],
      ],
    },
  ],
  support: [
    ...period,
    search,
    {
      key: 'status',
      label: 'Situação',
      options: [
        ['', 'Todas'],
        ['OPEN', 'Aberto'],
        ['ANSWERED', 'Respondido'],
        ['WAITING_USER', 'Aguardando usuário'],
        ['WAITING_SUPPORT', 'Aguardando suporte'],
        ['CLOSED', 'Fechado'],
      ],
    },
  ],
  audit: [
    ...period,
    search,
    {
      key: 'outcome',
      label: 'Resultado',
      options: [
        ['', 'Todos'],
        ['SUCCESS', 'Sucesso'],
        ['FAILURE', 'Falha'],
      ],
    },
  ],
  personal: [],
};

export function reportFields(kind: ReportKind): ExportField[] {
  return fields[kind];
}
