import Dexie, { type Table } from "dexie";

import { receiptNumberFor } from "@/lib/ids";

/**
 * The device outbox.
 *
 * Offline-first rules encoded here:
 *
 * 1. The device mints the sale identity (`clientRef`). The server upserts on it,
 *    so retrying a sale can never book it twice.
 * 2. A sale is only removed from the queue once the server confirms it.
 * 3. A sale the server *rejects* (4xx) is a business error, not a network
 *    problem: it is surfaced to the cashier instead of retried forever.
 * 4. A network failure or a 5xx leaves the sale queued for the next attempt.
 */

export type SaleLinePayload = {
  productId: string;
  quantity: number;
};

export type SalePayload = {
  clientRef: string;
  items: SaleLinePayload[];
  customerId: string | null;
  discount: number;
  paymentMethod: string;
};

export type QueuedSale = {
  /** Primary key: the device-minted client reference (aka `clientRef`). */
  id: string;
  createdAt: number;
  status: "pending" | "failed";
  attempts: number;
  lastError: string | null;
  payload: SalePayload;
};

export type ReceiptRecord = {
  id: string;
  receiptNumber: string;
  createdAt: number;
  customerName: string | null;
  items: Array<{
    name: string;
    quantity: number;
    unitPrice: number;
    unit: string;
    total?: number;
  }>;
  subtotal: number;
  discount: number;
  total: number;
};

export type SubmitSaleResult =
  | { status: "synced"; clientRef: string; receiptNumber: string }
  | { status: "queued"; clientRef: string; receiptNumber: string }
  | { status: "rejected"; clientRef: string; message: string };

export type SyncResult = {
  synced: number;
  pending: number;
  failed: number;
  lastError: string | null;
};

/** Stop auto-retrying after this many attempts and show the sale for a human. */
const MAX_ATTEMPTS = 8;

class DukaOfflineDb extends Dexie {
  pendingSales!: Table<QueuedSale, string>;
  receipts!: Table<ReceiptRecord, string>;

  constructor() {
    super("duka-offline-db");

    // Keep the original store name so already-queued sales survive upgrades.
    this.version(1).stores({
      pendingSales: "id, createdAt, status",
    });

    /**
     * Version 1 rows could sit in the queue forever with status "synced" while
     * the old sync routine re-posted every row it found — the cause of
     * duplicate sales on the server. Deleting already-synced rows on upgrade
     * cleans up that history instead of replaying it.
     */
    this.version(2)
      .stores({
        pendingSales: "id, createdAt, status",
      })
      .upgrade((transaction) => transaction.table("pendingSales").where("status").equals("synced").delete());

    this.version(3).stores({
      pendingSales: "id, createdAt, status",
      receipts: "id, createdAt",
    });
  }
}

export const offlineDb = new DukaOfflineDb();


function isOnline() {
  return typeof navigator === "undefined" || navigator.onLine;
}

/** Everything in the outbox, newest first — used by the sync screen. */
export async function getQueuedSales(): Promise<QueuedSale[]> {
  return offlineDb.pendingSales.orderBy("createdAt").reverse().toArray();
}

/** Work waiting to be pushed, oldest first so sales sync in the order they happened. */
export async function getPendingSales(): Promise<QueuedSale[]> {
  return offlineDb.pendingSales.where("status").equals("pending").sortBy("createdAt");
}

export async function discardQueuedSale(id: string): Promise<void> {
  await offlineDb.pendingSales.delete(id);
}

export async function saveReceipt(receipt: ReceiptRecord): Promise<void> {
  await offlineDb.receipts.put(receipt);
}

export async function getReceipt(id: string): Promise<ReceiptRecord | undefined> {
  return offlineDb.receipts.get(id);
}

export async function deleteReceipt(id: string): Promise<void> {
  await offlineDb.receipts.delete(id);
}

async function markFailed(id: string, message: string): Promise<void> {
  await offlineDb.pendingSales.update(id, { status: "failed", lastError: message });
}

type PushOutcome = { kind: "synced" } | { kind: "rejected"; message: string } | { kind: "retry"; message: string };

async function pushSale(sale: QueuedSale): Promise<PushOutcome> {
  try {
    const response = await fetch("/api/sales", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...sale.payload, clientRef: sale.id }),
    });

    if (response.ok) {
      return { kind: "synced" };
    }

    const payload = (await response.json().catch(() => ({}))) as { error?: string };
    const message = payload.error ?? `The server rejected this sale (${response.status}).`;

    // 5xx is the server's problem and worth retrying; a 4xx will fail identically.
    return response.status >= 500 ? { kind: "retry", message } : { kind: "rejected", message };
  } catch {
    return { kind: "retry", message: "No connection." };
  }
}

export async function syncPendingSales(): Promise<SyncResult> {
  const queued = await getPendingSales();
  let synced = 0;
  let lastError: string | null = null;

  for (const sale of queued) {
    if (!isOnline()) {
      lastError = "No connection.";
      break;
    }

    const attempts = sale.attempts + 1;
    await offlineDb.pendingSales.update(sale.id, { attempts });

    const outcome = await pushSale(sale);

    if (outcome.kind === "synced") {
      await discardQueuedSale(sale.id);
      synced += 1;
      continue;
    }

    lastError = outcome.message;

    if (outcome.kind === "rejected") {
      await markFailed(sale.id, outcome.message);
      continue;
    }

    if (attempts >= MAX_ATTEMPTS) {
      await markFailed(sale.id, `${outcome.message} Gave up after ${MAX_ATTEMPTS} attempts.`);
    }

    break;
  }

  const remaining = await offlineDb.pendingSales.toArray();

  return {
    synced,
    pending: remaining.filter((sale) => sale.status === "pending").length,
    failed: remaining.filter((sale) => sale.status === "failed").length,
    lastError,
  };
}

/**
 * The only way a sale is ever submitted: write the outbox first, then try the
 * network. A crash or a dead battery mid-request can therefore never lose a sale.
 */
export async function submitSale(payload: SalePayload): Promise<SubmitSaleResult> {
  const record: QueuedSale = {
    id: payload.clientRef,
    createdAt: Date.now(),
    status: "pending",
    attempts: 0,
    lastError: null,
    payload,
  };

  await offlineDb.pendingSales.put(record);

  const receiptNumber = receiptNumberFor(record.id);

  if (!isOnline()) {
    return { status: "queued", clientRef: record.id, receiptNumber };
  }

  const outcome = await pushSale(record);

  if (outcome.kind === "synced") {
    await discardQueuedSale(record.id);
    return { status: "synced", clientRef: record.id, receiptNumber };
  }

  if (outcome.kind === "retry") {
    // Network or server hiccup: the sale stays queued and syncs automatically.
    return { status: "queued", clientRef: record.id, receiptNumber };
  }

  // Business rejection: nothing was recorded server-side and nothing is retried.
  await discardQueuedSale(record.id);
  return { status: "rejected", clientRef: record.id, message: outcome.message };
}
