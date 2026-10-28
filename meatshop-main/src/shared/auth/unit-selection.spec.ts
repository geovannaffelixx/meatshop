import { resolveSelectedUnit, unitHomeRoute } from "./unit-selection";
import type { PanelMembership } from "./panel-access";

const memberships: PanelMembership[] = [
  {
    unit_id: 1,
    unit_name: "A",
    unit_image_url: null,
    role: "MANAGER",
    permissions: ["VIEW_DASHBOARD"],
  },
  {
    unit_id: 2,
    unit_name: "B",
    unit_image_url: null,
    role: "OPERATOR",
    permissions: ["MANAGE_ORDERS"],
  },
];
describe("Unit selection", () => {
  it("automatically selects a single accessible unit", () =>
    expect(resolveSelectedUnit([memberships[0]], 7, null, null)).toBe(1));
  it("requires an explicit choice when more than one unit is accessible", () =>
    expect(resolveSelectedUnit(memberships, 7, null, null)).toBeNull());
  it("restores an allowed choice for the same account", () =>
    expect(resolveSelectedUnit(memberships, 7, "2", "7")).toBe(2));
  it("does not reuse another account selection", () =>
    expect(resolveSelectedUnit(memberships, 7, "2", "8")).toBeNull());
  it("ignores a saved unit when its membership has been removed", () =>
    expect(resolveSelectedUnit(memberships, 7, "99", "7")).toBeNull());
  it("returns no unit for an account without accessible memberships", () =>
    expect(resolveSelectedUnit([], 7, "1", "7")).toBeNull());
  it("chooses an allowed landing page", () => {
    expect(unitHomeRoute(memberships[0])).toBe("/dashboard");
    expect(unitHomeRoute(memberships[1])).toBe("/settings/account");
    expect(unitHomeRoute(null, true)).toBe("/audit");
  });
});
