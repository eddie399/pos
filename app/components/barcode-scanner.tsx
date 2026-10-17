"use client";

import { BrowserMultiFormatReader, type IScannerControls } from "@zxing/browser";
import { useEffect, useRef, useState } from "react";

type BarcodeScannerProps = {
  continuous?: boolean;
  onDetected: (value: string) => void;
  onClose: () => void;
};

type FocusTrack = {
  getCapabilities?: () => { focusMode?: string[] };
  applyConstraints: (constraints: { advanced: Array<{ focusMode: string }> }) => Promise<void>;
};

/**
 * Camera barcode scanner. In continuous mode (used by the till) the camera
 * stays open and the same code is ignored for a short cooldown, so a cashier
 * can scan item after item without reopening the camera each time.
 */
export default function BarcodeScanner({
  continuous = false,
  onDetected,
  onClose,
}: BarcodeScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const onDetectedRef = useRef(onDetected);
  const lastValueRef = useRef<{ value: string; at: number } | null>(null);
  const feedbackTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const flashTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [error, setError] = useState("");
  const [capturedBarcode, setCapturedBarcode] = useState("");
  const [isFlashActive, setIsFlashActive] = useState(false);
  const [showCaptureFeedback, setShowCaptureFeedback] = useState(false);

  useEffect(() => {
    onDetectedRef.current = onDetected;
  }, [onDetected]);

  useEffect(() => {
    const reader = new BrowserMultiFormatReader();
    let controls: IScannerControls | null = null;
    let isActive = true;

    async function enableContinuousFocus(video: HTMLVideoElement) {
      const stream = video.srcObject;
      if (!(stream instanceof MediaStream)) return;

      for (const mediaTrack of stream.getVideoTracks()) {
        const track = mediaTrack as unknown as FocusTrack;
        try {
          const focusModes = track.getCapabilities?.().focusMode;
          if (!focusModes?.includes("continuous")) continue;

          await track.applyConstraints({ advanced: [{ focusMode: "continuous" }] });
        } catch {
          // Some devices advertise autofocus but reject changing it at runtime.
        }
      }
    }

    function showSuccessfulCapture(value: string) {
      setCapturedBarcode(value);
      setShowCaptureFeedback(true);
      setIsFlashActive(true);

      if (feedbackTimeoutRef.current) clearTimeout(feedbackTimeoutRef.current);
      if (flashTimeoutRef.current) clearTimeout(flashTimeoutRef.current);

      feedbackTimeoutRef.current = setTimeout(() => setShowCaptureFeedback(false), 2000);
      flashTimeoutRef.current = setTimeout(() => setIsFlashActive(false), 220);
    }

    async function startScanner() {
      if (!videoRef.current) return;

      try {
        // ZXing opens the camera itself. Calling getUserMedia here as well
        // acquired a second stream that nothing ever stopped, so the camera
        // stayed live (and the battery drained) after the first scan.
        controls = await reader.decodeFromConstraints(
          {
            audio: false,
            video: { facingMode: { ideal: "environment" } },
          },
          videoRef.current,
          (result, scanError) => {
            if (result && isActive) {
              const value = result.getText().trim();
              const now = Date.now();
              const previous = lastValueRef.current;

              // Same label held in front of the camera: only report it again
              // after the cashier had time to move it away.
              if (continuous && previous && previous.value === value && now - previous.at < 1800) {
                return;
              }

              lastValueRef.current = { value, at: now };
              showSuccessfulCapture(value);

              if (continuous) {
                onDetectedRef.current(value);
                return;
              }

              isActive = false;
              onDetectedRef.current(value);
              return;
            }

            if (scanError && scanError.name !== "NotFoundException") {
              setError("Unable to read this code. Try holding the camera steady.");
            }
          },
        );
        await enableContinuousFocus(videoRef.current);
      } catch {
        setError("Camera access was denied or is unavailable on this device.");
      }
    }

    startScanner();

    return () => {
      isActive = false;
      // Releases the camera stream that ZXing opened.
      controls?.stop();
      controls = null;
      if (feedbackTimeoutRef.current) clearTimeout(feedbackTimeoutRef.current);
      if (flashTimeoutRef.current) clearTimeout(flashTimeoutRef.current);
    };
  }, [continuous]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 p-4">
      <section className="w-full max-w-lg rounded-2xl bg-white p-4 shadow-2xl">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-600">Camera scanner</p>
            <h2 className="mt-1 text-xl font-bold text-slate-900">
              {continuous ? "Scan items continuously" : "Scan barcode or QR code"}
            </h2>
          </div>
          <button type="button" onClick={onClose} className="min-h-11 rounded-lg px-3 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100">
            Close
          </button>
        </div>

        <div
          className={`relative mt-4 overflow-hidden rounded-xl bg-slate-950 transition-shadow duration-200 ${
            isFlashActive ? "ring-4 ring-emerald-400" : ""
          }`}
        >
          <video ref={videoRef} className="aspect-video w-full object-cover" muted playsInline />
          <div
            aria-hidden="true"
            className={`pointer-events-none absolute inset-0 bg-emerald-300 transition-opacity duration-200 ${
              isFlashActive ? "opacity-40" : "opacity-0"
            }`}
          />
        </div>

        {showCaptureFeedback ? (
          <p role="status" className="mt-3 rounded-lg bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-800">
            Barcode captured: {capturedBarcode}
          </p>
        ) : null}

        {error ? <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : <p className="mt-3 text-sm text-slate-500">{continuous ? "Keep scanning — close when the basket is complete." : "Point the rear camera at a product code."}</p>}
      </section>
    </div>
  );
}
