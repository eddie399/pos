"use client";

import { useEffect, useMemo, useState } from "react";

import BarcodeScanner from "@/app/components/barcode-scanner";
import { useBarcodeWedge } from "@/app/components/use-barcode-wedge";
import { newId } from "@/lib/ids";
import { submitSale, syncPendingSales, type SalePayload, type SyncResult } from "@/lib/offline-db";

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

type CartItem = {
  product: Product;
  quantity: number;
};

type CustomerOption = {
  id: string;
  name: string;
  creditLimit: string;
};

/** Pure fetches: no state updates here, so effects can call them safely. */
async function fetchProducts(): Promise<Product[]> {
  const response = await fetch("/api/products");
  const payload = await response.json();

  if (!response.ok) {
    throw new Error(payload.error || "Unable to load products.");
  }

  return payload.products ?? [];
}

async function fetchCustomers(): Promise<CustomerOption[]> {
  const response = await fetch("/api/customers");
  const payload = await response.json();

  if (!response.ok) {
    throw new Error(payload.error || "Unable to load customers.");
  }

  return payload.customers ?? [];
}

const currencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "MWK",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export default function PosPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Array<{ id: string; name: string; creditLimit: string }>>([]);
  const [customerId, setCustomerId] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [query, setQuery] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [lastScanned, setLastScanned] = useState<string | null>(null);
  const [scanCount, setScanCount] = useState(0);

  async function loadProducts() {
    setProducts(await fetchProducts());
  }

  useEffect(() => {
    let active = true;

    Promise.all([fetchProducts(), fetchCustomers()])
      .then(([loadedProducts, loadedCustomers]) => {
        if (!active) return;
        setProducts(loadedProducts);
        setCustomers(loadedCustomers);
      })
      .catch((caughtError) => {
        if (active) {
          setError(caughtError instanceof Error ? caughtError.message : "Unable to load POS data.");
        }
      });

    return () => {
      active = false;
    };
  }, []);

  // Pushes anything sold while offline, then refreshes stock levels.
  useEffect(() => {
    let active = true;

    function applySyncResult(result: SyncResult) {
      if (!active || result.synced === 0) return;

      setNotice(`${result.synced} queued sale${result.synced === 1 ? "" : "s"} synced.`);
      fetchProducts()
        .then((loaded) => {
          if (active) {
            setProducts(loaded);
          }
        })
        .catch(() => undefined);
    }

    function syncWhenOnline() {
      syncPendingSales()
        .then(applySyncResult)
        .catch(() => undefined);
    }

    syncWhenOnline();
    window.addEventListener("online", syncWhenOnline);

    return () => {
      active = false;
      window.removeEventListener("online", syncWhenOnline);
    };
  }, []);

  const filteredProducts = useMemo(
    () =>
      products.filter((product) => {
        const haystack = `${product.name} ${product.barcode ?? ""} ${product.categoryName ?? ""}`.toLowerCase();
        return haystack.includes(query.toLowerCase());
      }),
    [products, query],
  );

  const cartTotal = useMemo(
    () => cart.reduce((sum, item) => sum + Number(item.product.sellingPrice) * item.quantity, 0),
    [cart],
  );

  function addToCart(product: Product) {
    setError("");
    setNotice("");

    setCart((current) => {
      const existing = current.find((item) => item.product.id === product.id);

      if (existing) {
        if (existing.quantity >= product.stockQuantity) {
          setError(`Only ${product.stockQuantity} ${product.unit.toLowerCase()} available in stock.`);
          return current;
        }

        return current.map((item) =>
          item.product.id === product.id ? { ...item, quantity: item.quantity + 1 } : item,
        );
      }

      return [...current, { product, quantity: 1 }];
    });
  }

  function closeScanner() {
    setIsScannerOpen(false);
    setLastScanned(null);
    setScanCount(0);
  }

  function handleBarcodeDetected(barcode: string) {
    const scannedProduct = products.find((product) => product.barcode?.trim() === barcode.trim());

    if (!scannedProduct) {
      setQuery(barcode);
      setError(`No product found for barcode ${barcode}.`);
      return;
    }

    addToCart(scannedProduct);

    // Continuous mode: the camera stays open so a basket scans item after
    // item. The running count is reset when the camera closes, so a wedge scan
    // later in the sale never inherits a stale camera count.
    if (isScannerOpen) {
      setScanCount((current) => current + 1);
      setLastScanned(scannedProduct.name);
    } else {
      setScanCount(0);
      setLastScanned(null);
    }

    setNotice(`${scannedProduct.name} added to the sale.`);
  }

  // Hardware scanners (keyboard wedges) bypass the camera entirely and are
  // faster on a fixed counter. Disabled while the camera view is open so the
  // two paths never double-add the same item. The hook holds the latest
  // handler in a ref, so passing a fresh closure each render is safe.
  useBarcodeWedge({
    enabled: !isScannerOpen,
    onScan: (barcode) => handleBarcodeDetected(barcode),
  });

  function updateCartQuantity(productId: string, delta: number) {
    setCart((current) =>
      current
        .map((item) => {
          if (item.product.id !== productId) {
            return item;
          }

          const nextQuantity = item.quantity + delta;
          return nextQuantity <= 0 ? null : { ...item, quantity: nextQuantity };
        })
        .filter(Boolean) as CartItem[],
    );
  }

  async function handleCheckout() {
    if (!cart.length) {
      setError("Your cart is empty.");
      return;
    }

    setIsSubmitting(true);
    setError("");
    setNotice("");

    // The device mints the reference, so the sale has a stable identity before
    // the network is involved and a retry can never book it twice.
    const salePayload: SalePayload = {
      clientRef: newId(),
      items: cart.map(({ product, quantity }) => ({ productId: product.id, quantity })),
      customerId: customerId || null,
      discount: 0,
      paymentMethod: customerId ? "CREDIT" : "CASH",
    };

    try {
      const result = await submitSale(salePayload);

      if (result.status === "rejected") {
        // The server refused the sale (stock ran out, credit limit reached,
        // session expired). Keep the cart so the cashier can correct it.
        setError(result.message);
        return;
      }

      setCart([]);
      setNotice(
        result.status === "synced"
          ? `Sale completed. Receipt ${result.receiptNumber}.`
          : `No connection. Receipt ${result.receiptNumber} is saved on this device and will sync automatically.`,
      );

      // Best effort: while offline the local product list stays as it is.
      await loadProducts().catch(() => undefined);
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Unable to complete the sale.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-100 px-4 pb-40 pt-20 text-slate-900 sm:px-6 md:pb-16 lg:px-8">
      <div className="mx-auto max-w-7xl">
        {error ? (
          <p role="alert" className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </p>
        ) : null}
        {notice ? (
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            <p role="status">{notice}</p>
            {scanCount > 0 && lastScanned ? (
              <p className="font-semibold">
                {scanCount} item{scanCount === 1 ? "" : "s"} scanned · latest: {lastScanned}
              </p>
            ) : null}
          </div>
        ) : null}

        <div className="grid gap-6 lg:grid-cols-[1.25fr_0.75fr]">
          <section aria-label="Product picker" className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
            <div className="mb-4 flex flex-col gap-3">
              <div>
                <h1 className="text-xl font-bold sm:text-2xl">New sale</h1>
                <p className="mt-1 text-sm text-slate-500">Tap a tile to add it to the current sale.</p>
              </div>

              <div className="flex w-full gap-2">
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search by name or barcode"
                  inputMode="search"
                  aria-label="Search products by name or barcode"
                  className="min-h-11 w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200"
                />
                <button
                  type="button"
                  onClick={() => setIsScannerOpen(true)}
                  className="min-h-11 shrink-0 rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-700"
                >
                  Scan
                </button>
              </div>
            </div>

            {filteredProducts.length ? (
              <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {filteredProducts.map((product) => {
                  const isOutOfStock = product.stockQuantity <= 0;
                  const isLowStock = !isOutOfStock && product.stockQuantity <= product.lowStockThreshold;

                  return (
                    <li key={product.id}>
                      <button
                        type="button"
                        onClick={() => addToCart(product)}
                        disabled={isOutOfStock}
                        aria-label={`Add ${product.name} to sale, ${currencyFormatter.format(Number(product.sellingPrice))}`}
                        className="flex min-h-28 w-full flex-col justify-between gap-2 rounded-2xl border border-slate-200 bg-slate-50 p-3 text-left transition hover:border-emerald-300 hover:bg-emerald-50 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:border-slate-200 disabled:hover:bg-slate-50"
                      >
                        <span className="min-w-0">
                          <span className="block truncate text-sm font-bold text-slate-900">{product.name}</span>
                          <span className="price mt-1 block text-sm font-semibold text-emerald-700">
                            {currencyFormatter.format(Number(product.sellingPrice))}
                          </span>
                        </span>
                        <span
                          className={`inline-flex w-fit items-center rounded-full px-2 py-0.5 text-xs font-semibold ${
                            isOutOfStock
                              ? "bg-red-100 text-red-700"
                              : isLowStock
                                ? "bg-amber-100 text-amber-700"
                                : "bg-slate-100 text-slate-600"
                          }`}
                        >
                          {isOutOfStock
                            ? "Out of stock"
                            : `${product.stockQuantity} ${product.unit.toLowerCase()} left`}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-5 text-center text-sm text-slate-500">
                No products match the current search.
              </p>
            )}
          </section>

          <aside className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold">Current sale</h2>
              <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">
                {cart.reduce((sum, item) => sum + item.quantity, 0)} items
              </span>
            </div>

            <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-3">
              <label className="block text-sm font-medium text-slate-700">
                Customer (optional)
                <select
                  value={customerId}
                  onChange={(event) => setCustomerId(event.target.value)}
                  className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200"
                >
                  <option value="">Walk-in customer</option>
                  {customers.map((customer) => (
                    <option key={customer.id} value={customer.id}>
                      {customer.name}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="mt-5 space-y-3">
              {cart.length ? (
                cart.map(({ product, quantity }) => (
                  <div key={product.id} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold text-slate-900">{product.name}</p>
                        <p className="text-xs text-slate-500">{currencyFormatter.format(Number(product.sellingPrice))} each</p>
                      </div>

                      <button
                        type="button"
                        onClick={() => updateCartQuantity(product.id, -quantity)}
                        className="text-xs font-medium text-red-600 hover:text-red-700"
                      >
                        Remove
                      </button>
                    </div>

                    <div className="mt-3 flex items-center justify-between">
                      <div className="inline-flex items-center rounded-xl border border-slate-200 bg-white">
                        <button
                          type="button"
                          onClick={() => updateCartQuantity(product.id, -1)}
                          className="h-9 w-9 text-lg text-slate-700"
                          aria-label={`Decrease quantity for ${product.name}`}
                        >
                          −
                        </button>
                        <span className="min-w-10 text-center text-sm font-semibold text-slate-800">{quantity}</span>
                        <button
                          type="button"
                          onClick={() => updateCartQuantity(product.id, 1)}
                          className="h-9 w-9 text-lg text-slate-700"
                          aria-label={`Increase quantity for ${product.name}`}
                        >
                          +
                        </button>
                      </div>

                      <p className="font-semibold text-slate-900">
                        {currencyFormatter.format(Number(product.sellingPrice) * quantity)}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-5 text-center text-sm text-slate-500">
                  No items added yet.
                </p>
              )}
            </div>

            <div className="mt-6 rounded-2xl bg-slate-100 p-4">
              <div className="flex items-center justify-between text-sm text-slate-600">
                <span>Subtotal</span>
                <span>{currencyFormatter.format(cartTotal)}</span>
              </div>
              <div className="mt-3 flex items-center justify-between text-sm text-slate-600">
                <span>Discount</span>
                <span>{currencyFormatter.format(0)}</span>
              </div>
              <div className="mt-4 flex items-center justify-between border-t border-slate-200 pt-4 text-lg font-bold text-slate-900">
                <span>Total</span>
                <span>{currencyFormatter.format(cartTotal)}</span>
              </div>
            </div>

            <button
              type="button"
              onClick={handleCheckout}
              disabled={isSubmitting || !cart.length}
              className="mt-6 w-full rounded-xl bg-emerald-600 px-4 py-3 font-medium text-white transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isSubmitting ? "Processing sale..." : "Complete sale"}
            </button>
          </aside>
        </div>
      </div>
      {isScannerOpen ? (
        <BarcodeScanner
          continuous
          lastScanned={lastScanned}
          scanCount={scanCount}
          onClose={closeScanner}
          onDetected={handleBarcodeDetected}
        />
      ) : null}
    </main>
  );
}
