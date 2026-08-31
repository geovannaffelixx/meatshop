import {
  unitPermissions,
  type UnitPermission,
} from "@/shared/auth/panel-access";

export const publicRoutes = [
  "/",
  "/login",
  "/register",
  "/forgot-password",
  "/reset-password",
  "/verify-email",
  "/no-panel-access",
] as const;

export type RoutePermission =
  | UnitPermission
  | "AUTHENTICATED"
  | "SUPER_ADMIN";

/**
 * Fonte única da verdade para autorização de rotas privadas.
 * As permissões de uma mesma rota são alternativas (OU).
 */
export const routePermissions = {
  "/dashboard": [unitPermissions.viewDashboard],
  "/orders": [unitPermissions.manageOrders],
  "/deliveries": [unitPermissions.viewDeliveries],
  "/products": [unitPermissions.manageProducts],
  "/categories": [unitPermissions.manageCategories],
  "/promotions": [unitPermissions.manageProducts],
  "/coupons": [unitPermissions.manageProducts],
  "/recipes": [unitPermissions.manageProducts],
  "/reviews": [unitPermissions.viewDashboard],
  "/finance": [unitPermissions.viewFinance],
  "/audit": ["SUPER_ADMIN"],
  "/notifications": [unitPermissions.viewDashboard],
  "/settings/account": [unitPermissions.viewDashboard],
  "/settings/security": [unitPermissions.viewDashboard],
  "/settings/unit": [unitPermissions.manageUnit],
  "/settings/users": [unitPermissions.manageMembers],
  "/settings/profile": [unitPermissions.manageUnit],
  "/support": ["AUTHENTICATED"],
} as const satisfies Record<string, readonly RoutePermission[]>;

function matchesRoute(pathname: string, route: string) {
  return pathname === route || pathname.startsWith(`${route}/`);
}

export function isPublicRoute(pathname: string) {
  return publicRoutes.some((route) => matchesRoute(pathname, route));
}

export function getRoutePermissions(
  pathname: string,
): readonly RoutePermission[] | null {
  const matchingRoute = Object.keys(routePermissions)
    .sort((a, b) => b.length - a.length)
    .find((route) => matchesRoute(pathname, route));

  if (!matchingRoute) return null;
  return routePermissions[matchingRoute as keyof typeof routePermissions];
}
