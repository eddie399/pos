import { NextResponse } from "next/server";

import { ApiError, toErrorResponse } from "@/lib/api";
import { recordAudit } from "@/lib/audit";
import { requireShop } from "@/lib/guard";
import { prisma } from "@/lib/prisma";
import { serializeExpense } from "@/lib/serializers";
import { isNonNegativeNumber, readJsonBody, readNumber, readString } from "@/lib/validation";

export async function GET() {
  try {
    const membership = await requireShop("expense:view");

    const expenses = await prisma.expense.findMany({
      where: { shopId: membership.shopId },
      include: { creator: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ expenses: expenses.map(serializeExpense) });
  } catch (error) {
    return toErrorResponse(error, "expense list");
  }
}

export async function POST(request: Request) {
  try {
    const membership = await requireShop("expense:create");
    const body = await readJsonBody(request);

    const category = readString(body.category);
    const description = readString(body.description);
    const amount = readNumber(body.amount ?? 0);

    if (!category || !description) {
      throw new ApiError("Category and description are required.", 400);
    }

    if (!isNonNegativeNumber(amount)) {
      throw new ApiError("Expense amount must be a number greater than or equal to zero.", 400);
    }

    const expense = await prisma.$transaction(async (transaction) => {
      const created = await transaction.expense.create({
        data: {
          shopId: membership.shopId,
          category,
          description,
          amount,
          createdBy: membership.userId,
        },
        include: { creator: { select: { name: true } } },
      });

      await recordAudit(transaction, {
        shopId: membership.shopId,
        userId: membership.userId,
        action: "expense.create",
        entity: "expense",
        entityId: created.id,
        metadata: { category, description, amount },
      });

      return created;
    });

    return NextResponse.json({ expense: serializeExpense(expense) }, { status: 201 });
  } catch (error) {
    return toErrorResponse(error, "expense creation");
  }
}
