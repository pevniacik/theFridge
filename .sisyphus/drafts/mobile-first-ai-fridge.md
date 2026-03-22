# Draft: Mobile-First AI-Powered Fridge App

## Requirements (confirmed from user)

- **Phone-first usage**: All real usage comes from mobile (iPhone). QR scan opens fridge context.
- **QR → fridge works**: User confirmed scanning QR connects to correct fridge page on LAN.
- **Photo intake from phone**: Snap grocery photo → AI extracts items → review → add to inventory.
- **Single item addition**: Must support adding one item at a time (not just batch photo).
- **Single item metadata**: When adding single item, must ask: what is it, when bought. AI handles the rest (category, expiry estimate, etc.)
- **Date from photo**: When using photo intake, purchase date derived from when photo is taken (today).
- **Multi-LLM support**: User chooses provider (Gemini, Claude, GPT). Configures API key once, remembered for future use.
- **Persistent context**: App remembers fridge context every time user scans and connects. Storage for app settings + fridge state.

## Technical Decisions
- Multi-LLM provider selection stored in DB (not env vars) — user configures via UI once
- API key encrypted or stored locally in SQLite settings table
- Photo capture optimized for mobile camera (capture="environment" on iOS)

## User Answers
1. Single item add: **Both options** (photo of item OR type name)
2. LLM config: **Global** (one config for all fridges)
3. Offline: **Always connected is fine**
4. Item history: **Disappear from active list** (current behavior kept)

## Research Findings
- **Mobile UX**: No viewport meta, no PWA manifest, no touch sizing, no camera capture attr. Needs full mobile overhaul.
- **AI pipeline**: Hardcoded OpenAI gpt-4o-mini in extract.ts. No provider abstraction. No settings table.
- **Storage gaps**: No settings/config table. No category, purchase_date, or photo fields on items.
- **Multi-LLM**: Vercel AI SDK or factory pattern recommended. All 3 providers support vision with base64 images.
- **Camera UX**: Need `capture="environment"` + label pattern for iOS 17+, EXIF handling, viewport-fit=cover.

## Schema Changes Needed
- New `app_settings` table (provider, encrypted API key, selected model)
- Add `category TEXT`, `purchase_date TEXT` to inventory_items
- Enhanced AI prompt: extract category + estimate expiry from item type

## Open Questions
- (all resolved)

## Scope Boundaries
- INCLUDE: Mobile UX overhaul, single-item add flow, multi-LLM provider setup, persistent settings, enhanced AI extraction
- EXCLUDE: Public deployment (M002), native app, barcode scanning, recipe workflows
