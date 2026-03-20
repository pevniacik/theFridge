/**
 * components/QrCode.tsx
 * Server component that renders an SVG QR code for a given URL.
 * Falls back to a text link if SVG generation fails.
 *
 * Usage:
 *   <QrCode baseUrl="http://192.168.1.10:3000" fridgeId="V1StGXR8_Z" />
 */

import { generateFridgeQr } from "@/lib/qr/generate";

interface QrCodeProps {
  baseUrl: string;
  fridgeId: string;
  /** Optional CSS size override for the SVG wrapper (default: 200px) */
  size?: number;
}

export default async function QrCode({
  baseUrl,
  fridgeId,
  size = 200,
}: QrCodeProps) {
  const result = await generateFridgeQr(baseUrl, fridgeId);

  if ("error" in result) {
    // Graceful text fallback — QR generation errors go to console.error above
    return (
      <div
        style={{
          padding: "1rem",
          border: "1px dashed var(--color-border)",
          borderRadius: "var(--radius-card)",
          textAlign: "center",
          color: "var(--color-muted)",
          fontSize: "0.8125rem",
          wordBreak: "break-all",
        }}
      >
        <p style={{ marginBottom: "0.5rem" }}>QR generation failed — use URL directly:</p>
        <a
          href={`/fridges/${fridgeId}`}
          style={{ color: "var(--color-cold)", fontFamily: "var(--font-display)" }}
        >
          /fridges/{fridgeId}
        </a>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", alignItems: "flex-start" }}>
      {/* SVG rendered inline — printable, no external request */}
      <div
        style={{
          width: size,
          height: size,
          borderRadius: "var(--radius-card)",
          overflow: "hidden",
          border: "1px solid var(--color-border)",
        }}
        dangerouslySetInnerHTML={{ __html: result.svg }}
      />
      <p
        style={{
          fontFamily: "var(--font-display)",
          fontSize: "0.6875rem",
          color: "var(--color-muted)",
          wordBreak: "break-all",
          maxWidth: size,
        }}
      >
        {result.url}
      </p>
    </div>
  );
}
