import { NextResponse } from "next/server";

import { ApiError, toErrorResponse } from "@/lib/api";
import { recordAudit } from "@/lib/audit";
import { requireShop } from "@/lib/guard";
import { prisma } from "@/lib/prisma";
import { serializeCustomer } from "@/lib/serializers";
import { isNonNegativeNumber, readJsonBody, readNumber, readOptionalString, readString } from "@/lib/validation";

export async function GET() {
  try {
    const membership = await requireShop("customer:view");

    const customers = await prisma.customer.findMany({
      where: { shopId: membership.shopId },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ customers: customers.map(serializeCustomer) });
  } catch (error) {
    return toErrorResponse(error, "customer list");
  }
}

export async function POST(request: Request) {
  try {
    const membership = await requireShop("customer:create");
    const body = await readJsonBody(request);

    const name = readString(body.name);
    const phone = readOptionalString(body.phone);
    const creditLimit = readNumber(body.creditLimit ?? 0);

    if (!name) {
      throw new ApiError("Customer name is required.", 400);
    }

    if (!isNonNegativeNumber(creditLimit)) {
      throw new ApiError("Credit limit must be a number greater than or equal to zero.", 400);
    }

    const customer = await prisma.$transaction(async (transaction) => {
      const created = await transaction.customer.create({
        data: { shopId: membership.shopId, name, phone, creditLimit },
      });

      await recordAudit(transaction, {
        shopId: membership.shopId,
        userId: membership.userId,
        action: "customer.create",
        entity: "customer",
        entityId: created.id,
        metadata: { name, phone, creditLimit },
      });

      return created;
    });

    return NextResponse.json({ customer: serializeCustomer(customer) }, { status: 201 });
  } catch (error) {
    return toErrorResponse(error, "customer creation");
  }
}
