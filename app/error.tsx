"use client";

import { useEffect } from "react";

/**
 * Error boundary for the app segment.
 *
 * Note: Next.js 16 passes `retry`, not the `reset` prop used by earlier
 * versions — see node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/error.md
 */
export default function ErrorScreen({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  useEffect(() => {
    console.error("unhandled app error", error);
  }, [error]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-8">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-600">Duka POS</p>
        <h1 className="mt-3 text-2xl font-bold text-slate-900">This screen failed to load</h1>
        <p className="mt-3 text-sm text-slate-600">
          Anything you already scanned or queued is stored on this device and will still sync to the shop.
        </p>
        <button
          type="button"
          onClick={() => retry()}
          className="mt-6 w-full rounded-xl bg-emerald-600 px-4 py-3 font-medium text-white transition hover:bg-emerald-500"
        >
          Try again
        </button>
        <a href="/dashboard" className="mt-3 inline-block text-sm font-medium text-slate-600 hover:text-slate-800">
          Back to dashboard
        </a>
      </div>
    </main>
  );
}
