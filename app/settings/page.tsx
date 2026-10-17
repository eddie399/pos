"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";

type BluetoothGattServer = {
  connected: boolean;
  connect(): Promise<BluetoothGattServer>;
};

type BluetoothDevice = {
  id: string;
  name?: string;
  gatt?: BluetoothGattServer;
};

type BluetoothApi = {
  requestDevice(options: { acceptAllDevices: boolean }): Promise<BluetoothDevice>;
};

type SavedPrinter = {
  id: string;
  name: string;
};

type StorageInfo = {
  cacheCount: number | null;
  usage: number | null;
};

const PRINTER_STORAGE_KEY = "duka-pos-bluetooth-printer";

function readSavedPrinter(): SavedPrinter | null {
  let saved: string | null;

  try {
    saved = window.localStorage.getItem(PRINTER_STORAGE_KEY);
  } catch {
    throw new Error("Unable to read the saved printer settings from this device.");
  }

  if (!saved) return null;

  let parsed: unknown;
  try {
    parsed = JSON.parse(saved);
  } catch {
    throw new Error("The saved printer settings are unreadable.");
  }

  if (
    parsed &&
    typeof parsed === "object" &&
    "id" in parsed &&
    typeof parsed.id === "string" &&
    "name" in parsed &&
    typeof parsed.name === "string"
  ) {
    return { id: parsed.id, name: parsed.name };
  }

  throw new Error("The saved printer settings are invalid.");
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

async function readStorageInfo(): Promise<StorageInfo> {
  const cacheCount = "caches" in window ? (await window.caches.keys()).length : null;
  const estimate = await navigator.storage?.estimate();

  return {
    cacheCount,
    usage: estimate?.usage ?? null,
  };
}

export default function SettingsPage() {
  const { data: session } = useSession();
  const [savedPrinter, setSavedPrinter] = useState<SavedPrinter | null>(null);
  const [isBluetoothSupported, setIsBluetoothSupported] = useState(false);
  const [isConnectingPrinter, setIsConnectingPrinter] = useState(false);
  const [printerMessage, setPrinterMessage] = useState("");
  const [printerError, setPrinterError] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordMessage, setPasswordMessage] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [storageInfo, setStorageInfo] = useState<StorageInfo>({ cacheCount: null, usage: null });
  const [storageMessage, setStorageMessage] = useState("");
  const [storageError, setStorageError] = useState("");
  const [isClearingCache, setIsClearingCache] = useState(false);
  const [isCacheStorageSupported, setIsCacheStorageSupported] = useState(false);

  useEffect(() => {
    let active = true;

    Promise.resolve().then(() => {
      if (!active) return;

      setIsBluetoothSupported(
        typeof navigator !== "undefined" && "bluetooth" in navigator && window.isSecureContext,
      );
      setIsCacheStorageSupported("caches" in window);

      try {
        setSavedPrinter(readSavedPrinter());
      } catch (caughtError) {
        setPrinterError(caughtError instanceof Error ? caughtError.message : "Unable to read printer settings.");
      }

      readStorageInfo()
        .then((info) => {
          if (active) setStorageInfo(info);
        })
        .catch((caughtError: unknown) => {
          if (active) {
            setStorageError(caughtError instanceof Error ? caughtError.message : "Unable to read device storage.");
          }
        });
    });

    return () => {
      active = false;
    };
  }, []);

  async function connectPrinter() {
    setPrinterError("");
    setPrinterMessage("");
    setIsConnectingPrinter(true);

    try {
      if (!isBluetoothSupported) {
        throw new Error("Bluetooth setup requires a supported browser on HTTPS or localhost.");
      }

      const bluetooth = (navigator as Navigator & { bluetooth: BluetoothApi }).bluetooth;
      const device = await bluetooth.requestDevice({ acceptAllDevices: true });

      if (!device.gatt) {
        throw new Error("This device does not expose a Bluetooth LE connection.");
      }

      await device.gatt.connect();

      const printer = { id: device.id, name: device.name?.trim() || "Bluetooth printer" };
      window.localStorage.setItem(PRINTER_STORAGE_KEY, JSON.stringify(printer));
      setSavedPrinter(printer);
      setPrinterMessage(`${printer.name} connected and saved on this device.`);
    } catch (caughtError) {
      setPrinterError(
        caughtError instanceof Error ? caughtError.message : "Unable to connect to the Bluetooth printer.",
      );
    } finally {
      setIsConnectingPrinter(false);
    }
  }

  function forgetPrinter() {
    setPrinterError("");
    setPrinterMessage("");

    try {
      window.localStorage.removeItem(PRINTER_STORAGE_KEY);
      setSavedPrinter(null);
      setPrinterMessage("Saved printer removed from this device.");
    } catch (caughtError) {
      setPrinterError(caughtError instanceof Error ? caughtError.message : "Unable to remove the saved printer.");
    }
  }

  async function clearAppCache() {
    setStorageError("");
    setStorageMessage("");

    if (!("caches" in window)) {
      setStorageError("This browser does not support clearing app-managed cache storage.");
      return;
    }

    if (!window.confirm(
      "Clear cached files for this site? Pending offline sales, saved receipts, and printer settings will be kept.",
    )) {
      return;
    }

    setIsClearingCache(true);

    try {
      const cacheNames = await window.caches.keys();
      const results = await Promise.allSettled(cacheNames.map((cacheName) => window.caches.delete(cacheName)));
      const cleared = results.filter((result) => result.status === "fulfilled" && result.value).length;
      const failed = results.length - cleared;

      setStorageInfo(await readStorageInfo());

      if (failed) {
        throw new Error(`Cleared ${cleared} cache${cleared === 1 ? "" : "s"}, but could not remove ${failed}.`);
      }

      setStorageMessage(
        cleared
          ? `Cleared ${cleared} cached app entr${cleared === 1 ? "y" : "ies"}. Offline sales, receipts, and printer settings were kept.`
          : "No app cache was found. Offline sales, receipts, and printer settings were kept.",
      );
    } catch (caughtError) {
      setStorageError(caughtError instanceof Error ? caughtError.message : "Unable to clear the app cache.");
    } finally {
      setIsClearingCache(false);
    }
  }

  async function changePassword(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPasswordError("");
    setPasswordMessage("");

    if (newPassword !== confirmPassword) {
      setPasswordError("The new passwords do not match.");
      return;
    }

    setIsChangingPassword(true);

    try {
      const response = await fetch("/api/account/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const payload = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(payload.error || "Unable to change your password.");
      }

      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setPasswordMessage("Your password has been changed.");
    } catch (caughtError) {
      setPasswordError(caughtError instanceof Error ? caughtError.message : "Unable to change your password.");
    } finally {
      setIsChangingPassword(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-100 px-4 pb-12 pt-8 text-slate-900 sm:px-6">
      <div className="mx-auto max-w-3xl space-y-6">
        <header>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-700">Preferences</p>
          <h1 className="mt-2 text-3xl font-bold">Settings</h1>
          <p className="mt-2 text-sm text-slate-600">Manage receipt printing and your account.</p>
        </header>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <h2 className="text-xl font-bold">Receipt printer</h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Pair a Bluetooth Low Energy (BLE) printer with this device. Browser Bluetooth requires HTTPS
            (or localhost) and a compatible browser. Bluetooth Classic printers may not be supported.
          </p>

          {savedPrinter ? (
            <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-4">
              <p className="text-sm font-semibold text-emerald-900">Saved printer: {savedPrinter.name}</p>
              <p className="mt-1 text-xs text-emerald-800">
                Printer permission and settings are stored in this browser on this device.
              </p>
            </div>
          ) : (
            <p className="mt-4 rounded-xl bg-slate-50 p-4 text-sm text-slate-600">No printer is configured.</p>
          )}

          {!isBluetoothSupported ? (
            <p className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
              Bluetooth setup is unavailable here. Open the app in a Web Bluetooth-compatible browser over HTTPS.
            </p>
          ) : null}

          {printerError ? (
            <p role="alert" className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              {printerError}
            </p>
          ) : null}
          {printerMessage ? (
            <p role="status" className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
              {printerMessage}
            </p>
          ) : null}

          <div className="mt-5 flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              onClick={connectPrinter}
              disabled={!isBluetoothSupported || isConnectingPrinter}
              className="min-h-11 rounded-xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isConnectingPrinter ? "Connecting..." : savedPrinter ? "Connect another printer" : "Connect Bluetooth printer"}
            </button>
            {savedPrinter ? (
              <button
                type="button"
                onClick={forgetPrinter}
                className="min-h-11 rounded-xl border border-slate-300 px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                Forget printer
              </button>
            ) : null}
          </div>
          <p className="mt-4 text-xs leading-5 text-slate-500">
            Pairing saves the printer for this browser. Receipt printing still uses the browser&apos;s print
            dialog; direct thermal printing may require support for your printer&apos;s specific protocol.
          </p>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <h2 className="text-xl font-bold">Device storage</h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Clear cached app files to free browser storage. This does not clear the browser&apos;s general
            HTTP cache, and it keeps pending offline sales, saved receipts, and printer settings.
          </p>
          <dl className="mt-4 grid gap-3 rounded-xl bg-slate-50 p-4 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-slate-500">Site storage estimate</dt>
              <dd className="mt-1 font-semibold text-slate-900">
                {storageInfo.usage === null ? "Not available" : formatBytes(storageInfo.usage)}
              </dd>
            </div>
            <div>
              <dt className="text-slate-500">Cached app entries</dt>
              <dd className="mt-1 font-semibold text-slate-900">
                {storageInfo.cacheCount === null
                  ? "Not available"
                  : `${storageInfo.cacheCount} entr${storageInfo.cacheCount === 1 ? "y" : "ies"}`}
              </dd>
            </div>
          </dl>
          <p className="mt-2 text-xs text-slate-500">
            The storage estimate may include offline sales and receipts; these are preserved when clearing cache.
          </p>

          {storageError ? (
            <p role="alert" className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              {storageError}
            </p>
          ) : null}
          {storageMessage ? (
            <p role="status" className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
              {storageMessage}
            </p>
          ) : null}

          <button
            type="button"
            onClick={clearAppCache}
            disabled={isClearingCache || !isCacheStorageSupported}
            className="mt-5 min-h-11 rounded-xl border border-slate-300 px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isClearingCache ? "Clearing cache..." : "Clear cached app files"}
          </button>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <h2 className="text-xl font-bold">Account security</h2>
          <p className="mt-2 text-sm text-slate-600">
            Signed in as {session?.user?.email || session?.user?.name || "your account"}.
          </p>

          <form onSubmit={changePassword} className="mt-5 space-y-4">
            <div>
              <label htmlFor="currentPassword" className="mb-1.5 block text-sm font-medium text-slate-700">
                Current password
              </label>
              <input
                id="currentPassword"
                type="password"
                autoComplete="current-password"
                value={currentPassword}
                onChange={(event) => setCurrentPassword(event.target.value)}
                className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-3 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200"
                required
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="newPassword" className="mb-1.5 block text-sm font-medium text-slate-700">
                  New password
                </label>
                <input
                  id="newPassword"
                  type="password"
                  autoComplete="new-password"
                  minLength={8}
                  value={newPassword}
                  onChange={(event) => setNewPassword(event.target.value)}
                  className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-3 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200"
                  required
                />
              </div>
              <div>
                <label htmlFor="confirmPassword" className="mb-1.5 block text-sm font-medium text-slate-700">
                  Confirm new password
                </label>
                <input
                  id="confirmPassword"
                  type="password"
                  autoComplete="new-password"
                  minLength={8}
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-3 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200"
                  required
                />
              </div>
            </div>

            {passwordError ? (
              <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                {passwordError}
              </p>
            ) : null}
            {passwordMessage ? (
              <p role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
                {passwordMessage}
              </p>
            ) : null}

            <button
              type="submit"
              disabled={isChangingPassword}
              className="min-h-11 rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isChangingPassword ? "Changing password..." : "Change password"}
            </button>
          </form>
        </section>
      </div>
    </main>
  );
}
