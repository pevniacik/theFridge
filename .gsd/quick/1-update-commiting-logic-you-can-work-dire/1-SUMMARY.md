# Quick Task: Update commiting logic. You can work directly from main and push to main origin.

**Date:** 2026-03-23
**Branch:** main

## What Changed
- Updated the repo workflow policy in `AGENTS.md` to make branch+PR the default while allowing direct-to-`main` execution for quick tasks that explicitly authorize it.
- Updated the public workflow guidance in `README.md` to match the same quick-task exception.

## Files Modified
- AGENTS.md
- README.md
- .gsd/quick/1-update-commiting-logic-you-can-work-dire/1-SUMMARY.md

## Verification
- Reviewed the existing workflow policy in `AGENTS.md` and `README.md`.
- Verified both files now consistently state that quick tasks may commit directly to `main` only when the task explicitly allows it.
- Ran `rg -n "quick task|direct-to-`main`|direct-to-main|Development Workflow Policy|GIT WORKFLOW POLICY" AGENTS.md README.md` to confirm the updated wording is present.
