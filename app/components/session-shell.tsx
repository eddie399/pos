"use client";

import { SessionProvider } from "next-auth/react";
import type { ReactNode } from "react";

import AppShell from "@/app/components/app-shell";

/**
 * next-auth needs its context above every screen that calls `useSession` or
 * `signOut` (the app shell does both). Kept in its own client component so the
 * root layout can stay a server component.
 */
export default function SessionShell({ children }: { children: ReactNode }) {
  return (
    <SessionProvider>
      <AppShell>{children}</AppShell>
    </SessionProvider>
  );
}
