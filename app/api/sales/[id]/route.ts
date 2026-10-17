import { NextResponse } from "next/server";

import { ApiError, toErrorResponse } from "@/lib/api";
import { requireShop } from "@/lib/guard";
import { prisma } from "@/lib/prisma";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const membership = await requireShop("sale:view");
    const { id } = await params;
    const sale = await prisma.sale.findFirst({
      where: {
        shopId: membership.shopId,
        OR: [{ id }, { clientRef: id }],
      },
      include: {
        customer: { select: { name: true } },
        items: {
          select: {
            productNameSnapshot: true,
            quantity: true,
            unitPriceSnapshot: true,
            total: true,
            product: { select: { unit: true } },
          },
        },
      },
    });

    if (!sale) {
      throw new ApiError("Sale not found in this shop.", 404);
    }

    return NextResponse.json({
      receipt: {
        id: sale.clientRef ?? sale.id,
        receiptNumber: sale.receiptNumber,
        createdAt: sale.createdAt.getTime(),
        customerName: sale.customer?.name ?? null,
        items: sale.items.map((item) => ({
          name: item.productNameSnapshot,
          quantity: item.quantity,
          unitPrice: Number(item.unitPriceSnapshot),
          unit: item.product.unit,
          total: Number(item.total),
        })),
        subtotal: Number(sale.subtotal),
        discount: Number(sale.discount),
        total: Number(sale.total),
      },
    });
  } catch (error) {
    return toErrorResponse(error, "sale receipt");
  }
}
