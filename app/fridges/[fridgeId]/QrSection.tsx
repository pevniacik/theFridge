"use client";

import { useEffect, useRef } from "react";

interface Props {
  children: React.ReactNode;
}

export default function QrSection({ children }: Props) {
  const ref = useRef<HTMLDetailsElement>(null);

  useEffect(() => {
    if (ref.current && window.innerWidth >= 640) {
      ref.current.open = true;
    }
  }, []);

  return (
    <details
      ref={ref}
      className="qr-collapse"
      style={{
        background: "var(--color-panel)",
        border: "1px solid var(--color-border)",
        borderRadius: "var(--radius-card)",
        marginBottom: "2rem",
      }}
    >
      <summary
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          fontFamily: "var(--font-display)",
          fontSize: "0.6875rem",
          letterSpacing: "0.15em",
          textTransform: "uppercase" as const,
          color: "var(--color-cold)",
          padding: "1rem 1.5rem",
          minHeight: "44px",
          touchAction: "manipulation" as const,
          userSelect: "none" as const,
        }}
      >
        <span>printable QR</span>
        <span
          style={{
            fontSize: "0.6875rem",
            color: "var(--color-muted)",
            letterSpacing: "0.08em",
          }}
        >
          tap to toggle
        </span>
      </summary>
      <div style={{ padding: "0 1.5rem 1.5rem" }}>{children}</div>
    </details>
  );
}
