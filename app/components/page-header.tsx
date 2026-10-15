import type { ReactNode } from "react";

/**
 * The single page-header shape used by every screen.
 *
 * Deliberately no navigation links: `AppShell` already owns navigation (top
 * bar on desktop, bottom tab bar on mobile). Pages that rendered their own
 * "Dashboard" / "POS" buttons were duplicating that chrome, so those are gone.
 * An `action` slot stays for genuinely page-specific controls only (e.g. a
 * primary submit button on a form), never for links that already exist in the
 * shell.
 */
export default function PageHeader({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow: string;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <header className="mb-6 flex flex-col gap-3 sm:mb-8 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-600">{eyebrow}</p>
        <h1 className="mt-1 text-2xl font-bold leading-tight text-slate-900 sm:text-3xl">{title}</h1>
        {description ? <p className="mt-1.5 text-sm text-slate-600">{description}</p> : null}
      </div>

      {action ? <div className="flex shrink-0 items-center gap-2">{action}</div> : null}
    </header>
  );
}
