import { getServerSession } from "next-auth";

import { authOptions, type SessionUser } from "@/auth";
import { prisma } from "@/lib/prisma";

export type ShopSession = {
  shopId: string;
  userId: string;
  role: string;
  shopName: string;
  currency: string;
};

/**
 * Resolves the shop the signed-in user is acting for.
 *
 * Ordering is explicit so a user who belongs to more than one shop always gets
 * the same answer instead of whichever row Postgres happens to return first.
 * Multi-shop switching will replace this with an explicit selected-shop cookie.
 */
export async function getCurrentShop(): Promise<ShopSession | null> {
  const session = await getServerSession(authOptions);
  const user = session?.user as SessionUser | undefined;

  if (!user?.id) {
    return null;
  }

  const membership = await prisma.shopMember.findFirst({
    where: { userId: user.id, active: true },
    orderBy: { createdAt: "asc" },
    select: {
      shopId: true,
      userId: true,
      role: true,
      shop: { select: { name: true, currency: true } },
    },
  });

  if (!membership) {
    return null;
  }

  return {
    shopId: membership.shopId,
    userId: membership.userId,
    role: membership.role,
    shopName: membership.shop.name,
    currency: membership.shop.currency,
  };
}