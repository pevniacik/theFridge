# Issues

## 2026-03-21 Session ses_2f0882d6effejbYyF2VgM4aBFV — Plan Start

### Known Gotchas
- SQLite ALTER TABLE has no IF NOT EXISTS — must check PRAGMA table_info() first
- iOS 17+ camera: use label+hidden-input pattern, not programmatic .click()
- Next.js API routes: default 1MB body limit — may need increase for mobile photos
- Anthropic JSON: wraps in markdown fences sometimes — must strip before JSON.parse
- @google/generative-ai is deprecated (EOL Aug 2025) — use @google/genai
- PRAGMA table_info() uses positional params, not named — use .all(table) not .all({table})
