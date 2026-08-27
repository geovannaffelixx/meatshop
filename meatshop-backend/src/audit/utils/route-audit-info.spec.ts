import { isExcludedPath, resolveRouteAuditInfo, tableNameFor } from './route-audit-info';

describe('route audit info', () => {
  it('identifica ações semânticas críticas', () => {
    expect(resolveRouteAuditInfo('POST', '/auth/login', {}).action).toBe('LOGIN');
    expect(resolveRouteAuditInfo('PATCH', '/orders/:id/cancel', { id: '8' })).toMatchObject({
      action: 'ORDER_CANCELLED',
      entityId: '8',
    });
  });

  it('audita autenticação e restringe tabelas consultáveis', () => {
    expect(isExcludedPath('/auth/login')).toBe(false);
    expect(tableNameFor('users; DROP TABLE users')).toBeNull();
    expect(tableNameFor('products')).toBe('products');
  });
});
