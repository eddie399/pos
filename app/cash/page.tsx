"use client";

import { useEffect, useMemo, useState } from "react";

import PageHeader from "@/app/components/page-header";

type Session = {
  id: string;
  openingCash: string;
  closingCash: string | null;
  expectedCash: string | null;
  cashDifference: string | null;
  openedAt: string;
  closedAt: string | null;
  openerName: string;
  closerName: string | null;
};

const money = new Intl.NumberFormat("en-US", { style: "currency", currency: "MWK", minimumFractionDigits: 2, maximumFractionDigits: 2 });

type SessionPayload = { activeSession: Session | null; sessions: Session[] };

/** Pure fetch: keeping state updates out of here is what keeps the effect clean. */
async function fetchSessions(): Promise<SessionPayload> {
  const response = await fetch("/api/daily-sessions");
  const payload = await response.json();

  if (!response.ok) {
    throw new Error(payload.error || "Unable to load sessions.");
  }

  return { activeSession: payload.activeSession ?? null, sessions: payload.sessions ?? [] };
}

export default function CashPage() {
  const [activeSession, setActiveSession] = useState<Session | null>(null);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [openingCash, setOpeningCash] = useState("0");
  const [closingCash, setClosingCash] = useState("0");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function loadSessions() {
    const payload = await fetchSessions();

    setActiveSession(payload.activeSession);
    setSessions(payload.sessions);
  }

  useEffect(() => {
    let active = true;

    fetchSessions()
      .then((payload) => {
        if (!active) return;
        setActiveSession(payload.activeSession);
        setSessions(payload.sessions);
      })
      .catch((caughtError) => {
        if (active) {
          setError(caughtError instanceof Error ? caughtError.message : "Unable to load sessions.");
        }
      });

    return () => {
      active = false;
    };
  }, []);

  const balanceStatus = useMemo(() => {
    if (!activeSession) {
      return "No cash session is open.";
    }

    if (activeSession.cashDifference === null) {
      return "Session active";
    }

    return Number(activeSession.cashDifference) === 0 ? "Balanced" : "Variance detected";
  }, [activeSession]);

  async function openSession() {
    setError("");
    setNotice("");
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/daily-sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "OPEN", openingCash: Number(openingCash) }),
      });

      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error || "Unable to open the cash session.");
      }

      setOpeningCash("0");
      await loadSessions();
      setNotice("Cash session opened successfully.");
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Unable to open the cash session.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function closeSession() {
    setError("");
    setNotice("");
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/daily-sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "CLOSE",
          closingCash: Number(closingCash),
        }),
      });

      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error || "Unable to close the cash session.");
      }

      setClosingCash("0");
      await loadSessions();
      setNotice("Cash session closed successfully.");
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Unable to close the cash session.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-8 text-slate-900 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <PageHeader eyebrow="Cash control" title="Daily cash session" />

        {error ? <p className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p> : null}
        {notice ? <p className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{notice}</p> : null}

        <div className="grid gap-6 lg:grid-cols-[420px_1fr]">
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-bold">Session actions</h2>
            <div className="mt-5 space-y-4">
              <label className="block text-sm font-medium text-slate-700">
                Opening cash
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={openingCash}
                  onChange={(event) => setOpeningCash(event.target.value)}
                  className="mt-2 w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200"
                />
              </label>

              <button
                type="button"
                onClick={openSession}
                disabled={isSubmitting || Boolean(activeSession)}
                className="w-full rounded-xl bg-emerald-600 px-4 py-3 font-medium text-white transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {isSubmitting ? "Processing..." : "Open session"}
              </button>

              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                <p className="text-sm font-medium text-slate-700">Session status</p>
                <p className="mt-2 text-lg font-bold text-slate-900">{balanceStatus}</p>
              </div>

              <label className="block text-sm font-medium text-slate-700">
                Closing cash
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={closingCash}
                  onChange={(event) => setClosingCash(event.target.value)}
                  className="mt-2 w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200"
                />
              </label>

              <p className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-500">
                Expected cash is worked out for you: the opening float, plus cash taken since the session opened, minus
                expenses paid out of the till.
              </p>

              <button
                type="button"
                onClick={closeSession}
                disabled={isSubmitting || !activeSession}
                className="w-full rounded-xl bg-slate-900 px-4 py-3 font-medium text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {isSubmitting ? "Closing..." : "Close session"}
              </button>
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-bold">Session history</h2>

            {activeSession ? (
              <div className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
                <p className="text-sm text-emerald-700">Open session</p>
                <p className="mt-2 text-2xl font-bold text-emerald-900">{money.format(Number(activeSession.openingCash))}</p>
                <p className="mt-2 text-sm text-emerald-700">Opened by {activeSession.openerName}</p>
              </div>
            ) : null}

            <div className="mt-5 overflow-x-auto">
              <table className="w-full min-w-135 text-left text-sm">
                <thead className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-3 py-3">Opened</th>
                    <th className="px-3 py-3">Opening</th>
                    <th className="px-3 py-3">Closing</th>
                    <th className="px-3 py-3">Variance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {sessions.map((session) => (
                    <tr key={session.id}>
                      <td className="px-3 py-4 text-slate-600">{new Date(session.openedAt).toLocaleDateString()}</td>
                      <td className="px-3 py-4">{money.format(Number(session.openingCash))}</td>
                      <td className="px-3 py-4">
                        {session.closingCash === null ? "—" : money.format(Number(session.closingCash))}
                      </td>
                      <td className="px-3 py-4">
                        {session.cashDifference === null ? (
                          "—"
                        ) : (
                          <span
                            className={
                              Number(session.cashDifference) === 0
                                ? "font-semibold text-emerald-700"
                                : "font-semibold text-amber-700"
                            }
                          >
                            {money.format(Number(session.cashDifference))}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {!sessions.length ? (
                <p className="py-10 text-center text-sm text-slate-500">No session history yet.</p>
              ) : null}
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
