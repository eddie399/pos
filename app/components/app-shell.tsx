"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { useState, type ReactNode } from "react";

import BrandMark from "@/app/components/brand-mark";
import { useOnlineStatus } from "@/app/components/use-online-status";

const primaryLinks = [
  { href: "/dashboard", label: "Home" },
  { href: "/pos", label: "Sell" },
  { href: "/products", label: "Stock" },
  { href: "/sync", label: "Sync" },
  { href: "/cash", label: "Cash" },
];

const secondaryLinks = [
  { href: "/customers", label: "Customers" },
  { href: "/expenses", label: "Expenses" },
  { href: "/reports", label: "Reports" },
  { href: "/settings", label: "Settings" },
];

const shellHiddenPrefixes = ["/login", "/setup-shop", "/receipt"];

function SellIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} className="h-6 w-6" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 9V7a2 2 0 0 1 2-2h2M16 5h2a2 2 0 0 1 2 2v2M20 15v2a2 2 0 0 1-2 2h-2M8 19H6a2 2 0 0 1-2-2v-2M3 12h18" />
    </svg>
  );
}

function TabIcon({ href, active }: { href: string; active: boolean }) {
  const strokeWidth = active ? 2.4 : 2;

  if (href === "/dashboard") {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} className="h-6 w-6" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z" />
      </svg>
    );
  }

  if (href === "/products") {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} className="h-6 w-6" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 7.5 12 3.5l8 4v9l-8 4-8-4zM4 7.5 12 11.5l8-4M12 11.5v9" />
      </svg>
    );
  }

  if (href === "/sync") {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} className="h-6 w-6" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 9a8 8 0 0 1 14-3l2 2M20 15a8 8 0 0 1-14 3l-2-2M18 3v5h-5M6 21v-5h5" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} className="h-6 w-6" aria-hidden="true">
      <rect x="3" y="6.5" width="18" height="11" rx="2" />
      <circle cx="12" cy="12" r="2.6" />
      <path strokeLinecap="round" d="M6.5 9.5h.01M17.5 14.5h.01" />
    </svg>
  );
}

/**
 * Single phone-first shell for every screen: offline banner, top bar with
 * sign-out, and a bottom tab bar with 44px+ tap targets. Public pages
 * (login, landing, setup) render without the shell chrome.
 *
 * The layout contract: the top bar is `sticky` and the bottom nav is `fixed`,
 * so <main> on each screen pads for the bar (pt-16/pt-24) rather than painting
 * another page-level header with its own Dashboard/POS link buttons.
 */
export default function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { status } = useSession();
  const isOnline = useOnlineStatus();

  const [isSigningOut, setIsSigningOut] = useState(false);
  const [signOutError, setSignOutError] = useState("");

  async function handleSignOut() {
    setSignOutError("");
    setIsSigningOut(true);

    try {
      await signOut({ redirect: false, callbackUrl: "/login" });
      window.location.replace("/login");
    } catch {
      setSignOutError("Unable to sign out. Please try again.");
      setIsSigningOut(false);
    }
  }

  if (shellHiddenPrefixes.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)) || pathname === "/") {
    return <>{children}</>;
  }

  return (
    <div className="min-h-full w-full min-w-0 max-w-full overflow-x-clip">
      {!isOnline ? (
        <p
          role="status"
          className="sticky top-0 z-40 bg-amber-500 px-4 py-2 text-center text-sm font-semibold text-white"
        >
          You are offline. Sales are saved on this device and sync automatically.
        </p>
      ) : null}

      <div className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex w-full min-w-0 max-w-6xl items-center justify-between gap-2 px-3 py-2.5 sm:gap-3 sm:px-6">
          <Link href="/dashboard" className="flex min-w-0 items-center gap-2.5">
            <BrandMark className="h-9 w-9 text-xl" />
            <span className="min-w-0">
              <span className="block truncate text-[10px] font-semibold uppercase tracking-[0.12em] text-emerald-600 sm:text-[11px] sm:tracking-[0.2em]">Duka POS</span>
            </span>
          </Link>

          <nav aria-label="Secondary" className="hidden items-center gap-1 lg:flex">
            {secondaryLinks.map((link) => {
              const isActive = pathname === link.href || pathname.startsWith(`${link.href}/`);

              return (
                <Link
                  key={link.href}
                  href={link.href}
                  aria-current={isActive ? "page" : undefined}
                  className={`rounded-lg px-3 py-2 text-sm font-semibold transition ${
                    isActive ? "bg-emerald-50 text-emerald-700" : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>

          {status === "authenticated" ? (
            <button
              type="button"
              onClick={handleSignOut}
              disabled={isSigningOut}
              className="min-h-10 shrink-0 rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-70 sm:px-3 sm:text-sm"
            >
              {isSigningOut ? "…" : "Sign out"}
            </button>
          ) : null}
        </div>
        {signOutError ? (
          <p role="alert" className="border-t border-red-100 bg-red-50 px-4 py-2 text-center text-xs text-red-700">
            {signOutError}
          </p>
        ) : null}

        {/*
          Below `lg` the row above has no room for the secondary links, so they
          get their own horizontally scrollable strip. Without this, Customers,
          Expenses, Reports and Settings were unreachable on a phone.
        */}
        <nav aria-label="Secondary" className="lg:hidden">
          <ul className="mx-auto flex max-w-6xl gap-1 overflow-x-auto px-4 pb-2 sm:px-6">
            {secondaryLinks.map((link) => {
              const isActive = pathname === link.href || pathname.startsWith(`${link.href}/`);

              return (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    aria-current={isActive ? "page" : undefined}
                    className={`block whitespace-nowrap rounded-lg px-3 py-1.5 text-sm font-semibold transition ${
                      isActive ? "bg-emerald-50 text-emerald-700" : "text-slate-600"
                    }`}
                  >
                    {link.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      </div>

      <div className="w-full min-w-0 max-w-full pb-24 md:pb-10">{children}</div>

      <nav aria-label="Primary" className="fixed inset-x-0 bottom-0 z-40 w-full border-t border-slate-200 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden">
        <ul className="mx-auto grid w-full max-w-6xl grid-cols-5">
          {primaryLinks.map((link) => {
            const isActive = pathname === link.href || pathname.startsWith(`${link.href}/`);
            const isSell = link.href === "/pos";

            return (
              <li key={link.href}>
                <Link
                  href={link.href}
                  aria-current={isActive ? "page" : undefined}
                  className={`flex min-h-17 flex-col items-center justify-center gap-1 px-1 py-2 text-xs font-semibold transition ${
                    isActive ? "text-emerald-700" : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  <span
                    aria-hidden="true"
                    className={`flex items-center justify-center rounded-2xl transition ${
                      isSell
                        ? `h-11 w-14 ${isActive ? "bg-emerald-600 text-white" : "bg-slate-900 text-white"}`
                        : "h-8 w-8"
                    }`}
                  >
                    {isSell ? <SellIcon /> : <TabIcon href={link.href} active={isActive} />}
                  </span>
                  {link.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}
