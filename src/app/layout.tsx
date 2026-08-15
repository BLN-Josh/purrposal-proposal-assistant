import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import { QueryProvider } from "@/lib/query-provider";

/**
 * Self-hosted (not `next/font/google`) — the three files here are the
 * exact latin-subset static weights Google Fonts would otherwise fetch at
 * build/dev time. Vendoring them removes a live network dependency from
 * `next dev`/`next build` entirely: no CDN round-trip, no risk of the
 * intermittent Turbopack-dev "Module not found .../internal/font/google/font"
 * failure that live Google Fonts fetching can hit, and no behavior change
 * for the reader — same files, same `next/font` optimization pipeline
 * (self-hosted static assets, zero layout shift), just resolved locally.
 */
const fraunces = localFont({
  src: "../fonts/fraunces-600.woff2",
  weight: "600",
  variable: "--font-fraunces",
  display: "swap",
});

const plexSans = localFont({
  src: [
    { path: "../fonts/plex-sans-400.woff2", weight: "400" },
    { path: "../fonts/plex-sans-500.woff2", weight: "500" },
    { path: "../fonts/plex-sans-600.woff2", weight: "600" },
  ],
  variable: "--font-plex-sans",
  display: "swap",
});

const plexMono = localFont({
  src: [
    { path: "../fonts/plex-mono-400.woff2", weight: "400" },
    { path: "../fonts/plex-mono-500.woff2", weight: "500" },
  ],
  variable: "--font-plex-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Proposal Assistant",
  description: "Turn a brief into a pitch-ready deck.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${fraunces.variable} ${plexSans.variable} ${plexMono.variable} h-full antialiased`}
    >
      <body className="flex h-full flex-col overflow-hidden bg-background text-foreground">
        <QueryProvider>{children}</QueryProvider>
        <Toaster position="bottom-right" theme="light" offset={{ bottom: "20px" }} />
      </body>
    </html>
  );
}
