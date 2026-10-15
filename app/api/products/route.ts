import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";

import { ApiError, jsonError, toErrorResponse } from "@/lib/api";
import { recordAudit } from "@/lib/audit";
import { requireShop } from "@/lib/guard";
import { prisma } from "@/lib/prisma";
import { serializeProduct } from "@/lib/serializers";
import {
  readJsonBody,
  readNonNegativeInteger,
  readNumber,
  readOptionalString,
  readString,
} from "@/lib/validation";

/** Units the shop can sell in. Kept in step with the product form. */
export const UNITS = ["PIECE", "KG", "GRAM", "LITRE", "ML", "PACK", "BOX", "CRATE", "BUNCH", "DOZEN"] as const;

export async function GET() {
  try {
    const membership = await requireShop("product:view");

    const products = await prisma.product.findMany({
      where: { shopId: membership.shopId },
      include: { category: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ products: products.map(serializeProduct) });
  } catch (error) {
    return toErrorResponse(error, "product list");
  }
}

export async function POST(request: Request) {
  try {
    const membership = await requireShop("product:create");
    const body = await readJsonBody(request);

    const name = readString(body.name);
    const costPrice = readNumber(body.costPrice);
    const sellingPrice = readNumber(body.sellingPrice);
    const stockQuantity = readNonNegativeInteger(body.stockQuantity ?? 0);
    const lowStockThreshold = readNonNegativeInteger(body.lowStockThreshold ?? 0);
    const categoryName = readString(body.categoryName);
    const barcode = readOptionalString(body.barcode);
    const unit = (readString(body.unit) || "PIECE").toUpperCase();

    if (!name) {
      throw new ApiError("A product name is required.", 400);
    }

    if (!Number.isFinite(costPrice) || costPrice < 0 || !Number.isFinite(sellingPrice) || sellingPrice < 0) {
      throw new ApiError("Cost price and selling price must be numbers greater than or equal to zero.", 400);
    }

    if (stockQuantity === null || lowStockThreshold === null) {
      throw new ApiError("Stock values must be whole numbers greater than or equal to zero.", 400);
    }

    if (!UNITS.includes(unit as (typeof UNITS)[number])) {
      throw new ApiError(`Unit must be one of: ${UNITS.join(", ")}.`, 400);
    }

    const product = await prisma.$transaction(async (transaction) => {
      let categoryId: string | undefined;

      if (categoryName) {
        const category = await transaction.category.upsert({
          where: { shopId_name: { shopId: membership.shopId, name: categoryName } },
          update: { active: true },
          create: { shopId: membership.shopId, name: categoryName },
        });
        categoryId = category.id;
      }

      const created = await transaction.product.create({
        data: {
          shopId: membership.shopId,
          categoryId,
          name,
          barcode,
          unit,
          costPrice,
          sellingPrice,
          stockQuantity,
          lowStockThreshold,
        },
        include: { category: { select: { name: true } } },
      });

      if (stockQuantity > 0) {
        await transaction.stockMovement.create({
          data: {
            shopId: membership.shopId,
            productId: created.id,
            type: "RECEIVE",
            quantity: stockQuantity,
            previousQuantity: 0,
            newQuantity: stockQuantity,
            reason: "Opening stock",
            createdBy: membership.userId,
          },
        });
      }

      await recordAudit(transaction, {
        shopId: membership.shopId,
        userId: membership.userId,
        action: "product.create",
        entity: "product",
        entityId: created.id,
        metadata: { name, barcode, unit, sellingPrice, stockQuantity },
      });

      return created;
    });

    return NextResponse.json({ product: serializeProduct(product) }, { status: 201 });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return jsonError("Another product in this shop already uses that barcode.", 409);
    }

    return toErrorResponse(error, "product creation");
  }
}
