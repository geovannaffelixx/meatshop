"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { resetApiCache, setApiCacheScope } from '@/shared/lib/query-cache';
import { UnitSwitchOverlay } from '@/shared/components/unit-switch-overlay';
import { apiGet } from "@/shared/lib/api";
import type { CurrentUser } from "@/shared/hooks/use-current-user";
import type { PanelContext, PanelMembership, UnitPermission } from "@/shared/auth/panel-access";
import { isPublicRoute } from "@/shared/auth/route-access";
import { getRoutePermissions } from '@/shared/auth/route-access';
import { resolveSelectedUnit, UNIT_STORAGE_KEY, UNIT_USER_STORAGE_KEY, UNIT_SELECTION_ROUTE, unitHomeRoute } from '@/shared/auth/unit-selection';
import { usePathname, useRouter } from "next/navigation";

const LEGACY_USER_STORAGE_KEY = "currentUser";
type RefreshOptions = {
  signal?: AbortSignal;
};

type UsersMeResponse = {
  user: CurrentUser;
  panel: PanelContext;
};

type PanelAccessValue = {
  user: CurrentUser | null;
  panel: PanelContext | null;
  selectedMembership: PanelMembership | null;
  unitId: number | null;
  loading: boolean;
  initialized: boolean;
  hasPermission: (permission: UnitPermission) => boolean;
  setUnitId: (unitId: number) => void;
  refresh: (options?: RefreshOptions) => Promise<void>;
};

const PanelAccessContext = createContext<PanelAccessValue | null>(null);

export function PanelAccessProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [panel, setPanel] = useState<PanelContext | null>(null);
  const [unitId, setUnitIdState] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [initialized, setInitialized] = useState(false);
  const [switchingUnit, setSwitchingUnit] = useState<string | null>(null);
  const switchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const initializedRef = useRef(false);
  const pathname = usePathname();
  const router = useRouter();

  const refresh = useCallback(async (options: RefreshOptions = {}) => {
    setLoading(!initializedRef.current);
    try {
      const data = (await apiGet("/users/me", {
        silent: true,
        signal: options.signal,
      })) as UsersMeResponse;
      const nextPanel: PanelContext = data.panel;
      setUser(data.user);
      setPanel(nextPanel);

      const selected = resolveSelectedUnit(nextPanel.memberships, data.user.id,
        localStorage.getItem(UNIT_STORAGE_KEY), localStorage.getItem(UNIT_USER_STORAGE_KEY));
      setUnitIdState(selected);
      setApiCacheScope(`${data.user.id}:${selected ?? 'none'}`);
      if (selected) {
        localStorage.setItem(UNIT_STORAGE_KEY, String(selected));
        localStorage.setItem(UNIT_USER_STORAGE_KEY, String(data.user.id));
      } else {
        localStorage.removeItem(UNIT_STORAGE_KEY);
        localStorage.removeItem(UNIT_USER_STORAGE_KEY);
      }
    } catch (error) {
      if (options.signal?.aborted) return;

      setUser(null);
      resetApiCache();
      setPanel(null);
      setUnitIdState(null);
      if (error instanceof Error && error.name === "AbortError") return;
    } finally {
      if (!options.signal?.aborted) {
        setInitialized(true);
        initializedRef.current = true;
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    localStorage.removeItem(LEGACY_USER_STORAGE_KEY);
  }, []);

  useEffect(() => {
    if (isPublicRoute(pathname) || initialized) return;

    const controller = new AbortController();
    void refresh({ signal: controller.signal });
    return () => controller.abort();
  }, [initialized, pathname, refresh]);

  useEffect(() => {
    function handleSessionExpired() {
      resetApiCache();
      setUser(null);
      setPanel(null);
      setUnitIdState(null);
      setInitialized(true);
      setLoading(false);
    }
    window.addEventListener("auth:session-expired", handleSessionExpired);
    return () => window.removeEventListener("auth:session-expired", handleSessionExpired);
  }, []);

  useEffect(() => {
    const controllers = new Set<AbortController>();

    function handleCurrentUserUpdated() {
      const controller = new AbortController();
      controllers.add(controller);
      void refresh({ signal: controller.signal }).finally(() => {
        controllers.delete(controller);
      });
    }

    window.addEventListener("currentUserUpdated", handleCurrentUserUpdated);
    return () => {
      window.removeEventListener("currentUserUpdated", handleCurrentUserUpdated);
      controllers.forEach((controller) => controller.abort());
    };
  }, [refresh]);

  const setUnitId = useCallback((nextUnitId: number) => {
    const membership = panel?.memberships.find((item) => item.unit_id === nextUnitId);
    if (!user || !membership || nextUnitId === unitId || switchingUnit) return;
    const choosingInitialUnit = pathname === UNIT_SELECTION_ROUTE;
    if (!choosingInitialUnit) setSwitchingUnit(membership.unit_name);
    resetApiCache(`${user?.id}:${nextUnitId}`);
    localStorage.setItem(UNIT_STORAGE_KEY, String(nextUnitId));
    localStorage.setItem(UNIT_USER_STORAGE_KEY, String(user.id));
    setUnitIdState(nextUnitId);
    if (choosingInitialUnit) {
      router.replace(unitHomeRoute(membership, user?.global_role === 'SUPER_ADMIN'));
      return;
    }
    const detail = pathname.match(/^\/(products|orders|recipes)\/(?:\d+|new)$/);
    const required = getRoutePermissions(pathname);
    const allowed = required?.some(permission => permission === 'AUTHENTICATED' ||
      (permission === 'SUPER_ADMIN' ? user?.global_role === 'SUPER_ADMIN' : membership.permissions.includes(permission)));
    if (!allowed) router.replace(membership.permissions.includes('VIEW_DASHBOARD') ? '/dashboard' : '/settings/account');
    else if (detail) router.replace(`/${detail[1]}`);
    switchTimer.current = setTimeout(() => {
      setSwitchingUnit(null);
      switchTimer.current = null;
    }, 3000);
  }, [panel, unitId, user, switchingUnit, pathname, router]);

  useEffect(() => () => {
    if (switchTimer.current) clearTimeout(switchTimer.current);
  }, []);

  const selectedMembership = useMemo(
    () => panel?.memberships.find((item) => item.unit_id === unitId) ?? null,
    [panel, unitId],
  );
  const hasPermission = useCallback(
    (permission: UnitPermission) => selectedMembership?.permissions.includes(permission) ?? false,
    [selectedMembership],
  );

  return (
    <PanelAccessContext.Provider value={{ user, panel, selectedMembership, unitId, loading, initialized, hasPermission, setUnitId, refresh }}>
      <div inert={switchingUnit !== null} className="min-h-screen">{children}</div>
      {switchingUnit && <UnitSwitchOverlay name={switchingUnit} />}
    </PanelAccessContext.Provider>
  );
}

export function usePanelAccess() {
  const context = useContext(PanelAccessContext);
  if (!context) throw new Error("usePanelAccess deve ser usado dentro de PanelAccessProvider");
  return context;
}
