import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import SessionShell from "@/app/components/session-shell";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "Duka POS",
    template: "%s · Duka POS",
  },
  description: "Duka is a mobile-first POS and small-shop management system for Malawian retailers.",
  applicationName: "Duka POS",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "Duka POS",
    statusBarStyle: "default",
  },
};

/**
 * Declared separately from `metadata` as Next.js expects. Pinch zoom is left
 * enabled on purpose: a cashier must be able to zoom a price on a small screen.
 */
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#059669",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full bg-slate-50 text-slate-900">
        <SessionShell>{children}</SessionShell>
      </body>
    </html>
  );
}
