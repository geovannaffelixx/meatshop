export const unitPermissions = {
  viewDashboard: "VIEW_DASHBOARD",
  manageOrders: "MANAGE_ORDERS",
  manageProducts: "MANAGE_PRODUCTS",
  manageCategories: "MANAGE_CATEGORIES",
  viewFinance: "VIEW_FINANCE",
  manageFinance: "MANAGE_FINANCE",
  manageMembers: "MANAGE_MEMBERS",
  manageUnit: "MANAGE_UNIT",
  viewDeliveries: "VIEW_DELIVERIES",
  manageDeliveries: "MANAGE_DELIVERIES",
} as const;

export type UnitPermission =
  (typeof unitPermissions)[keyof typeof unitPermissions];
export type UnitRole = "OWNER" | "MANAGER" | "OPERATOR" | "DELIVERY";

export type PanelMembership = {
  unit_id: number;
  unit_name: string;
  role: UnitRole | null;
  permissions: UnitPermission[];
};

export type PanelContext = {
  can_access: boolean;
  requires_unit_selection: boolean;
  memberships: PanelMembership[];
};
