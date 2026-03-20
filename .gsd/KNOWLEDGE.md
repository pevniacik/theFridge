# Knowledge Base

<!-- Append-only. Only add entries that would save future agents from repeating investigation. -->

## Tailwind CSS v4: config is CSS-only, not tailwind.config.ts

**Context:** theFridge uses Tailwind v4 (`^4.0`).

**Gotcha:** Tailwind v4 has no `tailwind.config.ts` / `tailwind.config.js`. Configuration lives entirely in CSS via `@theme {}` in `globals.css`, and the PostCSS plugin is `@tailwindcss/postcss` (not `tailwindcss`). Using a v3-style `tailwind.config.ts` or importing `tailwindcss` as a PostCSS plugin will break the build.

**Correct setup:**
```
postcss.config.mjs   → plugins: { "@tailwindcss/postcss": {} }
app/globals.css      → @import "tailwindcss"; @theme { --color-...: ...; }
```

## Next.js 15: route params are async

**Context:** App Router in Next.js 15.

**Gotcha:** Dynamic route `params` are `Promise<{ id: string }>`, not `{ id: string }`. Always `await params` inside an `async` page/layout component. Typing them as synchronous causes a TypeScript error and runtime warning.

```tsx
// ✅ correct
export default async function Page({ params }: { params: Promise<{ fridgeId: string }> }) {
  const { fridgeId } = await params;
}
```

## .gsd must not be git-ignored

**Context:** The `.gsd` directory stores all project plans, decisions, and state.

**Gotcha:** The default `.gitignore` template ignored `.gsd/`. This was corrected in T01 by commenting out that rule. If `.gsd` is ignored, the planning system's files won't be committed, and the git history won't reflect any agent work.

## React 19 useActionState: server action must accept (prevState, formData)

**Context:** Next.js 15 + React 19 server actions used with `useActionState`.

**Gotcha:** `useActionState(action, initialState)` requires the action to have the signature `(prevState: S, formData: FormData) => S | Promise<S>`. If the action only accepts `(formData: FormData)`, TypeScript raises `No overload matches this call` error. The fix is to add `_prevState: S` as the first parameter (convention: underscore-prefix since it's unused when redirecting on success).

```ts
// ✅ correct
export async function myAction(_prevState: MyState, formData: FormData): Promise<MyState> { ... }

// ❌ breaks useActionState
export async function myAction(formData: FormData): Promise<MyState> { ... }
```

`redirect()` in a server action throws an internal Next.js exception — it does not return. The TypeScript return type should be `Promise<MyState>` (not `Promise<MyState | never>`); the compiler accepts this because redirect throws at runtime.

## better-sqlite3 is synchronous — getDb() singleton is safe in Next.js RSC

**Context:** Next.js server components call the DB layer on each request, in the same Node.js process.

**Pattern:** Wrap `new Database(path)` in a module-level singleton (`let _db`) so schema migrations run once per process start, not once per request. Call `db.pragma('journal_mode = WAL')` immediately after opening for better concurrent read performance.
```ts
let _db: Database.Database | null = null;
export function getDb(): Database.Database {
  if (_db) return _db;
  _db = new Database(DB_PATH);
  _db.pragma('journal_mode = WAL');
  _db.exec(`CREATE TABLE IF NOT EXISTS ...`);
  return _db;
}
```
