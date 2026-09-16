import { isExcludedPath, resolveRouteAuditInfo, tableNameFor } from './route-audit-info';

describe('route audit info', () => {
  it('identifies critical semantic actions', () => {
    expect(resolveRouteAuditInfo('POST', '/auth/login', {}).action).toBe('LOGIN');
    expect(resolveRouteAuditInfo('PATCH', '/orders/:id/cancel', { id: '8' })).toMatchObject({
      action: 'ORDER_CANCELLED',
      entityId: '8',
    });
  });

  it('audits authentication and restricts queryable tables', () => {
    expect(isExcludedPath('/auth/login')).toBe(false);
    expect(tableNameFor('users; DROP TABLE users')).toBeNull();
    expect(tableNameFor('products')).toBe('products');
  });
});
