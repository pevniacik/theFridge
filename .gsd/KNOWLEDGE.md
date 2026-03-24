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

## Inline not-found rendering is better than Next.js notFound() for contextual failure states

**Context:** When a dynamic route receives an ID that doesn't exist in the DB, `notFound()` shows a generic 404. For theFridge storage-context pages, the failure state needs to show the bad ID in context and provide actionable links.

**Pattern:** Render the failure card inline with a conditional check instead of calling `notFound()`. The HTTP status remains 200; detection is via body content.

```tsx
// lib/fridges/store.ts returns null for missing IDs
const fridge = getFridgeById(fridgeId);
if (!fridge) {
  return <StorageNotFoundCard id={fridgeId} />;
}
```

**Diagnostic implication:** When checking for invalid-ID handling, grep the body for "STORAGE NOT FOUND" rather than checking for HTTP 404 — the status will always be 200.

## Next.js App Router: request.formData() throws on empty/missing body — catch it

**Context:** POST route handlers that accept multipart uploads.

**Gotcha:** When a client POSTs without any body or with a non-multipart Content-Type, calling `await request.formData()` throws a TypeError (e.g. "Failed to parse body as FormData"). The check `formData.get("photo") instanceof File` never runs. Wrap `formData()` in try/catch and return a 400 error from the catch block.

```ts
let formData: FormData;
try {
  formData = await request.formData();
} catch {
  return NextResponse.json({ error: "Invalid form data" }, { status: 400 });
}
const file = formData.get("photo");
if (!file || !(file instanceof File)) {
  return NextResponse.json({ error: "No photo provided" }, { status: 400 });
}
```

## QR URL is baked at generation time — encodes the server address when created

**Context:** `lib/qr/generate.ts` builds the storage-context URL from request headers (`x-forwarded-proto` + `host`) when the QR is rendered. This works correctly for both localhost and LAN IPs.

**Gotcha:** The URL encoded in the QR SVG is fixed at generation time. If the server's LAN IP or port changes after QR codes are printed, the printed QR codes will point to a dead address. There is no auto-update mechanism.

**Implication for S06:** During end-to-end home-network testing, confirm the stable LAN address first, then regenerate (reload the context page) to get a QR encoding the correct LAN URL before printing.

## Playwright browser_upload_file triggers React's onChange on hidden file inputs

**Context:** Testing file upload flows in Next.js/React 19 apps with Playwright via the browser tool.

**Gotcha:** Programmatic approaches (DataTransfer + dispatchEvent) do NOT trigger React's synthetic onChange handler. Only Playwright's native `setInputFiles` (used by `browser_upload_file`) correctly triggers the React event system — even when the `<input type="file" style={{ display: "none" }}>` is hidden. Use `browser_upload_file` targeting the hidden input directly; no need to click the visible trigger button first.

**Pattern:** Upload works on `display: none` inputs. After calling `browser_upload_file`, wait for the upload phase UI to appear before asserting anything.

## Next.js dev server silently picks a different port when 3000 is occupied

**Context:** Running `npm run dev` while another process holds port 3000.

**Gotcha:** Next.js logs "Port 3000 is in use by an unknown process, using available port 3001 instead." but still starts successfully. `bg_shell wait_for_ready` detects readiness on the wrong port check if you only probe 3000. Always use `bg_shell highlights` to read the actual "Local: http://localhost:XXXX" line before navigating in the browser.

## Server Actions should return structured results, never throw across the RSC boundary

**Context:** Next.js 15 + React 19 Server Actions called imperatively from client components.

**Pattern:** Server Actions that are called from client component event handlers (not form submissions) should return a typed result object — `{ success: true, count: N }` or `{ success: false, error: "..." }` — and wrap their body in try/catch. Throwing an unhandled error across the RSC boundary produces a generic error in the client that is hard to surface meaningfully in the UI.

```ts
// ✅ correct
export async function confirmDraftAction(fridgeId: string, items: DraftItem[]) {
  try {
    saveDraftItems(fridgeId, items);
    return { success: true as const, count: items.length };
  } catch (err) {
    return { success: false as const, error: err instanceof Error ? err.message : "Unknown error" };
  }
}
```

## Phase enum pattern for multi-step client flows

**Context:** Client components with more than 2 UI states (idle/loading/done) quickly become hard to reason about with boolean flags.

**Pattern:** Define an explicit string union type for the phase and use one branch per phase in the render. This is more readable than nested boolean conditions and makes impossible state combinations unrepresentable.

```ts
type Phase = "idle" | "uploading" | "review" | "confirming" | "done" | "error";
const [phase, setPhase] = useState<Phase>("idle");
// render: if (phase === "idle") return <IdleUI />; etc.
```

**Benefit:** Adding or removing a phase requires only adding/removing one branch and one state transition — no boolean flag interactions to audit.

## useState initializer function avoids hydration flash for prop-derived state

**Context:** Client components in Next.js App Router that derive initial state from RSC-passed props.

**Gotcha:** Using `useEffect` to initialize state from props runs after the first render, causing a visible flash (the component renders with empty/default state, then re-renders with the derived state). Using a `useState` initializer function runs synchronously before the first render.

**Pattern:**
```ts
// ✅ correct — runs once before first render, no flash
const [expiryData, setExpiryData] = useState<Record<string, ExpiryEntry>>(
  () => Object.fromEntries(pendingDrafts.map((d) => [d.id, { date: "", estimated: false }]))
);

// ❌ causes flash — effect runs after first render
useEffect(() => {
  setExpiryData(Object.fromEntries(pendingDrafts.map((d) => [d.id, { date: "", estimated: false }])));
}, [pendingDrafts]);
```

