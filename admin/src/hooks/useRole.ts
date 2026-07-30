import { useGetIdentity, usePermissions } from "@refinedev/core";

export type Role = "owner" | "manager" | "staff";

/**
 * Central RBAC hook. Owner has full access; manager is restricted (no revenue,
 * analytics, rooms management, staff/users; refunds are view+comment only).
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
    canManageRooms: isOwner,
    canSeeAnalytics: isOwner,
    canManageStaff: isOwner,
    canSeeAudit: isOwner,
    canDecideRefunds: isOwner,
  };
}
