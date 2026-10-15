import type { Prisma } from "@prisma/client";

type AuditClient = { auditLog: Prisma.TransactionClient["auditLog"] };

export type AuditEntry = {
  shopId: string;
  userId?: string | null;
  action: string;
  entity: string;
  entityId?: string | null;
  metadata?: Prisma.InputJsonValue;
};

/**
 * Writes an immutable audit row. This system moves cash and stock, so every
 * state change that a shopkeeper could later be asked to explain must leave a
 * trace: sales, stock adjustments, expenses and cash sessions.
 *
 * Call this as the final statement inside the same transaction as the change it
 * describes, so an operation can never commit without its audit row.
 */
export async function recordAudit(client: AuditClient, entry: AuditEntry): Promise<void> {
  await client.auditLog.create({
    data: {
      shopId: entry.shopId,
      userId: entry.userId ?? null,
      action: entry.action,
      entity: entry.entity,
      entityId: entry.entityId ?? null,
      metadata: entry.metadata,
    },
  });
}