**Caveat:** The initializer only runs once (on mount). If the parent RSC passes new prop values after mount (e.g. via router.refresh()), the component re-mounts entirely in Next.js App Router — the initializer runs again with the fresh props, so this is not a problem in practice for RSC-driven prop updates.

## Quick-pick date computation: setDate(getDate() + N) is DST-safe

**Context:** Computing a future date N days from today in a client component.

**Pattern:** `const d = new Date(); d.setDate(d.getDate() + N); return d.toISOString().split("T")[0];`

**Why:** Adding milliseconds (`Date.now() + N * 86400000`) can shift the computed date by ±1 day across a DST boundary. `setDate` works with the local calendar and handles DST transitions correctly by operating on the logical calendar date rather than raw milliseconds.

## inventory_items status column: use status flips, not DELETEs

**Context:** The `inventory_items` table has a `status` column with CHECK constraint `('active', 'used', 'discarded')`.

**Pattern for S04+:** When a household member marks food as eaten, used, or discarded, update `status` to `'used'` or `'discarded'` rather than deleting the row. `listInventoryItems` already filters `WHERE status = 'active'`, so old items disappear from the UI automatically. This preserves history and keeps the schema consistent with its own CHECK constraint intent.

## Slice UAT placeholders are not milestone-grade evidence

**Context:** GSD doctor can recreate missing `*-UAT.md` files with a placeholder so the artifact shape is restored.

**Gotcha:** A placeholder UAT file is enough to satisfy directory structure checks, but it is **not** enough evidence to close a slice or milestone. Before milestone closure, replace any recovery placeholder with a real acceptance script and actual observed results.

**Diagnostic:** If a UAT file contains wording like `Recovery placeholder UAT` or `Replace this placeholder`, treat the slice as evidence-incomplete until it is rewritten.

## Vitest in nested `.gsd/worktrees/*` can discover duplicate test files

**Context:** This project's worktree lives under the main repository path (`.gsd/worktrees/M001`), and the default Vitest discovery currently reaches both the worktree copy and the parent repo copy.

**Gotcha:** Running `npm run test` from the worktree can report every test file twice (`app/...` and `.gsd/worktrees/M001/app/...`). Pass/fail is still meaningful, but raw file/test counts are inflated.

**Implication:** When quoting milestone evidence, prefer the command outcome (`all tests passed`) and note the duplicate-discovery caveat unless Vitest include/exclude patterns are narrowed.

## Playwright fill vs React controlled inputs (S04/T02)

**Problem:** `browser_fill_ref` / `browser_type` with `clearFirst: true` uses Playwright's `fill()` which sets the DOM input value directly. React controlled inputs (using `value={state}` + `onChange`) DO NOT update their backing state when Playwright fills the input, because `fill()` doesn't dispatch a React synthetic `onChange` event. The DOM shows the new value but React state remains unchanged — so any handler that reads from React state (e.g., `handleSave` reading `editDraft`) will use the old value.

**Fix:** Use `browser_fill_ref` with `slowly: true` (character-by-character) to trigger `onChange` per keystroke, OR interact with the UI as a real user would (the component's own `onChange` handler updates state correctly in production).

**Gotcha for agents:** Never trust a "value was set" assertion from `browser_fill_ref` on a React controlled input as proof that the component's state was updated — it only proves the DOM value changed.


## better-sqlite3 transitive deps: node-gyp-build is NOT a separate package in this project

**Context:** Dockerfile for M002 Docker slice (S01).

**Gotcha:** The T01 plan listed `node-gyp-build` as a transitive dependency of `better-sqlite3` to copy into the standalone runner stage. In practice, this project's `better-sqlite3` (v11.x) uses `bindings` and `prebuild-install` — the compiled `.node` binary is baked inside `better-sqlite3/build/Release/better_sqlite3.node`. There is no standalone `node-gyp-build` package in `node_modules`. Attempting to `COPY` it causes a Dockerfile build error.

**Correct list of packages to copy into the runner stage:**
- `better-sqlite3` (contains prebuilt `.node`)
- `bindings` (runtime loader)
- `file-uri-to-path` (transitive dep of `bindings`)

**Verification:** `ls node_modules | grep -E 'sqlite|bindings|file-uri|node-gyp'` — only `better-sqlite3`, `bindings`, and `file-uri-to-path` appear.

## Copy native modules from `deps` stage, not `builder`, in multi-stage Dockerfiles

**Context:** Dockerfile for M002 Docker slice (S01).

**Gotcha:** The `builder` stage runs `npm prune --omit=dev` after the production build, which can remove packages that `better-sqlite3` and its loader helpers depend on. Copying from the `builder` stage results in missing modules in the runner. Always copy native modules (and their `bindings`/`file-uri-to-path` loaders) from the `deps` stage, which has the full unmodified `node_modules`.

**Pattern:**
```dockerfile
COPY --from=deps --chown=node:node /app/node_modules/better-sqlite3 ./node_modules/better-sqlite3
COPY --from=deps --chown=node:node /app/node_modules/bindings ./node_modules/bindings
COPY --from=deps --chown=node:node /app/node_modules/file-uri-to-path ./node_modules/file-uri-to-path
```

## bash arithmetic with set -e: use `((++N)) || true` not `((N++))`

**Context:** Bash verification scripts using `set -euo pipefail`.

**Gotcha:** `((N++))` with `set -e` exits the script when `N` starts at 0, because post-increment evaluates to the old value (0 = falsy = exit code 1). This silently kills the script at the first increment. Use `(( ++N )) || true` (pre-increment always evaluates to the new non-zero value, `|| true` guards the edge case of going 0→1) or append `|| true` to the increment expression.
