import { ApiError } from "@/lib/api";
import { getCurrentShop, type ShopSession } from "@/lib/current-shop";
import { hasPermission, type Permission } from "@/lib/rbac";

/**
 * The one place an API route asks "who is this and may they do this?".
 *
 * Throws `ApiError(401)` when there is no session and `ApiError(403)` when the
 * role lacks the permission, so routes stay thin and every route answers
 * unauthenticated callers with JSON instead of a redirect.
 */
export async function requireShop(permission: Permission): Promise<ShopSession> {
  const membership = await getCurrentShop();

  if (!membership) {
    throw new ApiError("You must be signed in to continue.", 401);
  }

  if (!hasPermission(membership.role, permission)) {
    throw new ApiError("Your role does not allow this action.", 403);
  }

  return membership;
}
