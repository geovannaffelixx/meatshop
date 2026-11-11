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
  placeholder?: string;
  options?: [string, string][];
};
const period: ExportField[] = [
  { key: 'date_from', label: 'Data inicial', type: 'date', placeholder: 'Ex.: 01/11/2026' },
  { key: 'date_to', label: 'Data final', type: 'date', placeholder: 'Ex.: 30/11/2026' },
];
const search: ExportField = { key: 'search', label: 'Buscar' };
const month: ExportField = {
  key: 'month',
  label: 'Competência',
  type: 'month',
  placeholder: 'Ex.: novembro de 2026',
};
const productSearch: ExportField = { ...search, placeholder: 'Ex.: Picanha bovina' };
const productCode: ExportField = { key: 'id', label: 'Código do produto', placeholder: 'Ex.: 123' };
const category: ExportField = { key: 'category', label: 'Categoria', placeholder: 'Ex.: Cortes bovinos' };
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
  finance: [month],
  payments: [
    month,
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
    {
      key: 'scheduled_from', label: 'Agendamento inicial', type: 'date',
      placeholder: 'Ex.: 01/11/2026',
    },
    {
      key: 'scheduled_to', label: 'Agendamento final', type: 'date',
      placeholder: 'Ex.: 30/11/2026',
    },
    { key: 'id', label: 'Número do pedido', placeholder: 'Ex.: 1024' },
    { ...search, label: 'Cliente', placeholder: 'Ex.: Maria da Silva' },
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
    productSearch,
    productCode,
    category,
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
    productSearch,
    productCode,
    category,
    active,
  ],
  coupons: [{ ...search, placeholder: 'Ex.: BEMVINDO10 ou Boas-vindas' }, active],
  promotions: [
    { ...search, placeholder: 'Ex.: Oferta de domingo ou Picanha' },
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
  deliveries: [{
    ...search,
    label: 'Nome ou e-mail do entregador',
    placeholder: 'Ex.: João da Silva ou joao@exemplo.com',
  }],
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
    { ...search, placeholder: 'Ex.: Dúvida sobre um pedido' },
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
    { ...search, placeholder: 'Ex.: Maria da Silva ou produtos' },
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
