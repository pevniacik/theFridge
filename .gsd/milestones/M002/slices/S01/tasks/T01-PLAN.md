---
estimated_steps: 5
estimated_files: 3
skills_used: []
---

# T01: Configure standalone build and rewrite Dockerfile for production

**Slice:** S01 — Docker Production Container
**Milestone:** M002

## Description

The existing Dockerfile uses a runner stage that copies the full `node_modules` and runs `npm start` (which calls `next start`). This doesn't work with `output: 'standalone'` — standalone mode produces a self-contained `server.js` at `.next/standalone/server.js` that replaces `next start`. The runner stage must be completely rewritten.

The critical risk is `better-sqlite3`: its native `.node` binary is loaded via `node-gyp-build` at runtime, which Next.js standalone file tracing (`@vercel/nft`) cannot statically trace. The binary will NOT appear in `.next/standalone/node_modules/` automatically. We must explicitly copy `better-sqlite3` and its transitive dependencies (`bindings`, `file-uri-to-path`, `node-gyp-build`) into `/app/node_modules/` in the runner stage. Node's module resolution walks up the directory tree, so `server.js` at `/app/server.js` will find them.

## Steps

1. **Edit `next.config.ts`** — add `output: 'standalone'` to the config object. Remove the comment about "intentionally minimal." Keep the file simple.

2. **Rewrite the runner stage in `Dockerfile`** — replace everything from `FROM ... AS runner` onward:
   - Keep deps and builder stages exactly as-is (they correctly compile `better-sqlite3`)
   - Runner stage:
     ```dockerfile
     FROM node:22-bookworm-slim AS runner
     WORKDIR /app
     ENV NODE_ENV=production
     ENV NEXT_TELEMETRY_DISABLED=1

     # better-sqlite3 native binary + its transitive deps (not traced by nft)
     COPY --from=builder --chown=node:node /app/node_modules/better-sqlite3 ./node_modules/better-sqlite3
     COPY --from=builder --chown=node:node /app/node_modules/bindings ./node_modules/bindings
     COPY --from=builder --chown=node:node /app/node_modules/file-uri-to-path ./node_modules/file-uri-to-path
     COPY --from=builder --chown=node:node /app/node_modules/node-gyp-build ./node_modules/node-gyp-build

     # Standalone Next.js output (server.js ends up at /app/server.js)
     COPY --from=builder --chown=node:node /app/.next/standalone ./

     # Static assets (excluded from standalone by design)
     COPY --from=builder --chown=node:node /app/.next/static ./.next/static
     COPY --from=builder --chown=node:node /app/public ./public

     # Data directory for SQLite volume mount
     RUN mkdir -p /app/data && chown node:node /app/data

     USER node
     EXPOSE 3000
     CMD ["node", "server.js"]
     ```
   - **Key detail**: `COPY ... /app/.next/standalone ./` extracts the standalone contents into `/app/`. So `server.js` ends up at `/app/server.js`, not `/app/.next/standalone/server.js`. This is why `CMD ["node", "server.js"]` is correct.

3. **Edit `docker-compose.yml`** — add `GOOGLE_AI_API_KEY` and `NODE_ENV` to the environment block:
   ```yaml
   environment:
     PORT: "3000"
     HOSTNAME: "0.0.0.0"
     NODE_ENV: production
     GOOGLE_AI_API_KEY: ${GOOGLE_AI_API_KEY:-}
     OPENAI_API_KEY: ${OPENAI_API_KEY:-}
   ```

4. **Verify file correctness** — run grep checks to confirm all three files have the expected content.

5. **Run `npm run type-check`** — ensure the `next.config.ts` change doesn't break TypeScript.

## Must-Haves

- [ ] `next.config.ts` contains `output: "standalone"`
- [ ] Dockerfile runner stage uses `CMD ["node", "server.js"]` not `CMD ["npm", "start"]`
- [ ] Dockerfile copies `better-sqlite3`, `bindings`, `file-uri-to-path`, `node-gyp-build` explicitly
- [ ] Dockerfile copies `.next/static` and `public/` into standalone output
- [ ] Dockerfile creates `/app/data` directory with correct ownership
- [ ] `docker-compose.yml` passes `GOOGLE_AI_API_KEY` to the container
- [ ] `docker-compose.yml` sets `NODE_ENV: production`

## Verification

- `grep -q '"standalone"' next.config.ts` → exit 0
- `grep -q 'node.*server.js' Dockerfile` → exit 0
- `grep -q 'better-sqlite3' Dockerfile` → exit 0
- `grep -q 'GOOGLE_AI_API_KEY' docker-compose.yml` → exit 0
- `npm run type-check` passes (if available)

## Inputs

- `next.config.ts` — current config with no `output` property
- `Dockerfile` — current file with wrong runner stage (uses `npm start` + full `node_modules`)
- `docker-compose.yml` — current file missing `GOOGLE_AI_API_KEY` passthrough

## Expected Output

- `next.config.ts` — updated with `output: 'standalone'`
- `Dockerfile` — rewritten runner stage with standalone pattern + explicit native module copies
- `docker-compose.yml` — updated environment block with `GOOGLE_AI_API_KEY` and `NODE_ENV`
