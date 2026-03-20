# Project

## What This Is

The Fridge is a shared household web app that creates a digital representation of real fridges and freezers. Each physical storage unit can have its own printable QR code so a person standing in front of it can scan the code on the home network and immediately enter the correct storage context. From there, the app helps the household capture groceries from photos, confirm the detected items, track what is currently present, and keep awareness of aging or expiring food.

## Core Value

A household can reliably answer: what is actually in this fridge or freezer right now, and what should we use before it goes to waste?

## Current State

S01 and S02 complete. The local web app runs with fridge/freezer identity records, printable QR code generation, and storage-context routing (S01). Photo intake is fully wired: a user can upload a grocery photo, review and correct AI-extracted draft items in an editable review UI, and confirm them into the `intake_drafts` DB table (S02). The QR → context entry → photo intake → draft review → confirm loop works end-to-end on localhost. S03 (inventory truth and expiry model) is next — it will consume confirmed `intake_drafts` rows and promote them into a persistent item-level inventory.

## Architecture / Key Patterns

Planned as a local-first web app for version 1, running on the home network over Wi‑Fi. Physical fridge/freezer contexts are identified by printable QR codes. Inventory intake is review-first: photos produce drafts that humans confirm or correct before inventory becomes truth. Inventory remains trustworthy through explicit update, remove, and discard flows after food is used. AI is used where helpful for photo understanding and cooking suggestions, with a preference for low-cost or open-source/local model paths where practical.

## Capability Contract

See `.gsd/REQUIREMENTS.md` for the explicit capability contract, requirement status, and coverage mapping.

## Milestone Sequence

- [ ] M001: Local-first household fridge inventory — Run a QR-based fridge/freezer inventory app on the home network with photo intake, trustworthy status, expiry awareness, and grounded cooking suggestions
- [ ] M002: Public web deployment — Extend the product to a domain-hosted public version with broader access and deployment/security concerns
