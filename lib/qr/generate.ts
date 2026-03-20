/**
 * lib/qr/generate.ts
 * Server-side QR code generation as SVG string.
 * Uses the `qrcode` npm package (no canvas/browser API required).
 *
 * QR payload: the full URL to the fridge context page.
 * Example: http://localhost:3000/fridges/V1StGXR8_Z
 *
 * Callers pass the base URL (from headers or env) so the QR
 * remains correct when the app is accessed on a LAN IP rather
 * than localhost.
 */

import QRCode from "qrcode";

export interface QrCodeResult {
  svg: string;
  url: string;
  error?: never;
}

export interface QrCodeError {
  svg?: never;
  url?: never;
  error: string;
}

/**
 * Build the target URL for a fridge context page.
 * baseUrl should be the app's origin (e.g. "http://192.168.1.10:3000").
 */
export function buildFridgeUrl(baseUrl: string, fridgeId: string): string {
  // Strip trailing slash
  const origin = baseUrl.replace(/\/$/, "");
  return `${origin}/fridges/${fridgeId}`;
}

/**
 * Generate a QR code SVG for the given fridge ID.
 * Returns { svg, url } on success or { error } on failure.
 * Failure is non-throwing so the UI can display a text fallback.
 */
export async function generateFridgeQr(
  baseUrl: string,
  fridgeId: string
): Promise<QrCodeResult | QrCodeError> {
  const url = buildFridgeUrl(baseUrl, fridgeId);
  try {
    const svg = await QRCode.toString(url, {
      type: "svg",
      errorCorrectionLevel: "M",
      margin: 2,
      color: {
        dark: "#0f1011", // matches --color-surface (dark cells)
        light: "#e8e9eb", // matches --color-text (light background)
      },
    });
    return { svg, url };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[qr] Failed to generate QR code for", fridgeId, ":", message);
    return { error: message };
  }
}
