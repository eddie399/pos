"use client";

import Link from "next/link";
import type { ReactNode } from "react";

type AuthCardProps = {
  eyebrow: string;
  title: string;
  description?: string;
  notice?: ReactNode;
  error?: string;
  children: ReactNode;
  footer?: ReactNode;
};

/**
 * Shared centred card for the two public auth-adjacent screens (sign-in and
 * shop setup): one thumb-friendly column, 44px+ inputs, no competing chrome.
 */
export default function AuthCard({ eyebrow, title, description, notice, error, children, footer }: AuthCardProps) {
  return (
    <main className="flex min-h-[calc(100dvh-4rem)] items-center justify-center px-4 py-10 sm:px-6">
      <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <div className="text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-600">{eyebrow}</p>
          <h1 className="mt-2 text-2xl font-bold text-slate-900 sm:text-3xl">{title}</h1>
          {description ? <p className="mt-2 text-sm text-slate-600">{description}</p> : null}
        </div>

        {notice ? (
          <div className="mt-5 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-sm text-emerald-700">
            {notice}
          </div>
        ) : null}

        {error ? (
          <p role="alert" className="mt-5 rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700">
            {error}
          </p>
        ) : null}

        <div className="mt-6">{children}</div>

        {footer ? <div className="mt-5 text-center text-sm text-slate-600">{footer}</div> : null}
      </div>
    </main>
  );
}

export function AuthField({
  label,
  children,
  hint,
}: {
  label: string;
  children: ReactNode;
  hint?: string;
}) {
  return (
    <label className="block text-sm font-medium text-slate-700">
      {label}
      <span className="mt-2 block">{children}</span>
      {hint ? <span className="mt-1 block text-xs font-normal text-slate-500">{hint}</span> : null}
    </label>
  );
}

export const authInputClassName =
  "min-h-11 w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2.5 text-base text-slate-900 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200";

export function AuthSubmitButton({ pendingLabel, label, pending }: { pendingLabel: string; label: string; pending: boolean }) {
  return (
    <button
      type="submit"
      disabled={pending}
      className="min-h-12 w-full rounded-xl bg-emerald-600 px-4 py-3 text-base font-semibold text-white transition hover:bg-emerald-500 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-70"
    >
      {pending ? pendingLabel : label}
    </button>
  );
}

export function AuthFooterLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link href={href} className="font-semibold text-emerald-700 underline-offset-2 hover:underline">
      {children}
    </Link>
  );
}
