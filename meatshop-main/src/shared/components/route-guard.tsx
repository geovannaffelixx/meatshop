"use client";

import { useEffect, useMemo, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  getRoutePermissions,
  isPublicRoute,
} from "@/shared/auth/route-access";
import { LoadingOverlay } from "@/shared/components/loading-overlay";
import { usePanelAccess } from "@/shared/providers/panel-access-provider";

type RouteGuardProps = {
  children: React.ReactNode;
};

type PendingRedirect = {
  from: string;
  to: string;
};

export function RouteGuard({ children }: RouteGuardProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, panel, selectedMembership, loading, initialized } =
    usePanelAccess();
  const pendingRedirect = useRef<PendingRedirect | null>(null);

  const publicRoute = isPublicRoute(pathname);
  const redirectTo = useMemo(() => {
    if (publicRoute || !initialized || loading) return null;
    if (!user) return "/login";
    if (!panel?.can_access) return "/no-panel-access";

    const requiredPermissions = getRoutePermissions(pathname);

    // Rotas privadas não declaradas são negadas por padrão.
    if (!requiredPermissions) return "/no-panel-access";

    const allowed = requiredPermissions.some((permission) => {
      if (permission === "AUTHENTICATED") return true;
      if (permission === "SUPER_ADMIN") {
        return user.global_role === "SUPER_ADMIN";
      }
      return selectedMembership?.permissions.includes(permission) ?? false;
    });

    return allowed ? null : "/no-panel-access";
  }, [
    initialized,
    loading,
    panel?.can_access,
    pathname,
    publicRoute,
    selectedMembership?.permissions,
    user,
  ]);

  useEffect(() => {
    if (!redirectTo || redirectTo === pathname) return;

    const currentRedirect = pendingRedirect.current;
    if (
      currentRedirect?.from === pathname &&
      currentRedirect.to === redirectTo
    ) {
      return;
    }

    pendingRedirect.current = { from: pathname, to: redirectTo };
    router.replace(redirectTo);
  }, [pathname, redirectTo, router]);

  useEffect(() => {
    if (pendingRedirect.current?.from !== pathname) {
      pendingRedirect.current = null;
    }
  }, [pathname]);

  if (publicRoute) return children;

  if (!initialized || loading) {
    return <LoadingOverlay title="Carregando..." />;
  }

  if (redirectTo) {
    return <LoadingOverlay title="Redirecionando..." />;
  }

  return children;
}
