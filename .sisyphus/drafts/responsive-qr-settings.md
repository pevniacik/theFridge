# Draft: Responsive + QR Collapse + Magic Link + Model Dropdown

## Requirements (confirmed)
- **Responsive general**: Make the entire app phone-first responsive (landing, fridge page, settings, all sections)
- **QR collapse on phone**: When a user arrives via QR scan on phone, the QR section should be collapsed/hidden (they already scanned it — showing it is pointless)
- **Magic link to AI provider**: One-click link to the AI provider's API key page, plus paste-assist to avoid manual tab switching
- **Model selection dropdown**: Replace free-text model input with a dropdown of available models per provider

## Technical Decisions
- QR collapse: Server component — could use a client wrapper with `details/summary` or detect mobile via user-agent/viewport
- Magic link: Each provider has a known API key page URL (OpenAI, Anthropic, Google AI Studio)
- Model dropdown: Need a static list of popular models per provider; keep free-text fallback for custom models

## Research Findings
- Current responsive state: `@media (max-width: 640px)` exists in globals.css but only two utility classes
- QR section is server-rendered in page.tsx with inline grid (2-column) — not phone-friendly
- Settings form has free-text model input, no dropdown
- Landing page hero uses `clamp()` for font size — partially responsive

## Open Questions
- ~~Should QR collapse detect "arrived via QR" or just "is mobile viewport"?~~ → **Viewport-based** (<640px collapse)
- ~~Model list: combobox or strict select?~~ → **Combobox** (dropdown + custom type)
- ~~Auto-paste?~~ → **Link + Paste button** (clipboard read into field)

## Decisions Made
- QR collapse: viewport-based, `<details>` collapsed by default on mobile, open on desktop
- Model selector: combobox — dropdown of popular models per provider + free-text custom input
- API key UX: direct link to provider's API key page (new tab) + "📋 Paste" button that reads clipboard
- Test strategy: tests-after for new logic; agent QA for UI

## Scope Boundaries
- INCLUDE: All 4 features above
- EXCLUDE: No new pages, no auth, no offline, no service worker
