/**
 * Identity helpers shared by the server and the offline client.
 *
 * Offline-first rule: the *device* mints the identity of a sale, the server
 * only accepts it. That makes retries idempotent and lets a cashier show a
 * receipt before the phone ever reaches the network.
 */

export function newId(): string {
  const globalCrypto = globalThis.crypto;

  if (globalCrypto && typeof globalCrypto.randomUUID === "function") {
    return globalCrypto.randomUUID();
  }

  // `crypto.randomUUID` is only available in secure contexts (https/localhost).
  // A shop testing over plain http on a LAN address needs this fallback.
  return `id-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
}

/**
 * Deterministic receipt number derived from the client reference.
 *
 * The same client reference always produces the same receipt number, so a
 * retried sale cannot produce a second receipt and the device can display the
 * number while still offline.
 */
export function receiptNumberFor(clientRef: string): string {
  const compact = clientRef.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
  return `RCPT-${compact.slice(0, 8).padEnd(8, "0")}`;
}
