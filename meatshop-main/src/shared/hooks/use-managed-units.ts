"use client";

import { usePanelAccess } from "@/shared/providers/panel-access-provider";

export type ManagedUnit = { id: number; name: string };

export function useManagedUnits() {
  const { panel, unitId, setUnitId, loading } = usePanelAccess();
  const units: ManagedUnit[] = panel?.memberships.map((item) => ({ id: item.unit_id, name: item.unit_name })) ?? [];
  return { units, unitId, setUnitId, loading, error: null };
}
