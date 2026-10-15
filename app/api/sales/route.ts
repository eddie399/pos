import { NextResponse } from "next/server";

import { ApiError, toErrorResponse } from "@/lib/api";
import { requireShop } from "@/lib/guard";
import { newId } from "@/lib/ids";
import { createSale, type SaleLineInput } from "@/lib/sales";
import { isNonNegativeNumber, readJsonBody, readNumber, readPositiveInteger, readString } from "@/lib/validation";

/**
 * Creates a sale.
 *
 * This route only handles transport concerns; everything that moves money,
 * stock or credit lives in `createSale` so it can be reasoned about in one
 * place. The `clientRef` the device sends is what makes a retried offline sale
 * idempotent: the same reference can be POSTed any number of times.
 */
export async function POST(request: Request) {
  try {
    const membership = await requireShop("sale:create");
    const body = await readJsonBody(request);
    const rawItems = Array.isArray(body.items) ? body.items : [];

    if (!rawItems.length) {
      throw new ApiError("Add at least one item to the sale.", 400);
    }

    const items: SaleLineInput[] = rawItems.map((entry) => {
      const record = (entry && typeof entry === "object" ? entry : {}) as Record<string, unknown>;
      const productId = readString(record.productId);
      const quantity = readPositiveInteger(record.quantity);

      if (!productId || quantity === null) {
        throw new ApiError("Each cart item needs a product and a whole quantity above zero.", 400);
      }

      return { productId, quantity };
    });

    const discount = body.discount === undefined ? 0 : readNumber(body.discount);

    if (!isNonNegativeNumber(discount)) {
      throw new ApiError("Discount must be a number greater than or equal to zero.", 400);
    }

    const customerId = readString(body.customerId) || null;
    const paymentMethod = readString(body.paymentMethod) || (customerId ? "CREDIT" : "CASH");

    const sale = await createSale({
      shopId: membership.shopId,
      cashierId: membership.userId,
      // Falls back to a server-minted id for clients that are not offline-first.
      clientRef: readString(body.clientRef) || newId(),
      items,
      customerId,
      discount,
      paymentMethod,
    });

    return NextResponse.json({
      ok: true,
      repeated: sale.repeated,
      sale: { id: sale.id, receiptNumber: sale.receiptNumber, total: sale.total },
    });
  } catch (error) {
    return toErrorResponse(error, "sale creation");
  }
}
