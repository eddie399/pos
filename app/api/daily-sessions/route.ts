import { NextResponse } from "next/server";

import { ApiError, toErrorResponse } from "@/lib/api";
import { recordAudit } from "@/lib/audit";
import { requireShop } from "@/lib/guard";
import { fromMinor, toMinor } from "@/lib/money";
import { prisma } from "@/lib/prisma";
import { serializeDecimal } from "@/lib/serializers";
import { isNonNegativeNumber, readJsonBody, readNumber, readString } from "@/lib/validation";

type SessionRow = {
  id: string;
  openingCash: unknown;
  closingCash: unknown | null;
  expectedCash: unknown | null;
  cashDifference: unknown | null;
  openedAt: Date;
  closedAt: Date | null;
  openedBy: string;
  closedBy: string | null;
  opener: { name: string };
  closer: { name: string } | null;
};

/**
 * `=== null` rather than a truthiness check throughout: a session that closes
 * perfectly balanced has a cash difference of exactly 0, and the old truthiness
 * check reported that as `null` (rendered as "—") instead of MWK 0.00.
 */
function serializeSession(session: SessionRow) {
  return {
    id: session.id,
    openingCash: serializeDecimal(session.openingCash),
    closingCash: session.closingCash === null ? null : serializeDecimal(session.closingCash),
    expectedCash: session.expectedCash === null ? null : serializeDecimal(session.expectedCash),
    cashDifference: session.cashDifference === null ? null : serializeDecimal(session.cashDifference),
    openedAt: session.openedAt.toISOString(),
    closedAt: session.closedAt ? session.closedAt.toISOString() : null,
    openedBy: session.openedBy,
    openerName: session.opener.name,
    closedBy: session.closedBy,
    closerName: session.closer?.name ?? null,
  };
}

const sessionInclude = {
  opener: { select: { name: true } },
  closer: { select: { name: true } },
} as const;

export async function GET() {
  try {
    const membership = await requireShop("session:view");

    const [activeSession, recentSessions] = await Promise.all([
      prisma.dailySession.findFirst({
        where: { shopId: membership.shopId, closedAt: null },
        include: sessionInclude,
        orderBy: { openedAt: "desc" },
      }),
      prisma.dailySession.findMany({
        where: { shopId: membership.shopId },
        include: sessionInclude,
        orderBy: { openedAt: "desc" },
        take: 10,
      }),
    ]);

    return NextResponse.json({
      activeSession: activeSession ? serializeSession(activeSession) : null,
      sessions: recentSessions.map(serializeSession),
    });
  } catch (error) {
    return toErrorResponse(error, "daily session list");
  }
}

export async function POST(request: Request) {
  try {
    const membership = await requireShop("session:manage");
    const body = await readJsonBody(request);
    const action = readString(body.action).toUpperCase();

    if (action === "OPEN") {
      const openingCash = readNumber(body.openingCash ?? 0);

      if (!isNonNegativeNumber(openingCash)) {
        throw new ApiError("Opening cash must be a number greater than or equal to zero.", 400);
      }

      const alreadyOpen = await prisma.dailySession.findFirst({
        where: { shopId: membership.shopId, closedAt: null },
        select: { id: true },
      });

      if (alreadyOpen) {
        throw new ApiError("A cash session is already open for this shop.", 409);
      }

      const session = await prisma.$transaction(async (transaction) => {
        const created = await transaction.dailySession.create({
          data: {
            shopId: membership.shopId,
            openingCash,
            expectedCash: openingCash,
            openedBy: membership.userId,
          },
          include: sessionInclude,
        });

        await recordAudit(transaction, {
          shopId: membership.shopId,
          userId: membership.userId,
          action: "session.open",
          entity: "dailySession",
          entityId: created.id,
          metadata: { openingCash },
        });

        return created;
      });

      return NextResponse.json({ session: serializeSession(session) }, { status: 201 });
    }

    if (action === "CLOSE") {
      const closingCash = readNumber(body.closingCash ?? 0);

      if (!isNonNegativeNumber(closingCash)) {
        throw new ApiError("Closing cash must be a number greater than or equal to zero.", 400);
      }

      const activeSession = await prisma.dailySession.findFirst({
        where: { shopId: membership.shopId, closedAt: null },
        include: sessionInclude,
      });

      if (!activeSession) {
        throw new ApiError("There is no open cash session to close.", 404);
      }

      // Expected cash is computed, never taken from the client:
      // opening float + cash taken since opening − expenses paid out of the till.
      const [cashTaken, expensesPaid] = await Promise.all([
        prisma.payment.aggregate({
          where: { method: "CASH", sale: { shopId: membership.shopId, createdAt: { gte: activeSession.openedAt } } },
          _sum: { amount: true },
        }),
        prisma.expense.aggregate({
          where: { shopId: membership.shopId, createdAt: { gte: activeSession.openedAt } },
          _sum: { amount: true },
        }),
      ]);

      const expectedMinor =
        toMinor(String(activeSession.openingCash)) +
        toMinor(String(cashTaken._sum.amount ?? 0)) -
        toMinor(String(expensesPaid._sum.amount ?? 0));
      const differenceMinor = toMinor(closingCash) - expectedMinor;

      const closed = await prisma.$transaction(async (transaction) => {
        const updated = await transaction.dailySession.update({
          where: { id: activeSession.id },
          data: {
            closingCash,
            expectedCash: fromMinor(expectedMinor),
            cashDifference: fromMinor(differenceMinor),
            closedBy: membership.userId,
            closedAt: new Date(),
          },
          include: sessionInclude,
        });

        await recordAudit(transaction, {
          shopId: membership.shopId,
          userId: membership.userId,
          action: "session.close",
          entity: "dailySession",
          entityId: updated.id,
          metadata: {
            openingCash: serializeDecimal(activeSession.openingCash),
            cashTaken: serializeDecimal(cashTaken._sum.amount),
            expensesPaid: serializeDecimal(expensesPaid._sum.amount),
            expectedCash: fromMinor(expectedMinor),
            closingCash,
            cashDifference: fromMinor(differenceMinor),
          },
        });

        return updated;
      });

      return NextResponse.json({ session: serializeSession(closed) });
    }

    throw new ApiError("Action must be either OPEN or CLOSE.", 400);
  } catch (error) {
    return toErrorResponse(error, "daily session update");
  }
}

