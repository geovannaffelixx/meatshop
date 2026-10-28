import type { PanelMembership } from "./panel-access";

export const UNIT_SELECTION_ROUTE = "/select-unit";
export const UNIT_STORAGE_KEY = "meatshop:selected-unit-id";
export const UNIT_USER_STORAGE_KEY = "meatshop:selected-unit-user-id";

export function resolveSelectedUnit(
  memberships: PanelMembership[],
  userId: number,
  storedUnit: string | null,
  storedUser: string | null,
): number | null {
  if (memberships.length === 1) return memberships[0].unit_id;
  if (storedUser !== String(userId)) return null;
  const id = Number(storedUnit);
  return memberships.some((membership) => membership.unit_id === id) ? id : null;
}

export function unitHomeRoute(membership: PanelMembership | null, superAdmin = false): string {
  if (membership?.permissions.includes("VIEW_DASHBOARD")) return "/dashboard";
  return superAdmin ? "/audit" : "/settings/account";
}
