"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { apiGet } from "@/shared/lib/api";
import type { CurrentUser } from "@/shared/hooks/use-current-user";
import type { PanelContext, PanelMembership, UnitPermission } from "@/shared/auth/panel-access";
import { usePathname, useRouter } from "next/navigation";

const UNIT_STORAGE_KEY = "meatshop:selected-unit-id";
const PUBLIC_ROUTES = ["/login", "/register", "/forgot-password", "/reset-password", "/verify-email", "/no-panel-access"];

type PanelAccessValue = {
  user: CurrentUser | null;
  panel: PanelContext | null;
  selectedMembership: PanelMembership | null;
  unitId: number | null;
  loading: boolean;
  hasPermission: (permission: UnitPermission) => boolean;
  setUnitId: (unitId: number) => void;
  refresh: () => Promise<void>;
};

const PanelAccessContext = createContext<PanelAccessValue | null>(null);

export function PanelAccessProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [panel, setPanel] = useState<PanelContext | null>(null);
  const [unitId, setUnitIdState] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const pathname = usePathname();
  const router = useRouter();

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiGet("/users/me");
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
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (PUBLIC_ROUTES.some((route) => pathname.startsWith(route))) {
      setLoading(false);
      return;
    }
    void refresh();
  }, [pathname, refresh]);

  useEffect(() => {
    function handleSessionExpired() {
      setUser(null);
      setPanel(null);
      localStorage.removeItem("currentUser");
      if (!PUBLIC_ROUTES.some((route) => pathname.startsWith(route))) {
        router.replace("/login");
      }
    }
    window.addEventListener("auth:session-expired", handleSessionExpired);
    return () => window.removeEventListener("auth:session-expired", handleSessionExpired);
  }, [pathname, router]);

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
    <PanelAccessContext.Provider value={{ user, panel, selectedMembership, unitId, loading, hasPermission, setUnitId, refresh }}>
      {children}
    </PanelAccessContext.Provider>
  );
}

export function usePanelAccess() {
  const context = useContext(PanelAccessContext);
  if (!context) throw new Error("usePanelAccess deve ser usado dentro de PanelAccessProvider");
  return context;
}
