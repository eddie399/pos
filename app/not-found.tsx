import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-8">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-600">Duka POS</p>
        <h1 className="mt-3 text-2xl font-bold text-slate-900">That screen does not exist</h1>
        <p className="mt-3 text-sm text-slate-600">
          Check the address, or head back to the till and keep selling.
        </p>
        <Link
          href="/dashboard"
          className="mt-6 inline-block w-full rounded-xl bg-emerald-600 px-4 py-3 font-medium text-white transition hover:bg-emerald-500"
        >
          Back to dashboard
        </Link>
      </div>
    </main>
  );
}
