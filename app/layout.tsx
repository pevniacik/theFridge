import type { Metadata, Viewport } from "next";
import Link from "next/link";
import "./globals.css";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  userScalable: false,
};

export const metadata: Metadata = {
  title: "theFridge",
  description: "Local-first fridge & freezer inventory — scan, track, cook.",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "theFridge",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link
          rel="preconnect"
          href="https://fonts.googleapis.com"
          crossOrigin="anonymous"
        />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;700&family=DM+Sans:wght@400;500;600&display=swap"
        />
      </head>
      <body>
        <div
          className="min-h-screen flex flex-col"
          style={{
            paddingTop: "env(safe-area-inset-top)",
            paddingBottom: "env(safe-area-inset-bottom)",
          }}
        >
          <header
            style={{
              borderBottom: "1px solid var(--color-border)",
              padding: "0 1.5rem",
              height: "3.5rem",
              display: "flex",
              alignItems: "center",
              gap: "0.75rem",
            }}
          >
            <span
              style={{
                fontFamily: "var(--font-display)",
                fontWeight: 700,
                fontSize: "1rem",
                letterSpacing: "-0.04em",
                color: "var(--color-accent)",
              }}
            >
              theFridge
            </span>
            <span
              className="mobile-hide"
              style={{
                width: "1px",
                height: "1.25rem",
                background: "var(--color-border)",
              }}
            />
            <span
              className="mobile-hide"
              style={{
                fontSize: "0.75rem",
                color: "var(--color-muted)",
                fontFamily: "var(--font-display)",
              }}
            >
              local inventory
            </span>
            <div style={{ marginLeft: "auto" }}>
              <Link
                href="/settings"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.375rem",
                  fontSize: "0.8125rem",
                  color: "var(--color-muted)",
                  textDecoration: "none",
                  padding: "0.25rem 0.5rem",
                  borderRadius: "var(--radius-input, 0.375rem)",
                  minHeight: "44px",
                }}
              >
                <span style={{ fontSize: "1rem" }}>⚙️</span>
                <span className="mobile-hide" style={{ fontFamily: "var(--font-display)" }}>Settings</span>
              </Link>
            </div>
          </header>
          <main className="flex-1">{children}</main>
        </div>
      </body>
    </html>
  );
}
