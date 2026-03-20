# T01: Create the local web app foundation

**Slice:** S01
**Milestone:** M001

## Goal
Create the initial local-first web app skeleton so the project has a real browser entrypoint and routing structure for fridge/freezer context flows.

## Must-Haves

### Truths
Observable behaviors that must be true when this task is done:
- "The project can install and run a local web app in development"
- "The app has a visible home screen that explains the fridge/freezer QR workflow"
- "A dynamic storage-context route exists for fridge/freezer pages"

### Artifacts
Files that must exist with real implementation (not stubs):
- `package.json` — project manifest with runnable app scripts
- `app/layout.tsx` — root layout for the web app
- `app/page.tsx` — home screen for the local-first fridge app
- `app/fridges/[fridgeId]/page.tsx` — dynamic route for fridge/freezer context pages

### Key Links
Critical wiring between artifacts:
- `app/layout.tsx` → `app/page.tsx` via shared app shell rendering
- `app/fridges/[fridgeId]/page.tsx` → Next.js dynamic params contract via `fridgeId`

## Steps
1. Initialize the web app project structure and dependencies.
2. Create the root layout and home page with local-first framing.
3. Add the dynamic fridge/freezer route for future QR entry.
4. Add minimal styling or layout primitives so the app is readable for demos.
5. Verify the dev server boots and routes render.

## Context
- Follow the M001 decision to keep version 1 as a local-first web app.
- This task establishes the entrypoint consumed by all later slices.
- Keep the shape simple and browser-first; native/mobile work is out of scope.

## Expected Output

Files created or modified by this task:

- `package.json`
- `tsconfig.json`
- `next.config.ts`
- `tailwind.config.ts`
- `postcss.config.mjs`
- `app/layout.tsx`
- `app/page.tsx`
- `app/globals.css`
- `app/fridges/[fridgeId]/page.tsx`

## Observability Impact

**What signals change after this task:**
- The Next.js dev server (`npm run dev`) becomes runnable for the first time; its stdout/stderr is the primary signal.
- `http://localhost:3000` returns a 200 with the home page content — curl-checkable.
- `http://localhost:3000/fridges/<id>` returns a rendered page showing the `fridgeId` param — confirms dynamic routing works before the data layer exists.
- TypeScript compilation (`npx tsc --noEmit`) is green with zero errors.

**How a future agent inspects this task:**
- Run `npm run dev` and check terminal for "ready" message and port.
- `curl http://localhost:3000` and look for the app title text.
- `curl http://localhost:3000/fridges/test-id` and look for "test-id" in the rendered HTML (proves param plumbing works).

**What failure state becomes visible:**
- If `package.json` or `tsconfig.json` is missing, `npm run dev` fails immediately with a module-not-found error.
- If the `[fridgeId]` route file is absent, Next.js returns 404 and logs the missing page to the terminal.
- If Tailwind is misconfigured, the home page renders unstyled (no fonts, no spacing) — visible at a glance.
