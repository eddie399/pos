import Link from "next/link";
import { redirect } from "next/navigation";
import { BarChart3, Banknote, Package, Receipt, RefreshCw, Settings, ShoppingCart, Users } from "lucide-react";

import PageHeader from "@/app/components/page-header";
import { getCurrentShop } from "@/lib/current-shop";
import { formatMoney } from "@/lib/money";
import { getLowStockProducts, getRecentSales, getShopSummary } from "@/lib/reports";

export const dynamic = "force-dynamic";

const quickActions = [
  { href: "/pos", label: "New sale", icon: ShoppingCart, primary: true },
  { href: "/products", label: "Products", icon: Package },
  { href: "/customers", label: "Customers", icon: Users },
  { href: "/cash", label: "Cash", icon: Banknote },
  { href: "/expenses", label: "Expenses", icon: Receipt },
  { href: "/reports", label: "Reports", icon: BarChart3 },
  { href: "/sync", label: "Sync", icon: RefreshCw },
  { href: "/settings", label: "Settings", icon: Settings },
];

export default async function DashboardPage() {
  const membership = await getCurrentShop();

  // The proxy already redirects anonymous visitors; this also covers a signed-in
  // user who has not been attached to a shop yet.
  if (!membership) {
    redirect("/login");
  }

  const [summary, recentSales, lowStock] = await Promise.all([
    getShopSummary(membership.shopId),
    getRecentSales(membership.shopId, 5),
    getLowStockProducts(membership.shopId),
  ]);

  const stats = [
    {
      label: "Sales today",
      value: formatMoney(summary.todayRevenue),
      hint: `${summary.todaySales} transaction${summary.todaySales === 1 ? "" : "s"}`,
    },
    {
      label: "Revenue to date",
      value: formatMoney(summary.totalRevenue),
      hint: `${summary.totalSales} sale${summary.totalSales === 1 ? "" : "s"} recorded`,
    },
    {
      label: "Owed on credit",
      value: formatMoney(summary.creditSales),
      hint: "Carried by customers",
    },
    {
      label: "Expenses",
      value: formatMoney(summary.expenses),
      hint: "All time",
    },
  ];

  return (
    <main className="min-h-screen overflow-x-hidden bg-slate-100 px-4 py-8 text-slate-900 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl overflow-hidden">
        <PageHeader eyebrow="Duka POS" title="Shop dashboard" />

        <nav aria-label="Quick actions" className="mb-7 flex flex-wrap gap-2">
          {quickActions.map(({ href, label, icon: Icon, primary }) => (
            <Link
              key={href}
              href={href}
              className={`inline-flex min-h-11 items-center gap-2 rounded-lg border px-3.5 py-2 text-sm font-semibold transition ${
                primary
                  ? "border-emerald-700 bg-emerald-700 text-white hover:bg-emerald-800"
                  : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50"
              }`}
            >
              <Icon aria-hidden="true" className="h-4 w-4" />
              {label}
            </Link>
          ))}
        </nav>

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {stats.map((stat) => (
            <div key={stat.label} className="min-w-0 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
              <p className="text-sm text-slate-500">{stat.label}</p>
              <p className="mt-3 text-2xl font-bold leading-tight text-slate-900 sm:text-3xl">{stat.value}</p>
              <p className="mt-1 text-xs text-slate-500">{stat.hint}</p>
            </div>
          ))}
        </section>

        <section className="mt-8 grid gap-6 lg:grid-cols-[1.4fr_0.8fr]">
          <div className="min-w-0 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
            <div className="mb-4 flex items-center justify-between gap-3">
              <h2 className="text-lg font-bold sm:text-xl">Recent sales</h2>
              <Link href="/reports" className="shrink-0 rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                View reports
              </Link>
            </div>

            {recentSales.length ? (
              <ul className="space-y-3">
                {recentSales.map((sale) => (
                  <li
                    key={sale.id}
                    className="flex min-w-0 items-center gap-3 rounded-xl bg-slate-50 p-3 text-sm text-slate-700"
                  >
                    <span className="mt-1 inline-flex h-2.5 w-2.5 shrink-0 rounded-full bg-emerald-500" />
                    <span className="min-w-0 flex-1 wrap-break-word">
                      {sale.receiptNumber} · {sale.customerName} · {formatMoney(sale.total)}
                    </span>
                    <Link
                      href={`/receipt/${encodeURIComponent(sale.id)}`}
                      className="shrink-0 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-emerald-700 hover:bg-emerald-50"
                    >
                      Reprint
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="rounded-xl bg-slate-50 p-3 text-sm text-slate-500">
                No sales recorded yet. Today&apos;s transactions will appear here.
              </p>
            )}
          </div>

          <div className="min-w-0 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
            <div className="mb-4 flex items-center justify-between gap-3">
              <h2 className="text-lg font-bold sm:text-xl">Restock alerts</h2>
              <span className="shrink-0 rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-700">
                {summary.lowStockItems} low
              </span>
            </div>

            {lowStock.length ? (
              <ul className="space-y-3">
                {lowStock.map((product) => (
                  <li
                    key={product.id}
                    className="flex min-w-0 items-start justify-between gap-3 rounded-xl bg-slate-50 p-3 text-sm text-slate-700"
                  >
                    <span className="min-w-0 wrap-break-word font-medium text-slate-900">{product.name}</span>
                    <span className="shrink-0 rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-700">
                      {product.stockQuantity} left
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="rounded-xl bg-slate-50 p-3 text-sm text-slate-500">
                Stock levels look healthy. Products at or below their low-stock threshold will appear here.
              </p>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
