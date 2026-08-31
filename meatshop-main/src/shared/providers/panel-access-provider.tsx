"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { apiGet } from "@/shared/lib/api";
import type { CurrentUser } from "@/shared/hooks/use-current-user";
import type { PanelContext, PanelMembership, UnitPermission } from "@/shared/auth/panel-access";
import { isPublicRoute } from "@/shared/auth/route-access";
import { usePathname } from "next/navigation";

const UNIT_STORAGE_KEY = "meatshop:selected-unit-id";
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
  const pathname = usePathname();

  const refresh = useCallback(async (options: RefreshOptions = {}) => {
    setLoading(true);
    try {
      const data = (await apiGet("/users/me", {
        silent: true,
        signal: options.signal,
      })) as UsersMeResponse;
      const nextPanel: PanelContext = data.panel;
      setUser(data.user);
      setPanel(nextPanel);

      const stored = Number(localStorage.getItem(UNIT_STORAGE_KEY));
      const selected = nextPanel.memberships.some((item) => item.unit_id === stored)
        ? stored
        : nextPanel.memberships[0]?.unit_id ?? null;
      setUnitIdState(selected);
      if (selected) localStorage.setItem(UNIT_STORAGE_KEY, String(selected));
      localStorage.setItem("currentUser", JSON.stringify(data.user));
    } catch (error) {
      if (options.signal?.aborted) return;

      setUser(null);
      setPanel(null);
      setUnitIdState(null);
      localStorage.removeItem("currentUser");
      if (error instanceof Error && error.name === "AbortError") return;
    } finally {
      if (!options.signal?.aborted) {
        setInitialized(true);
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    if (isPublicRoute(pathname) || initialized) return;

    const controller = new AbortController();
    void refresh({ signal: controller.signal });
    return () => controller.abort();
  }, [initialized, pathname, refresh]);

  useEffect(() => {
    function handleSessionExpired() {
      setUser(null);
      setPanel(null);
      setUnitIdState(null);
      setInitialized(true);
      setLoading(false);
      localStorage.removeItem("currentUser");
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
    if (!panel?.memberships.some((item) => item.unit_id === nextUnitId)) return;
    localStorage.setItem(UNIT_STORAGE_KEY, String(nextUnitId));
    setUnitIdState(nextUnitId);
  }, [panel]);

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
      {children}
    </PanelAccessContext.Provider>
  );
}

export function usePanelAccess() {
  const context = useContext(PanelAccessContext);
  if (!context) throw new Error("usePanelAccess deve ser usado dentro de PanelAccessProvider");
  return context;
}
