"use client";

import { useEffect, useMemo, useState } from "react";

import PageHeader from "@/app/components/page-header";

type Customer = {
  id: string;
  name: string;
  phone: string | null;
  creditLimit: string;
  active: boolean;
  createdAt: string;
};

const initialForm = {
  name: "",
  phone: "",
  creditLimit: "0",
};

async function fetchCustomers(): Promise<Customer[]> {
  const response = await fetch("/api/customers");
  const payload = await response.json();

  if (!response.ok) {
    throw new Error(payload.error || "Unable to load customers.");
  }

  return payload.customers ?? [];
}

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [form, setForm] = useState(initialForm);
  const [query, setQuery] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function loadCustomers() {
    setCustomers(await fetchCustomers());
  }

  useEffect(() => {
    let active = true;

    fetchCustomers()
      .then((loaded) => {
        if (active) {
          setCustomers(loaded);
        }
      })
      .catch((caughtError) => {
        if (active) {
          setError(caughtError instanceof Error ? caughtError.message : "Unable to load customers.");
        }
      });

    return () => {
      active = false;
    };
  }, []);

  const visibleCustomers = useMemo(
    () =>
      customers.filter((customer) => {
        const haystack = `${customer.name} ${customer.phone ?? ""}`.toLowerCase();
        return haystack.includes(query.toLowerCase());
      }),
    [customers, query],
  );

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setNotice("");
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/customers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error || "Unable to create customer.");
      }

      setForm(initialForm);
      await loadCustomers();
      setNotice("Customer created successfully.");
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Unable to create customer.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-8 text-slate-900 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <PageHeader eyebrow="Credit ledger" title="Customers" />

        {error ? <p className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p> : null}
        {notice ? <p className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{notice}</p> : null}

        <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-bold">Add customer</h2>
            <form className="mt-5 space-y-4" onSubmit={handleSubmit}>
              <label className="block text-sm font-medium text-slate-700">
                Customer name
                <input
                  type="text"
                  value={form.name}
                  onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
                  className="mt-2 w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200"
                  required
                />
              </label>

              <label className="block text-sm font-medium text-slate-700">
                Phone
                <input
                  type="tel"
                  value={form.phone}
                  onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))}
                  className="mt-2 w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200"
                />
              </label>

              <label className="block text-sm font-medium text-slate-700">
                Credit limit
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.creditLimit}
                  onChange={(event) => setForm((current) => ({ ...current, creditLimit: event.target.value }))}
                  className="mt-2 w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200"
                />
              </label>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full rounded-xl bg-emerald-600 px-4 py-3 font-medium text-white transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {isSubmitting ? "Saving..." : "Save customer"}
              </button>
            </form>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-xl font-bold">Customer list</h2>
                <p className="mt-1 text-sm text-slate-500">{customers.length} customer{customers.length === 1 ? "" : "s"}</p>
              </div>

              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search customers"
                className="rounded-xl border border-slate-300 bg-slate-50 px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200"
              />
            </div>

            <div className="mt-5 overflow-x-auto">
              <table className="w-full min-w-140 text-left text-sm">
                <thead className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-3 py-3">Name</th>
                    <th className="px-3 py-3">Phone</th>
                    <th className="px-3 py-3">Limit</th>
                    <th className="px-3 py-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {visibleCustomers.map((customer) => (
                    <tr key={customer.id}>
                      <td className="px-3 py-4 font-semibold text-slate-900">{customer.name}</td>
                      <td className="px-3 py-4 text-slate-600">{customer.phone || "—"}</td>
                      <td className="px-3 py-4 text-slate-700">MWK {customer.creditLimit}</td>
                      <td className="px-3 py-4">
                        <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                          {customer.active ? "Active" : "Inactive"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {!visibleCustomers.length ? (
                <p className="py-10 text-center text-sm text-slate-500">No customers found.</p>
              ) : null}
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
