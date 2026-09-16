import { getRoutePermissions, isPublicRoute } from './route-access';
import { unitPermissions } from './panel-access';

describe('route access', () => {
  it('keeps authentication routes public, including nested paths', () => {
    expect(isPublicRoute('/login')).toBe(true);
    expect(isPublicRoute('/reset-password/token')).toBe(true);
    expect(isPublicRoute('/dashboard')).toBe(false);
  });

  it('uses the most specific route permission and supports detail pages', () => {
    expect(getRoutePermissions('/orders/42')).toEqual([unitPermissions.manageOrders]);
    expect(getRoutePermissions('/settings/users/42')).toEqual([unitPermissions.manageMembers]);
  });

  it('denies private routes that are absent from the permission map', () => {
    expect(getRoutePermissions('/private-unknown')).toBeNull();
  });
});
