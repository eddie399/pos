"use client";

import type { ReactNode } from "react";

import { useOnlineStatus } from "@/app/components/use-online-status";

type SyncBannerProps = {
  pendingCount?: number;
  className?: string;
  children?: ReactNode;
};

/**
 * Phone-first connectivity banner. Shows offline state instantly (from
 * `navigator.onLine`, not a network round-trip) plus how many sales are still
 * waiting on this device, so a cashier never wonders whether the till is safe.
 */
export default function SyncBanner({ pendingCount = 0, className = "", children }: SyncBannerProps) {
  const isOnline = useOnlineStatus();

  if (isOnline && pendingCount <= 0 && !children) {
    return null;
  }

  return (
    <p
      role="status"
      className={`rounded-xl border px-4 py-3 text-sm font-medium ${
        isOnline
          ? "border-amber-200 bg-amber-50 text-amber-800"
          : "border-slate-900 bg-slate-900 text-white"
      } ${className}`}
    >
      {!isOnline ? (
        <>
          You&apos;re offline — sales stay safe on this device
          {pendingCount > 0 ? ` (${pendingCount} queued)` : ""}.
        </>
      ) : (
        <>{children ?? `${pendingCount} sale${pendingCount === 1 ? "" : "s"} waiting to sync.`}</>
      )}
    </p>
  );
}
