/**
 * generate-icons.mjs
 * Generates real 192×192 and 512×512 PNG app icons for theFridge PWA.
 * Uses sharp to rasterize an inline SVG with the app's theme colours:
 *   background: #0f1011 (dark), accent: #f59c2b (amber)
 *
 * Run: node scripts/generate-icons.mjs
 * Re-runnable: overwrites public/icons/icon-192.png and icon-512.png each time.
 */

import sharp from "sharp";
import { fileURLToPath } from "url";
import path from "path";
import fs from "fs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.join(__dirname, "..");
const iconsDir = path.join(rootDir, "public", "icons");

// Ensure target directory exists
fs.mkdirSync(iconsDir, { recursive: true });

// SVG source — 512×512 viewport, dark rounded rect + fridge emoji centred
const svgSource = `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
  <!-- Background -->
  <rect width="512" height="512" rx="96" ry="96" fill="#0f1011"/>
  <!-- Fridge emoji rendered as text — works via SVG foreignObject approach is not needed;
       we use a simple text element for the unicode glyph. -->
  <text
    x="256"
    y="320"
    font-size="256"
    text-anchor="middle"
    dominant-baseline="middle"
    fill="#f59c2b"
    font-family="Apple Color Emoji, Segoe UI Emoji, Noto Color Emoji, sans-serif"
  >🧊</text>
</svg>`;

const svgBuffer = Buffer.from(svgSource);

async function generateIcons() {
  console.log("[generate-icons] Generating 512×512 icon...");
  const icon512Path = path.join(iconsDir, "icon-512.png");
  await sharp(svgBuffer)
    .resize(512, 512)
    .png()
    .toFile(icon512Path);
  console.log(`[generate-icons] Written: ${icon512Path}`);

  console.log("[generate-icons] Generating 192×192 icon...");
  const icon192Path = path.join(iconsDir, "icon-192.png");
  await sharp(svgBuffer)
    .resize(192, 192)
    .png()
    .toFile(icon192Path);
  console.log(`[generate-icons] Written: ${icon192Path}`);

  console.log("[generate-icons] Done. Verifying dimensions...");
  const meta512 = await sharp(icon512Path).metadata();
  const meta192 = await sharp(icon192Path).metadata();
  console.log(`[generate-icons] icon-512.png: ${meta512.width}×${meta512.height}`);
  console.log(`[generate-icons] icon-192.png: ${meta192.width}×${meta192.height}`);

  if (meta512.width !== 512 || meta512.height !== 512) {
    throw new Error(`icon-512.png has unexpected dimensions: ${meta512.width}×${meta512.height}`);
  }
  if (meta192.width !== 192 || meta192.height !== 192) {
    throw new Error(`icon-192.png has unexpected dimensions: ${meta192.width}×${meta192.height}`);
  }
  console.log("[generate-icons] All icons verified. ✓");
}

generateIcons().catch((err) => {
  console.error("[generate-icons] ERROR:", err.message);
  process.exit(1);
});
