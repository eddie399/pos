import Link from "next/link";

const phaseChecklist = [
  "Project setup and architecture",
  "Authentication and shop/user system",
  "Database and product catalogue",
  "POS and cart",
  "Checkout and payments",
  "Inventory and stock movements",
  "Customers and credit",
  "Sales and reports",
  "Offline sync and PWA foundation",
  "Security, testing, and optimization",
];

export default function Home() {
  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="rounded-3xl border border-emerald-100 bg-white p-8 shadow-sm sm:p-12">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-2xl">
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-emerald-600">
                Duka POS
              </p>
              <h1 className="mt-3 text-4xl font-black tracking-tight text-slate-900 sm:text-5xl">
                Your shop, simplified.
              </h1>
              <p className="mt-4 max-w-xl text-lg text-slate-600">
                A mobile-first POS and shop management system designed for small grocery and convenience shops in Malawi.
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <Link
                href="/login"
                className="rounded-xl bg-emerald-600 px-5 py-3 text-center font-medium text-white transition hover:bg-emerald-500"
              >
                Login
              </Link>
              <Link
                href="/setup-shop"
                className="rounded-xl border border-slate-200 bg-slate-50 px-5 py-3 text-center font-medium text-slate-700 transition hover:bg-slate-100"
              >
                Set up shop
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-16 sm:px-6 lg:px-8">
        <div className="grid gap-5 md:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">Focus</p>
            <h2 className="mt-3 text-xl font-bold text-slate-900">Fast POS</h2>
            <p className="mt-2 text-sm text-slate-600">
              Cart, barcode scanning, and checkout optimized for busy sales moments and basic smartphone hardware.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">Operations</p>
            <h2 className="mt-3 text-xl font-bold text-slate-900">Inventory + credit</h2>
            <p className="mt-2 text-sm text-slate-600">
              Track stock movements, customer credit, and financial activity with a ledger-first model.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">Reliability</p>
            <h2 className="mt-3 text-xl font-bold text-slate-900">Offline-ready</h2>
            <p className="mt-2 text-sm text-slate-600">
              Allow sales to continue without internet and sync later with idempotent, safe reconciliation.
            </p>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-20 sm:px-6 lg:px-8">
        <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">Phase 1</p>
              <h2 className="mt-2 text-2xl font-bold text-slate-900">Foundation and architecture</h2>
            </div>
            <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">
              In progress
            </span>
          </div>

          <ul className="mt-8 grid gap-3 md:grid-cols-2">
            {phaseChecklist.map((item) => (
              <li key={item} className="flex items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
                <span className="mt-0.5 inline-flex h-5 w-5 items-center justify-center rounded-full bg-emerald-600 text-[10px] font-bold text-white">
                  ✓
                </span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </main>
  );
}
