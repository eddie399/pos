"use client";

import { useSyncExternalStore } from "react";

/**
 * Browser connectivity, as React state.
 *
 * `navigator.onLine` is external to React, so `useSyncExternalStore` is the
 * right API: React subscribes to the `online`/`offline` events directly and
 * reads the current value during render. The previous approach mirrored
 * `navigator.onLine` into `useState` from an effect, which the React Compiler
 * rules flag (`set-state-in-effect`) because it causes a cascading render and,
 * worse, briefly renders the wrong "online" state on every mount.
 *
 * This reflects whether the device has *a* network interface, not whether the
 * server is reachable, so it is a hint for the UI and never proof that a write
 * will succeed — which is why every write path in this app also handles a
 * failed fetch.
 */
function subscribe(callback: () => void) {
  window.addEventListener("online", callback);
  window.addEventListener("offline", callback);

  return () => {
    window.removeEventListener("online", callback);
    window.removeEventListener("offline", callback);
  };
}

function getSnapshot() {
  return navigator.onLine;
}

/** The server render has no `navigator`; assume online and let the client correct it. */
function getServerSnapshot() {
  return true;
}

export function useOnlineStatus(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
