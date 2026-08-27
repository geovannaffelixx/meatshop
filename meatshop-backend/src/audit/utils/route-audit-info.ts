const MUTATING_METHODS = ['POST', 'PATCH', 'PUT', 'DELETE'];
const EXCLUDED_PREFIXES = ['/docs', '/metrics', '/health'];
const SAFE_IDENTIFIER = /^[a-z_]+$/;

const METHOD_TO_ACTION: Record<string, string> = {
  POST: 'CREATE',
  PATCH: 'UPDATE',
  PUT: 'UPDATE',
  DELETE: 'DELETE',
};

export interface IRouteAuditInfo {
  action: string;
  entity: string;
  entityId: string | null;
  description: string;
}

const ROUTE_ACTIONS: Array<[RegExp, string]> = [
  [/\/login$/, 'LOGIN'],
  [/\/logout$/, 'LOGOUT'],
  [/password/, 'PASSWORD_CHANGE'],
  [/\/cancel$/, 'ORDER_CANCELLED'],
  [/\/status$/, 'STATUS_CHANGED'],
  [/\/approve$/, 'APPROVED'],
  [/\/close$/, 'SUPPORT_TICKET_CLOSED'],
  [/\/reopen$/, 'SUPPORT_TICKET_REOPENED'],
  [/\/messages$/, 'SUPPORT_MESSAGE_SENT'],
];

export function isMutatingMethod(method: string): boolean {
  return MUTATING_METHODS.includes(method.toUpperCase());
}

export function isExcludedPath(path: string): boolean {
  return EXCLUDED_PREFIXES.some((prefix) => path.startsWith(prefix));
}

/**
 * Deriva ação/entidade/id a partir do padrão de rota (ex: "/products/:id" →
 * entity="products"). É uma heurística genérica — cobre a grande maioria das
 * rotas REST do padrão "/recurso/:id/acao", mas pode nomear a entidade de
 * forma imprecisa em rotas muito aninhadas (ex: "/delivery/:id/approve").
 * Isso é aceitável: o objetivo é rastreamento máximo automático, não 100%
 * de precisão em cada rota.
 */
export function resolveRouteAuditInfo(
  method: string,
  routePath: string,
  params: Record<string, string>,
): IRouteAuditInfo {
  const segments = routePath.split('/').filter(Boolean);
  const entity = deriveEntity(segments);
  const entityId = deriveEntityId(params);

  const action =
    ROUTE_ACTIONS.find(([pattern]) => pattern.test(routePath))?.[1] ??
    METHOD_TO_ACTION[method.toUpperCase()] ??
    method.toUpperCase();
  return {
    action,
    entity,
    entityId,
    description: `${action} em ${entity}`,
  };
}

function deriveEntity(segments: string[]): string {
  const firstParamIndex = segments.findIndex((segment) => segment.startsWith(':'));
  const staticSegments = segments.filter((segment) => !segment.startsWith(':'));

  const candidate =
    firstParamIndex > 0
      ? segments[firstParamIndex - 1]
      : (staticSegments[staticSegments.length - 1] ?? 'unknown');

  return candidate.replace(/-/g, '_');
}

function deriveEntityId(params: Record<string, string>): string | null {
  if (params.id) return params.id;

  const firstParamValue = Object.values(params)[0];
  return firstParamValue ?? null;
}

export function tableNameFor(entity: string): string | null {
  const allowed = [
    'users',
    'units',
    'products',
    'categories',
    'orders',
    'promotions',
    'coupons',
    'expenses',
    'recipes',
    'reviews',
    'support_tickets',
    'notifications',
  ];
  return SAFE_IDENTIFIER.test(entity) && allowed.includes(entity) ? entity : null;
}
