"use client";

import { useEffect, useState } from "react";

import PageHeader from "@/app/components/page-header";

type SaleSummary = {
  id: string;
  receiptNumber: string;
  cashierName: string;
  customerName: string;
  subtotal: string;
  total: string;
  status: string;
  createdAt: string;
};

type ReportSummary = {
  totalSales: number;
  todaySales: number;
  totalRevenue: string;
  todayRevenue: string;
  cashSales: string;
  creditSales: string;
  expenses: string;
  lowStockItems: number;
};

type ReportPayload = { summary: ReportSummary; sales: SaleSummary[] };

/** Pure fetch: keeping state updates out of here is what keeps the effect clean. */
async function fetchReports(): Promise<ReportPayload> {
  const response = await fetch("/api/reports");
  const payload = await response.json();

  if (!response.ok) {
    throw new Error(payload.error || "Unable to load report data.");
  }

  return {
    summary: {
      totalSales: Number(payload.summary?.totalSales ?? 0),
      todaySales: Number(payload.summary?.todaySales ?? 0),
      totalRevenue: String(payload.summary?.totalRevenue ?? "0"),
      todayRevenue: String(payload.summary?.todayRevenue ?? "0"),
      cashSales: String(payload.summary?.cashSales ?? "0"),
      creditSales: String(payload.summary?.creditSales ?? "0"),
      expenses: String(payload.summary?.expenses ?? "0"),
      lowStockItems: Number(payload.summary?.lowStockItems ?? 0),
    },
    sales: payload.sales ?? [],
  };
}

export default function ReportsPage() {
  const [summary, setSummary] = useState<ReportSummary>({
    totalSales: 0,
    todaySales: 0,
    totalRevenue: "0",
    todayRevenue: "0",
    cashSales: "0",
    creditSales: "0",
    expenses: "0",
    lowStockItems: 0,
  });
  const [recentSales, setRecentSales] = useState<SaleSummary[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    fetchReports()
      .then((payload) => {
        if (!active) return;
        setSummary(payload.summary);
        setRecentSales(payload.sales);
      })
      .catch((caughtError) => {
        if (active) {
          setError(caughtError instanceof Error ? caughtError.message : "Unable to load reports.");
        }
      });

    return () => {
      active = false;
    };
  }, []);

  const money = (value: string | number) => `MWK ${Number(value).toFixed(2)}`;

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-8 text-slate-900 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <PageHeader eyebrow="Reports" title="Sales overview" />

        {error ? <p className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p> : null}

        <section className="grid gap-4 md:grid-cols-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">Total sales</p>
            <p className="mt-3 text-3xl font-bold text-slate-900">{summary.totalSales}</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">Today</p>
            <p className="mt-3 text-3xl font-bold text-slate-900">{summary.todaySales}</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">Gross revenue</p>
            <p className="mt-3 text-3xl font-bold text-slate-900">{money(summary.totalRevenue)}</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">Low stock</p>
            <p className="mt-3 text-3xl font-bold text-amber-700">{summary.lowStockItems}</p>
          </div>
        </section>

        <section className="mt-6 grid gap-4 md:grid-cols-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">Today revenue</p>
            <p className="mt-3 text-2xl font-bold text-emerald-700">{money(summary.todayRevenue)}</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">Cash sales</p>
            <p className="mt-3 text-2xl font-bold text-slate-900">{money(summary.cashSales)}</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">Credit sales</p>
            <p className="mt-3 text-2xl font-bold text-amber-700">{money(summary.creditSales)}</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">Expenses</p>
            <p className="mt-3 text-2xl font-bold text-slate-900">{money(summary.expenses)}</p>
          </div>
        </section>

        <section className="mt-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-bold">Recent sales</h2>

          <div className="mt-5 overflow-x-auto">
            <table className="w-full min-w-190 text-left text-sm">
              <thead className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-3 py-3">Receipt</th>
                  <th className="px-3 py-3">Customer</th>
                  <th className="px-3 py-3">Cashier</th>
                  <th className="px-3 py-3">Total</th>
                  <th className="px-3 py-3">Status</th>
                  <th className="px-3 py-3">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {recentSales.map((sale) => (
                  <tr key={sale.id}>
                    <td className="px-3 py-4 font-medium text-slate-900">{sale.receiptNumber}</td>
                    <td className="px-3 py-4 text-slate-700">{sale.customerName}</td>
                    <td className="px-3 py-4 text-slate-700">{sale.cashierName}</td>
                    <td className="px-3 py-4 text-slate-900">{money(sale.total)}</td>
                    <td className="px-3 py-4">
                      <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                        {sale.status}
                      </span>
                    </td>
                    <td className="px-3 py-4 text-slate-600">{new Date(sale.createdAt).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {!recentSales.length ? (
              <p className="py-10 text-center text-sm text-slate-500">No sales have been recorded yet.</p>
            ) : null}
          </div>
        </section>
      </div>
    </main>
  );
}
