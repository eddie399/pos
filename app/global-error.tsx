"use client";

/**
 * Last resort boundary: it replaces the root layout, so it must render its own
 * <html>/<body> and cannot rely on the Tailwind stylesheet that layout imports.
 */
export default function GlobalError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, fontFamily: "Arial, Helvetica, sans-serif", background: "#f8fafc", color: "#0f172a" }}>
        <main style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
          <div
            style={{
              maxWidth: 420,
              width: "100%",
              background: "#ffffff",
              border: "1px solid #e2e8f0",
              borderRadius: 16,
              padding: 32,
              textAlign: "center",
            }}
          >
            <p style={{ fontSize: 11, letterSpacing: 2, textTransform: "uppercase", color: "#059669", margin: 0 }}>
              Duka POS
            </p>
            <h1 style={{ fontSize: 22, margin: "12px 0 0" }}>Duka could not start</h1>
            <p style={{ fontSize: 14, color: "#475569", marginTop: 12 }}>
              Reload the app. Sales already queued on this device are safe.
            </p>
            <p style={{ fontSize: 12, color: "#94a3b8", marginTop: 12, wordBreak: "break-word" }}>
              {error.digest ? `Reference: ${error.digest}` : error.message}
            </p>
            <button
              type="button"
              onClick={() => retry()}
              style={{
                marginTop: 20,
                width: "100%",
                padding: "12px 16px",
                borderRadius: 12,
                border: "none",
                background: "#059669",
                color: "#ffffff",
                fontSize: 15,
                cursor: "pointer",
              }}
            >
              Reload
            </button>
          </div>
        </main>
      </body>
    </html>
  );
}
