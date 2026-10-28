import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { readdirSync } from 'node:fs';
import { join, relative } from 'node:path';
import { RouteGuard } from './route-guard';
import { usePanelAccess } from '@/shared/providers/panel-access-provider';
import { getRoutePermissions, isPublicRoute } from '@/shared/auth/route-access';

let mockPathname = '/dashboard';
const replace = jest.fn();
jest.mock('next/navigation', () => ({ usePathname: () => mockPathname, useRouter: () => ({ replace }) }));
jest.mock('@/shared/providers/panel-access-provider', () => ({ usePanelAccess: jest.fn() }));

function pages(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap(entry => entry.isDirectory() ? pages(join(directory, entry.name)) : entry.name === 'page.tsx' ? [join(directory, entry.name)] : []);
}
const app = join(process.cwd(), 'src/app');
const routes = pages(app).map(file => '/' + relative(app, file).replace(/\\/g, '/').replace(/(^|\/)\([^/]+\)\//g, '$1').replace(/(^|\/)page.tsx$/, '').replace(/\[[^/]+\]/g, '1')).map(route => route.replace(/\/$/, '') || '/');
const privateRoutes = routes.filter(route => !isPublicRoute(route));

describe('All application pages and their access guards', () => {
  let container: HTMLDivElement;
  let root: Root;
  function access(value: object) {
    jest.mocked(usePanelAccess).mockReturnValue({ initialized: true, loading: false, user: null, panel: null, selectedMembership: null, ...value } as never);
  }
  async function render(path: string) {
    mockPathname = path;
    await act(async () => root.render(<RouteGuard><div data-private="true">Private screen content</div></RouteGuard>));
  }
  beforeEach(() => {
    replace.mockClear();
    Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
    container = document.createElement('div'); document.body.append(container); root = createRoot(container);
  });
  afterEach(async () => { await act(async () => root.unmount()); container.remove(); });

  it('explicitly classifies every page file and keeps panel pages private', () => {
    expect(routes.length).toBeGreaterThan(30);
    for (const route of routes) expect(isPublicRoute(route) || getRoutePermissions(route) !== null).toBe(true);
    for (const file of pages(join(app, '(panel)'))) {
      const route = '/' + relative(join(app, '(panel)'), file).replace(/\\/g, '/').replace(/\/page.tsx$/, '').replace(/\[[^/]+\]/g, '1');
      expect(isPublicRoute(route)).toBe(false);
    }
  });
  it.each(privateRoutes)('does not render %s without an authenticated user', async path => {
    access({}); await render(path);
    expect(container.querySelector('[data-private]')).toBeNull();
    expect(replace).toHaveBeenCalledWith('/login');
  });
  it.each(privateRoutes.filter(path => !getRoutePermissions(path)?.includes('AUTHENTICATED')))('rejects a user lacking permissions at %s', async path => {
    access({ user: { id: 1, global_role: 'USER' }, panel: { can_access: true, memberships: [] }, selectedMembership: { unit_id: 1, permissions: [] } });
    await render(path);
    expect(container.querySelector('[data-private]')).toBeNull();
    expect(replace).toHaveBeenCalledWith('/no-panel-access');
  });
  it('does not show private content while credentials are still being validated', async () => {
    access({ initialized: false, loading: true }); await render('/audit');
    expect(container.querySelector('[data-private]')).toBeNull();
    expect(replace).not.toHaveBeenCalled();
  });
  it('requires a unit choice before rendering a multi-unit operation', async () => {
    access({ user: { id: 1, global_role: 'USER' }, panel: { can_access: true, memberships: [{ unit_id: 1 }, { unit_id: 2 }] } });
    await render('/orders');
    expect(replace).toHaveBeenCalledWith('/select-unit');
    expect(container.querySelector('[data-private]')).toBeNull();
  });
  it('allows the administrator audit route only for a super administrator', async () => {
    access({ user: { id: 1, global_role: 'SUPER_ADMIN' }, panel: { can_access: true, memberships: [] } });
    await render('/audit');
    expect(container.querySelector('[data-private]')).not.toBeNull();
  });
  it('denies unknown private routes by default', async () => {
    access({ user: { id: 1, global_role: 'USER' }, panel: { can_access: true, memberships: [] } });
    await render('/private-not-registered');
    expect(container.querySelector('[data-private]')).toBeNull();
    expect(replace).toHaveBeenCalledWith('/no-panel-access');
  });
});
