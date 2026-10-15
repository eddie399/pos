"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

const initialForm = {
  shopName: "Duka Market",
  shopPhone: "+265 999 123 456",
  currency: "MWK",
  address: "Blantyre, Malawi",
  ownerName: "Mwiza Banda",
  ownerEmail: "owner@duka.local",
  ownerPhone: "+265 991 234 567",
  password: "password123",
};

export default function SetupShopPage() {
  const router = useRouter();
  const [form, setForm] = useState(initialForm);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  function handleChange(event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/setup-shop", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(form),
      });

      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error || "Unable to create your shop right now.");
      }

      router.push("/login?setup=success");
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Unable to create your shop right now.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-emerald-50 px-4 py-8">
      <div className="w-full max-w-2xl rounded-2xl border border-emerald-100 bg-white p-8 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-600">
          Shop setup
        </p>
        <h1 className="mt-3 text-3xl font-bold text-slate-900">Create your Duka shop</h1>
        <p className="mt-2 text-slate-600">
          This is the starting point for the shop profile, member onboarding, and initial store settings.
        </p>

        <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
          <div>
            <label htmlFor="shopName" className="mb-2 block text-sm font-medium text-slate-700">
              Shop name
            </label>
            <input
              id="shopName"
              name="shopName"
              type="text"
              value={form.shopName}
              onChange={handleChange}
              className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-3 text-sm text-slate-900 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200"
              required
            />
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <label htmlFor="shopPhone" className="mb-2 block text-sm font-medium text-slate-700">
                Shop phone
              </label>
              <input
                id="shopPhone"
                name="shopPhone"
                type="tel"
                value={form.shopPhone}
                onChange={handleChange}
                className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-3 text-sm text-slate-900 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200"
              />
            </div>

            <div>
              <label htmlFor="currency" className="mb-2 block text-sm font-medium text-slate-700">
                Currency
              </label>
              <select
                id="currency"
                name="currency"
                value={form.currency}
                onChange={handleChange}
                className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-3 text-sm text-slate-900 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200"
              >
                <option value="MWK">Malawi Kwacha (MWK)</option>
              </select>
            </div>
          </div>

          <div>
            <label htmlFor="address" className="mb-2 block text-sm font-medium text-slate-700">
              Address
            </label>
            <textarea
              id="address"
              name="address"
              rows={3}
              value={form.address}
              onChange={handleChange}
              className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-3 text-sm text-slate-900 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200"
            />
          </div>

          <div className="grid gap-5 border-t border-slate-200 pt-5 sm:grid-cols-2">
            <div>
              <label htmlFor="ownerName" className="mb-2 block text-sm font-medium text-slate-700">
                Owner name
              </label>
              <input
                id="ownerName"
                name="ownerName"
                type="text"
                value={form.ownerName}
                onChange={handleChange}
                className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-3 text-sm text-slate-900 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200"
                required
              />
            </div>

            <div>
              <label htmlFor="ownerPhone" className="mb-2 block text-sm font-medium text-slate-700">
                Owner phone
              </label>
              <input
                id="ownerPhone"
                name="ownerPhone"
                type="tel"
                value={form.ownerPhone}
                onChange={handleChange}
                className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-3 text-sm text-slate-900 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200"
              />
            </div>
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <label htmlFor="ownerEmail" className="mb-2 block text-sm font-medium text-slate-700">
                Owner email
              </label>
              <input
                id="ownerEmail"
                name="ownerEmail"
                type="email"
                value={form.ownerEmail}
                onChange={handleChange}
                className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-3 text-sm text-slate-900 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200"
                required
              />
            </div>

            <div>
              <label htmlFor="password" className="mb-2 block text-sm font-medium text-slate-700">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                value={form.password}
                onChange={handleChange}
                className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-3 text-sm text-slate-900 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200"
                minLength={8}
                required
              />
            </div>
          </div>

          {error ? (
            <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-xl bg-emerald-600 px-4 py-3 font-medium text-white transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isSubmitting ? "Creating shop..." : "Save shop setup"}
          </button>
        </form>
      </div>
    </main>
  );
}
