"use client";

import { useEffect, useMemo, useState } from "react";

import PageHeader from "@/app/components/page-header";

type Expense = {
  id: string;
  category: string;
  description: string;
  amount: string;
  createdAt: string;
  creatorName: string;
};

const initialForm = {
  category: "",
  description: "",
  amount: "0",
};

async function fetchExpenses(): Promise<Expense[]> {
  const response = await fetch("/api/expenses");
  const payload = await response.json();

  if (!response.ok) {
    throw new Error(payload.error || "Unable to load expenses.");
  }

  return payload.expenses ?? [];
}

export default function ExpensesPage() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [form, setForm] = useState(initialForm);
  const [query, setQuery] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function loadExpenses() {
    setExpenses(await fetchExpenses());
  }

  useEffect(() => {
    let active = true;

    fetchExpenses()
      .then((loaded) => {
        if (active) {
          setExpenses(loaded);
        }
      })
      .catch((caughtError) => {
        if (active) {
          setError(caughtError instanceof Error ? caughtError.message : "Unable to load expenses.");
        }
      });

    return () => {
      active = false;
    };
  }, []);

  const visibleExpenses = useMemo(
    () =>
      expenses.filter((expense) => {
        const haystack = `${expense.category} ${expense.description} ${expense.creatorName}`.toLowerCase();
        return haystack.includes(query.toLowerCase());
      }),
    [expenses, query],
  );

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setNotice("");
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/expenses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error || "Unable to create expense.");
      }

      setForm(initialForm);
      await loadExpenses();
      setNotice("Expense saved successfully.");
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Unable to create expense.");
    } finally {
      setIsSubmitting(false);
    }
  }

  const totalExpenses = expenses.reduce((sum, expense) => sum + Number(expense.amount), 0);

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-8 text-slate-900 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <PageHeader eyebrow="Finance" title="Expenses" />

        {error ? <p className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p> : null}
        {notice ? <p className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{notice}</p> : null}

        <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">Total recorded expenses</p>
          <p className="mt-2 text-3xl font-bold text-slate-900">MWK {totalExpenses.toFixed(2)}</p>
        </div>

        <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-bold">Add expense</h2>
            <form className="mt-5 space-y-4" onSubmit={handleSubmit}>
              <label className="block text-sm font-medium text-slate-700">
                Category
                <input
                  type="text"
                  value={form.category}
                  onChange={(event) => setForm((current) => ({ ...current, category: event.target.value }))}
                  className="mt-2 w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200"
                  required
                />
              </label>

              <label className="block text-sm font-medium text-slate-700">
                Description
                <input
                  type="text"
                  value={form.description}
                  onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
                  className="mt-2 w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200"
                  required
                />
              </label>

              <label className="block text-sm font-medium text-slate-700">
                Amount
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.amount}
                  onChange={(event) => setForm((current) => ({ ...current, amount: event.target.value }))}
                  className="mt-2 w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200"
                  required
                />
              </label>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full rounded-xl bg-emerald-600 px-4 py-3 font-medium text-white transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {isSubmitting ? "Saving..." : "Save expense"}
              </button>
            </form>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-xl font-bold">Recent expenses</h2>
                <p className="mt-1 text-sm text-slate-500">{expenses.length} record{expenses.length === 1 ? "" : "s"}</p>
              </div>
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search expenses"
                className="rounded-xl border border-slate-300 bg-slate-50 px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200"
              />
            </div>

            <div className="mt-5 overflow-x-auto">
              <table className="w-full min-w-155 text-left text-sm">
                <thead className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-3 py-3">Category</th>
                    <th className="px-3 py-3">Description</th>
                    <th className="px-3 py-3">Amount</th>
                    <th className="px-3 py-3">Added by</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {visibleExpenses.map((expense) => (
                    <tr key={expense.id}>
                      <td className="px-3 py-4 font-medium text-slate-800">{expense.category}</td>
                      <td className="px-3 py-4 text-slate-700">{expense.description}</td>
                      <td className="px-3 py-4 text-slate-800">MWK {Number(expense.amount).toFixed(2)}</td>
                      <td className="px-3 py-4 text-slate-600">{expense.creatorName}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {!visibleExpenses.length ? (
                <p className="py-10 text-center text-sm text-slate-500">No expenses found.</p>
              ) : null}
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
