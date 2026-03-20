import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "theFridge",
  description: "Local-first fridge & freezer inventory — scan, track, cook.",
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
        <div className="min-h-screen flex flex-col">
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
              style={{
                width: "1px",
                height: "1.25rem",
                background: "var(--color-border)",
              }}
            />
            <span
              style={{
                fontSize: "0.75rem",
                color: "var(--color-muted)",
                fontFamily: "var(--font-display)",
              }}
            >
              local inventory
            </span>
          </header>
          <main className="flex-1">{children}</main>
        </div>
      </body>
    </html>
  );
}
