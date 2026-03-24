# Project

## What This Is

The Fridge is a shared household web app that creates a digital representation of real fridges and freezers. Each physical storage unit can have its own printable QR code so a person standing in front of it can scan the code on the home network and immediately enter the correct storage context. From there, the app helps the household capture groceries from photos, confirm the detected items, track what is currently present, and keep awareness of aging or expiring food.

## Core Value

A household can reliably answer: what is actually in this fridge or freezer right now, and what should we use before it goes to waste?

## Current State

M001 is complete. The local web app now delivers the full local-first household loop: fridge/freezer identity records with printable SVG QR codes and storage-context routing (S01); review-first grocery photo intake with editable AI/stub drafts persisted to `intake_drafts` (S02); atomic promotion into item-level `inventory_items` with explicit or estimated expiry dates (S03); shared maintenance actions for inline edit, used, and discarded states with fridge-scoped mutations and no deletes (S04); and a server-rendered status experience with urgency alerts plus grounded cooking suggestions derived from current inventory (S05). S06 closed the milestone by proving LAN reachability with `next dev --hostname 0.0.0.0`, confirming the health endpoint and QR URLs over `192.168.1.22`, and re-running milestone verification (`npm run test`, `npm run type-check`, `npm run build`). The assembled QR → intake → inventory → maintenance → status → suggestion loop is now verified for M001.

M002 is active. S01 (Docker Production Container) is complete. S02 (PWA Shell & Home Screen) is complete: real 192×192 and 512×512 PNG icons (🧊 dark theme) replaced the 1×1 placeholders; `@serwist/next` wraps `next.config.ts` and generates `public/sw.js` (42KB) on production build; `app/sw.ts` service worker has precache manifest, `skipWaiting`, `clientsClaim`, and offline fallback to `/~offline`; `app/~offline/page.tsx` is a static offline fallback page; `tsconfig.worker.json` handles isolated worker type-checking without polluting DOM types; `bash scripts/verify-s02-pwa.sh` passes 6/6 Docker checks. R023 and R024 validated at build level; phone PWA install is TC-07 manual UAT pending. S03 (Last-Used Fridge Memory) is complete: `LastFridgeWriter` (invisible "use client" island) writes `localStorage['lastFridgeId']` on every fridge context visit; `LastFridgeRedirect` (invisible "use client" island at root page) reads the value on mount and calls `router.replace('/fridges/<id>')` if present; both components are wired into their respective Server Component pages; `npm run type-check` and `npm run build` both exit 0; R025 and R026 validated. The remaining slice is: S04 (mDNS `thefridge.local` hostname, optional/nice-to-have).

## Architecture / Key Patterns

Planned as a local-first web app for version 1, running on the home network over Wi‑Fi. Physical fridge/freezer contexts are identified by printable QR codes. Inventory intake is review-first: photos produce drafts that humans confirm or correct before inventory becomes truth. Inventory remains trustworthy through explicit update, remove, and discard flows after food is used. AI is used where helpful for photo understanding and cooking suggestions, with a preference for low-cost or open-source/local model paths where practical.

M002 adds a Docker production container (multi-stage build, SQLite volume mount, `restart: unless-stopped`), a Serwist-based service worker for app-shell caching, and `bonjour-service` for mDNS advertisement. M001 application logic is entirely preserved and not modified.

## Capability Contract

See `.gsd/REQUIREMENTS.md` for the explicit capability contract, requirement status, and coverage mapping.

## Milestone Sequence

- [x] M001: Local-first household fridge inventory — Run a QR-based fridge/freezer inventory app on the home network with photo intake, trustworthy status, expiry awareness, and grounded cooking suggestions
- [ ] M002: Zero-friction access & deployment — Docker one-command setup, PWA home screen installation, last-used fridge memory, and mDNS hostname for any home device
