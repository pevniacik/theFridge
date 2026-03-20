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
