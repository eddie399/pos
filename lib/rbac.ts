/**
 * Single source of truth for what each shop role may do.
 *
 * API routes authorise through `requireShop("<permission>")` in `lib/guard.ts`,
 * which calls `hasPermission` below. Never inline a role check in a route: the
 * two definitions drift apart and a cashier silently gains owner powers.
 */

export const PERMISSIONS = [
  "shop:manage",
  "product:view",
  "product:create",
  "product:update",
  "product:delete",
  "stock:adjust",
  "sale:create",
  "sale:view",
  "sale:refund",
  "customer:view",
  "customer:create",
  "customer:credit",
  "expense:view",
  "expense:create",
  "report:view",
  "session:view",
  "session:manage",
  "employee:manage",
] as const;

export type Permission = (typeof PERMISSIONS)[number];

const managerPermissions: readonly Permission[] = [
  "product:view",
  "product:create",
  "product:update",
  "stock:adjust",
  "sale:create",
  "sale:view",
  "customer:view",
  "customer:create",
  "customer:credit",
  "expense:view",
  "expense:create",
  "report:view",
  "session:view",
  "session:manage",
];

const cashierPermissions: readonly Permission[] = [
  "product:view",
  "sale:create",
  "sale:view",
  "customer:view",
  "customer:create",
  "expense:view",
  "expense:create",
  "report:view",
  "session:view",
  "session:manage",
];

export const rolePermissions: Record<string, readonly Permission[]> = {
  /** The owner is the shop: everything is allowed. */
  OWNER: PERMISSIONS,
  MANAGER: managerPermissions,
  CASHIER: cashierPermissions,
};

export type RoleName = "OWNER" | "MANAGER" | "CASHIER";

export function isRoleName(value: string): value is RoleName {
  return Object.hasOwn(rolePermissions, value);
}

export function hasPermission(role: string, permission: Permission): boolean {
  const permissions = rolePermissions[role] ?? [];
  return permissions.includes(permission);
}

