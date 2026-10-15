"use client";

import { useEffect, useRef } from "react";

/**
 * Keyboard-wedge scanner support (cheap USB/Bluetooth guns type fast and hit
 * Enter). Listens globally, buffers fast keystrokes, and fires `onScan` only
 * when the burst looks like a scanner rather than a person typing — so normal
 * typing in the search box never triggers it.
 */
export function useBarcodeWedge({
  enabled,
  onScan,
  minLength = 4,
  maxIntervalMs = 45,
}: {
  enabled: boolean;
  onScan: (value: string) => void;
  minLength?: number;
  maxIntervalMs?: number;
}) {
  const onScanRef = useRef(onScan);
  const bufferRef = useRef<{ text: string; lastAt: number } | null>(null);

  useEffect(() => {
    onScanRef.current = onScan;
  }, [onScan]);

  useEffect(() => {
    if (!enabled || typeof window === "undefined") {
      return;
    }

    function handleKeyDown(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      const tag = target?.tagName?.toLowerCase();
      const isEditable = tag === "input" || tag === "textarea" || tag === "select" || target?.isContentEditable;

      // Let real form editing behave normally; wedges still submit from inputs.
      if (isEditable && event.key !== "Enter") {
        bufferRef.current = null;
        return;
      }

      const now = Date.now();

      if (event.key === "Enter") {
        const text = bufferRef.current?.text.trim() ?? "";
        bufferRef.current = null;

        if (text.length >= minLength) {
          event.preventDefault();
          onScanRef.current(text);
        }

        return;
      }

      if (event.key.length !== 1) {
        bufferRef.current = null;
        return;
      }

      const previous = bufferRef.current;

      if (!previous || now - previous.lastAt > maxIntervalMs) {
        bufferRef.current = { text: event.key, lastAt: now };
        return;
      }

      bufferRef.current = { text: `${previous.text}${event.key}`, lastAt: now };
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [enabled, minLength, maxIntervalMs]);
}
