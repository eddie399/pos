"use client";

import { useEffect, useState } from "react";

import BarcodeScanner from "@/app/components/barcode-scanner";
import PageHeader from "@/app/components/page-header";

type Product = {
  id: string;
  name: string;
  barcode: string | null;
  sellingPrice: string;
  stockQuantity: number;
  lowStockThreshold: number;
  unit: string;
  categoryName: string | null;
};

const emptyForm = {
  name: "",
  categoryName: "",
  barcode: "",
  costPrice: "",
  sellingPrice: "",
  stockQuantity: "0",
  lowStockThreshold: "0",
};

/** Pure fetch: keeping state updates out of here is what keeps the effect clean. */
async function fetchProducts(): Promise<Product[]> {
  const response = await fetch("/api/products");
  const payload = await response.json();

  if (!response.ok) {
    throw new Error(payload.error || "Unable to load products.");
  }

  return payload.products ?? [];
}

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [query, setQuery] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isScannerOpen, setIsScannerOpen] = useState(false);

  async function loadProducts() {
    setProducts(await fetchProducts());
  }

  useEffect(() => {
    let active = true;

    fetchProducts()
      .then((loaded) => {
        if (active) {
          setProducts(loaded);
        }
      })
      .catch((caughtError) => {
        if (active) {
          setError(caughtError instanceof Error ? caughtError.message : "Unable to load products.");
        }
      });

    return () => {
      active = false;
    };
  }, []);

  function handleChange(event: React.ChangeEvent<HTMLInputElement>) {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setNotice("");
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Unable to create product.");
      setForm(emptyForm);
      await loadProducts();
      setNotice("Product added successfully.");
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Unable to create product.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function adjustStock(product: Product, type: "RECEIVE" | "REMOVE") {
    const enteredQuantity = window.prompt(`${type === "RECEIVE" ? "Receive" : "Remove"} quantity for ${product.name}`);
    const quantity = Number(enteredQuantity);
    if (!enteredQuantity || !Number.isInteger(quantity) || quantity <= 0) return;

    setError("");
    setNotice("");
    const response = await fetch(`/api/products/${product.id}/stock`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type, quantity }),
    });
    const payload = await response.json();
    if (!response.ok) {
      setError(payload.error || "Unable to adjust stock.");
      return;
    }
    await loadProducts();
    setNotice("Stock updated successfully.");
  }

  const visibleProducts = products.filter((product) => `${product.name} ${product.barcode ?? ""} ${product.categoryName ?? ""}`.toLowerCase().includes(query.toLowerCase()));

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-8 text-slate-900 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <PageHeader
          eyebrow="Inventory"
          title="Products and stock"
          description="Keep prices, stock levels, and low-stock alerts current."
        />

        {error ? <p className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p> : null}
        {notice ? <p className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{notice}</p> : null}

        <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-bold">Add product</h2>
            <form className="mt-5 space-y-4" onSubmit={handleSubmit}>
              {[
                ["name", "Product name", "text"],
                ["categoryName", "Category", "text"],
                ["barcode", "Barcode", "text"],
                ["costPrice", "Cost price", "number"],
                ["sellingPrice", "Selling price", "number"],
                ["stockQuantity", "Opening stock", "number"],
                ["lowStockThreshold", "Low-stock alert at", "number"],
              ].map(([name, label, type]) => (
                <label key={name} className="block text-sm font-medium text-slate-700">
                  {label}
                  <div className={name === "barcode" ? "mt-2 flex gap-2" : "mt-2"}>
                    <input name={name} type={type} value={form[name as keyof typeof form]} onChange={handleChange} min={type === "number" ? "0" : undefined} step={name.toLowerCase().includes("price") ? "0.01" : undefined} required={name === "name" || name === "costPrice" || name === "sellingPrice"} className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200" />
                    {name === "barcode" ? <button type="button" onClick={() => setIsScannerOpen(true)} className="shrink-0 rounded-xl bg-slate-900 px-3 py-2 text-sm font-semibold text-white transition hover:bg-slate-700">Scan</button> : null}
                  </div>
                </label>
              ))}
              <button type="submit" disabled={isSubmitting} className="w-full rounded-xl bg-emerald-600 px-4 py-3 font-medium text-white transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-70">{isSubmitting ? "Adding..." : "Add product"}</button>
            </form>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div><h2 className="text-xl font-bold">Stock list</h2><p className="mt-1 text-sm text-slate-500">{products.length} product{products.length === 1 ? "" : "s"}</p></div>
              <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search products" className="rounded-xl border border-slate-300 bg-slate-50 px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-emerald-500" />
            </div>
            <div className="mt-5 overflow-x-auto">
              <table className="w-full min-w-[680px] text-left text-sm">
                <thead className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500"><tr><th className="px-3 py-3">Product</th><th className="px-3 py-3">Price</th><th className="px-3 py-3">Stock</th><th className="px-3 py-3">Actions</th></tr></thead>
                <tbody className="divide-y divide-slate-100">
                  {visibleProducts.map((product) => <tr key={product.id}><td className="px-3 py-4"><p className="font-semibold">{product.name}</p><p className="text-xs text-slate-500">{product.categoryName || "Uncategorized"}{product.barcode ? ` · ${product.barcode}` : ""}</p></td><td className="px-3 py-4">MWK {product.sellingPrice}</td><td className="px-3 py-4"><span className={product.stockQuantity <= product.lowStockThreshold ? "font-semibold text-amber-600" : "font-medium text-slate-700"}>{product.stockQuantity} {product.unit.toLowerCase()}</span></td><td className="space-x-2 px-3 py-4"><button type="button" onClick={() => adjustStock(product, "RECEIVE")} className="rounded-lg bg-emerald-100 px-2.5 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-200">Receive</button><button type="button" onClick={() => adjustStock(product, "REMOVE")} className="rounded-lg bg-slate-100 px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-200">Remove</button></td></tr>)}
                </tbody>
              </table>
              {!visibleProducts.length ? <p className="py-10 text-center text-sm text-slate-500">No products found.</p> : null}
            </div>
          </section>
        </div>
      </div>
      {isScannerOpen ? <BarcodeScanner onClose={() => setIsScannerOpen(false)} onDetected={(barcode) => { setForm((current) => ({ ...current, barcode })); setIsScannerOpen(false); setNotice("Barcode captured from camera."); }} /> : null}
    </main>
  );
}