# Project

## What This Is

The Fridge is a shared household web app that creates a digital representation of real fridges and freezers. Each physical storage unit can have its own printable QR code so a person standing in front of it can scan the code on the home network and immediately enter the correct storage context. From there, the app helps the household capture groceries from photos, confirm the detected items, track what is currently present, and keep awareness of aging or expiring food.

## Core Value

A household can reliably answer: what is actually in this fridge or freezer right now, and what should we use before it goes to waste?

## Current State

Project planning is complete for M001. No product code has been built yet.

## Architecture / Key Patterns

Planned as a local-first web app for version 1, running on the home network over Wi‑Fi. Physical fridge/freezer contexts are identified by printable QR codes. Inventory intake is review-first: photos produce drafts that humans confirm or correct before inventory becomes truth. Inventory remains trustworthy through explicit update, remove, and discard flows after food is used. AI is used where helpful for photo understanding and cooking suggestions, with a preference for low-cost or open-source/local model paths where practical.

## Capability Contract

See `.gsd/REQUIREMENTS.md` for the explicit capability contract, requirement status, and coverage mapping.

## Milestone Sequence

- [ ] M001: Local-first household fridge inventory — Run a QR-based fridge/freezer inventory app on the home network with photo intake, trustworthy status, expiry awareness, and grounded cooking suggestions
- [ ] M002: Public web deployment — Extend the product to a domain-hosted public version with broader access and deployment/security concerns
