import { NextResponse } from "next/server";

import { ApiError, toErrorResponse } from "@/lib/api";
import { recordAudit } from "@/lib/audit";
import { requireShop } from "@/lib/guard";
import { prisma } from "@/lib/prisma";
import { serializeProduct } from "@/lib/serializers";
import { readJsonBody, readOptionalString, readPositiveInteger } from "@/lib/validation";

/**
 * Receives stock into the shop or removes it (breakage, shrinkage, returns).
 *
 * Both paths are a single guarded `updateMany`, so two people adjusting the same
 * product at the same time cannot lose each other's change or push stock below
 * zero the way a read-then-write update can.
 */
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const membership = await requireShop("stock:adjust");
    const { id } = await params;
    const body = await readJsonBody(request);

    const quantity = readPositiveInteger(body.quantity);

    if (quantity === null) {
      throw new ApiError("Quantity must be a whole number greater than zero.", 400);
    }

    const type = body.type === "REMOVE" ? "REMOVE" : "RECEIVE";
    const reason = readOptionalString(body.reason);
    const isRemoval = type === "REMOVE";

    const product = await prisma.$transaction(async (transaction) => {
      const existing = await transaction.product.findFirst({
        where: { id, shopId: membership.shopId },
        select: { id: true, name: true, stockQuantity: true },
      });

      if (!existing) {
        throw new ApiError("Product not found in this shop.", 404);
      }

      const changed = await transaction.product.updateMany({
        where: {
          id: existing.id,
          shopId: membership.shopId,
          ...(isRemoval ? { stockQuantity: { gte: quantity } } : {}),
        },
        data: isRemoval ? { stockQuantity: { decrement: quantity } } : { stockQuantity: { increment: quantity } },
      });

      if (changed.count === 0) {
        throw new ApiError("Stock cannot go below zero.", 400);
      }

      const updated = await transaction.product.findUniqueOrThrow({
        where: { id: existing.id },
        include: { category: { select: { name: true } } },
      });

      const previousQuantity = updated.stockQuantity + (isRemoval ? quantity : -quantity);

      await transaction.stockMovement.create({
        data: {
          shopId: membership.shopId,
          productId: existing.id,
          type,
          quantity,
          previousQuantity,
          newQuantity: updated.stockQuantity,
          reason,
          createdBy: membership.userId,
        },
      });

      await recordAudit(transaction, {
        shopId: membership.shopId,
        userId: membership.userId,
        action: isRemoval ? "stock.remove" : "stock.receive",
        entity: "product",
        entityId: existing.id,
        metadata: { productName: existing.name, quantity, previousQuantity, newQuantity: updated.stockQuantity, reason },
      });

      return updated;
    });

    return NextResponse.json({ product: serializeProduct(product) });
  } catch (error) {
    return toErrorResponse(error, "stock adjustment");
  }
}
