# Decisions Register

<!-- Append-only. Never edit or remove existing rows.
     To reverse a decision, add a new row that supersedes it.
     Read this file at the start of any planning or research phase. -->

| # | When | Scope | Decision | Choice | Rationale | Revisable? |
|---|------|-------|----------|--------|-----------|------------|
| D001 | M001 | arch | Version 1 deployment model | Local-first web app on the home network | Easier to develop and keep live, and matches the user’s intended environment | Yes — when M002 public deployment begins |
| D002 | M001 | pattern | Physical fridge/freezer identification | Printable QR code per storage context | Scanning the code should immediately recognize the fridge/freezer and connect the user to it with the right context | No |
| D003 | M001 | pattern | Inventory intake trust model | Review-first draft confirmation | Photo/AI capture is helpful but not trusted enough to become truth without human confirmation and correction | No |
| D004 | M001 | data | Quantity model for version 1 | Presence-first item tracking | The first version should be useful without requiring precise quantity math everywhere | Yes — if later cooking flows need richer quantity detail |
| D005 | M001 | data | Expiry handling for foods without printed dates | User-estimated expiry is supported alongside explicit expiry dates | Produce and similar foods still need aging awareness even when the producer provides no date | No |
| D006 | M001 | pattern | Inventory maintenance model | Explicit update/remove/discard actions | Trust depends on users being able to keep inventory current after food is used | No |
| D007 | M001 | scope | Public web deployment | Deferred to M002 | Local usefulness and product truth should be proven before public hosting and domain concerns are added | Yes |
| D008 | M001/S01/T01 | library | Next.js router | App Router (not Pages Router) | App Router enables React Server Components for cleaner data-fetching patterns in later slices; dynamic route params are async in Next.js 15 | Yes — if Pages Router proves simpler for local-only use |
| D009 | M001/S01/T01 | library | Tailwind version | Tailwind CSS v4 with @tailwindcss/postcss | v4 uses CSS-native @theme config instead of tailwind.config.ts; no separate config file needed; aligns with modern PostCSS pipeline | No — downgrade to v3 would require config restructure |
| D010 | M001/S01/T01 | arch | Next.js version | 15.5.14 (not 15.2.3) | 15.2.3 had CVE-2025-66478 (critical); upgraded immediately before first install | No — never downgrade below the patched version |
| D011 | M001/S01/T02 | library | SQLite client | better-sqlite3 (synchronous) | Synchronous API matches Next.js RSC model naturally — no async/await in store functions, no Promise wrapper needed. File lives at data/fridges.db | Yes — switch to libsql/Turso if remote/edge deployment is needed |
| D012 | M001/S01/T02 | library | Short ID generation | nanoid(10) | URL-safe, 10-char IDs have negligible collision probability at local scale; no UUID verbosity in URLs or QR codes | No |
| D013 | M001/S01/T02 | library | QR code rendering | qrcode npm package, SVG output | SVG renders in RSC (no canvas/browser API), is printable without external image requests, and colors match the app's design tokens | No |
