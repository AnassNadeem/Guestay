import { useGetIdentity, usePermissions } from "@refinedev/core";

export type Role = "owner" | "manager" | "staff";

/**
 * Owner (UI: Admin): full access including revenue, analytics, rooms CRUD, staff.
 * Manager: bookings + rooms view + ops pages; no revenue/analytics/staff.
 *
 * Important: wait for `ready` before redirecting away from owner-only pages,
 * otherwise a reload briefly looks unauthenticated and sends users to Dashboard.
 */
export function useRole() {
  const { data: perm, isLoading: permLoading } = usePermissions<string>();
  const { data: identity, isLoading: idLoading } = useGetIdentity<{
    role?: string;
  }>();
  const ready = !permLoading && !idLoading;
  const role = (perm || identity?.role || (ready ? "manager" : null)) as
    | Role
    | null;
  const isOwner = role === "owner";
  const isManager = role === "manager";
  return {
    role: role || "manager",
    ready,
    isOwner,
    isManager,
    canSeeRevenue: isOwner,
    canViewRooms: !ready || isOwner || isManager,
    canManageRooms: isOwner,
    canSeeAnalytics: isOwner,
    canManageStaff: isOwner,
    canSeeAudit: isOwner,
    canDecideRefunds: isOwner,
  };
}
