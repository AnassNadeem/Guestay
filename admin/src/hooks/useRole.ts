import { useGetIdentity, usePermissions } from "@refinedev/core";

export type Role = "owner" | "manager" | "staff";

/**
 * Owner: full access including revenue, analytics, rooms CRUD, staff.
 * Manager: bookings + rooms view + ops pages; no revenue/analytics/staff.
 */
export function useRole() {
  const { data: perm } = usePermissions<string>();
  const { data: identity } = useGetIdentity<{ role?: string }>();
  const role = (perm || identity?.role || "manager") as Role;
  const isOwner = role === "owner";
  const isManager = role === "manager";
  return {
    role,
    isOwner,
    isManager,
    canSeeRevenue: isOwner,
    canViewRooms: isOwner || isManager,
    canManageRooms: isOwner,
    canSeeAnalytics: isOwner,
    canManageStaff: isOwner,
    canSeeAudit: isOwner,
    canDecideRefunds: isOwner,
  };
}
