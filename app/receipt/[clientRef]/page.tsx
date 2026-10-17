"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

import { getReceipt, type ReceiptRecord } from "@/lib/offline-db";

const currencyFormatter = new Intl.NumberFormat("en-MW", {
  style: "currency",
  currency: "MWK",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export default function ReceiptPage() {
  const { clientRef } = useParams<{ clientRef: string }>();
  const [receipt, setReceipt] = useState<ReceiptRecord | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    async function loadReceipt() {
      try {
        const localReceipt = await getReceipt(clientRef);
        if (localReceipt) return localReceipt;
      } catch {
        // Try the authenticated server copy if local receipt storage is unavailable.
      }

      const response = await fetch(`/api/sales/${encodeURIComponent(clientRef)}`);
      const payload = (await response.json()) as { error?: string; receipt?: ReceiptRecord };

      if (!response.ok) {
        throw new Error(payload.error || "Unable to load this receipt.");
      }

      if (!payload.receipt) {
        throw new Error("This receipt is not available.");
      }

      return payload.receipt;
    }

    loadReceipt()
      .then((record) => {
        if (active) setReceipt(record);
      })
      .catch((caughtError: unknown) => {
        if (active) {
          setError(caughtError instanceof Error ? caughtError.message : "Unable to load this receipt.");
        }
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });

    return () => {
      active = false;
    };
  }, [clientRef]);

  if (isLoading) {
    return <main className="px-4 py-12 text-center text-sm text-slate-500">Loading receipt…</main>;
  }

  if (!receipt) {
    return (
      <main className="mx-auto max-w-xl px-4 py-12">
        <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </p>
        <Link href="/pos" className="mt-5 inline-block font-semibold text-emerald-700 hover:text-emerald-800">
          Return to sales
        </Link>
      </main>
    );
  }

  const receiptDate = new Date(receipt.createdAt);
  return (
    <main className="min-h-screen bg-slate-100 px-4 py-8 text-slate-900 sm:px-6">
      <section className="printable-receipt mx-auto max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-sm print:max-w-none print:rounded-none print:border-0 print:p-0 print:shadow-none">
        <header className="border-b border-dashed border-slate-300 pb-5 text-center">
          <h1 className="text-2xl font-bold">Receipt</h1>
          <p className="mt-2 text-sm text-slate-600">Receipt #{receipt.receiptNumber}</p>
          {receipt.customerName ? <p className="mt-1 text-sm text-slate-600">Customer: {receipt.customerName}</p> : null}
        </header>

        <div className="mt-5 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
                <th scope="col" className="pb-2 pr-2 font-semibold">Item</th>
                <th scope="col" className="pb-2 px-2 text-right font-semibold">Qty</th>
                <th scope="col" className="pb-2 pl-2 text-right font-semibold">Amount</th>
              </tr>
            </thead>
            <tbody>
              {receipt.items.map((item, index) => (
                <tr key={`${item.name}-${index}`} className="border-b border-slate-100">
                  <td className="py-3 pr-2">
                    <p className="font-medium">{item.name}</p>
                    <p className="mt-0.5 text-xs text-slate-500">
                      {currencyFormatter.format(item.unitPrice)} each
                    </p>
                  </td>
                  <td className="px-2 py-3 text-right">{item.quantity} {item.unit.toLowerCase()}</td>
                  <td className="py-3 pl-2 text-right font-medium">
                    {currencyFormatter.format(item.total ?? item.unitPrice * item.quantity)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <dl className="mt-5 space-y-2 border-b border-dashed border-slate-300 pb-5 text-sm">
          <div className="flex justify-between gap-4">
            <dt className="text-slate-600">Subtotal</dt>
            <dd>{currencyFormatter.format(receipt.subtotal)}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-slate-600">Discount</dt>
            <dd>{currencyFormatter.format(receipt.discount)}</dd>
          </div>
          <div className="flex justify-between gap-4 pt-2 text-base font-bold">
            <dt>Total</dt>
            <dd>{currencyFormatter.format(receipt.total)}</dd>
          </div>
        </dl>

        <footer className="pt-5 text-center">
          <p className="text-xs text-slate-500">
            {receiptDate.toLocaleDateString("en-MW", {
              weekday: "long",
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
          </p>
          <p className="mt-1 text-sm font-semibold">
            Receipt issued at{" "}
            {receiptDate.toLocaleTimeString("en-MW", { hour: "numeric", minute: "2-digit", second: "2-digit" })}
          </p>
          <p className="mt-4 text-sm text-slate-500">Thank you for your purchase.</p>
        </footer>
      </section>

      <div className="mx-auto mt-5 flex max-w-lg flex-col gap-3 sm:flex-row print:hidden">
        <button
          type="button"
          onClick={() => window.print()}
          className="min-h-11 flex-1 rounded-xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white hover:bg-emerald-700"
        >
          Print receipt
        </button>
        <Link
          href="/pos"
          className="flex min-h-11 flex-1 items-center justify-center rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
        >
          New sale
        </Link>
      </div>
    </main>
  );
}
