"use client";

import { useEffect, useState } from "react";

import PageHeader from "@/app/components/page-header";
import { discardQueuedSale, getQueuedSales, syncPendingSales, type QueuedSale } from "@/lib/offline-db";

export default function SyncPage() {
  const [queuedSales, setQueuedSales] = useState<QueuedSale[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  async function loadQueue() {
    setQueuedSales(await getQueuedSales());
  }

  useEffect(() => {
    let active = true;

    getQueuedSales()
      .then((queued) => {
        if (active) {
          setQueuedSales(queued);
        }
      })
      .catch(() => {
        if (active) {
          setError("Unable to load the offline sync queue.");
        }
      });

    return () => {
      active = false;
    };
  }, []);

  async function handleDiscard(id: string) {
    setError("");
    setNotice("");
    await discardQueuedSale(id);
    await loadQueue();
    setNotice("Queued sale discarded. Nothing was recorded on the server.");
  }

  async function handleSync() {
    setIsSyncing(true);
    setError("");
    setNotice("");

    try {
      const result = await syncPendingSales();
      await loadQueue();

      if (result.failed > 0) {
        setError(
          `${result.failed} queued sale${result.failed === 1 ? "" : "s"} could not be saved (${
            result.lastError ?? "the server rejected it"
          }). Fix the cause and retry, or discard ${result.failed === 1 ? "it" : "them"}.`,
        );
        return;
      }

      if (result.synced > 0) {
        setNotice(`${result.synced} queued sale${result.synced === 1 ? "" : "s"} synced successfully.`);
      } else if (result.pending > 0) {
        setNotice("Still offline, or the server was unreachable. Your sales are safe on this device.");
      } else {
        setNotice("The offline queue is empty.");
      }
    } catch {
      setError("Unable to sync the offline queue.");
    } finally {
      setIsSyncing(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-8 text-slate-900 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl">
        <PageHeader eyebrow="Offline sync" title="Queued sales" />

        {error ? <p className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p> : null}
        {notice ? <p className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{notice}</p> : null}

        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-xl font-bold">Offline queue</h2>
              <p className="mt-1 text-sm text-slate-500">Saved purchases stay here until the connection is restored.</p>
            </div>

            <button
              type="button"
              onClick={handleSync}
              disabled={isSyncing}
              className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isSyncing ? "Syncing..." : "Sync queue"}
            </button>
          </div>

          <div className="mt-5 overflow-x-auto">
            <table className="w-full min-w-160 text-left text-sm">
              <thead className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-3 py-3">Queued</th>
                  <th className="px-3 py-3">Status</th>
                  <th className="px-3 py-3">Sale</th>
                  <th className="px-3 py-3">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {queuedSales.map((sale) => (
                  <tr key={sale.id}>
                    <td className="px-3 py-4 text-slate-700">{new Date(sale.createdAt).toLocaleString()}</td>
                    <td className="px-3 py-4">
                      <span
                        className={
                          sale.status === "pending"
                            ? "rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-700"
                            : "rounded-full bg-red-100 px-2.5 py-1 text-xs font-semibold text-red-700"
                        }
                      >
                        {sale.status}
                      </span>
                      {sale.lastError ? <p className="mt-1 text-xs text-red-600">{sale.lastError}</p> : null}
                    </td>
                    <td className="px-3 py-4 text-slate-600">
                      <p className="font-medium text-slate-800">
                        {sale.payload.items?.length ?? 0} item{(sale.payload.items?.length ?? 0) === 1 ? "" : "s"} ·{" "}
                        {sale.payload.paymentMethod ?? "CASH"}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">Receipt {sale.id.slice(0, 8).toUpperCase()}</p>
                    </td>
                    <td className="px-3 py-4">
                      {sale.status === "failed" ? (
                        <button
                          type="button"
                          onClick={() => handleDiscard(sale.id)}
                          className="rounded-lg bg-slate-100 px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-200"
                        >
                          Discard
                        </button>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {!queuedSales.length ? (
              <p className="py-10 text-center text-sm text-slate-500">No queued sales right now.</p>
            ) : null}
          </div>
        </section>
      </div>
    </main>
  );
}
