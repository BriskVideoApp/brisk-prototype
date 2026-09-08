# Shoot stage handover

Updated: 8 September 2026

## Start here

Continue in the existing saved-project checkout at `/Users/gclt1/GitHub/brisk-prototype` on branch `codex/unified-brisk-prototype`.

The working tree is intentionally dirty and contains the user's accumulated prototype work. Preserve all tracked and untracked changes. Do not reset, clean, discard, or broadly rewrite existing work.

Before changing anything:

1. Read `AGENTS.md` in full.
2. For visual or component work, read `Brisk DS/guidelines/Guidelines.md`, `brisk-design-system.md`, `brisk-production-journey.md`, `Docs/References/screen-inventory.md`, and `Docs/shoot-pre-production-ticket.md` as relevant.
3. Inspect the current screen and code before acting on new feedback.

Do not make further product changes until the user gives the next Shoot-stage instruction.

## Current demo context

- Route: `http://localhost:3000/projects/loom-launch-film/stages/shoot`
- Project: Loom / Launch Film - Sales Narrative
- Typical role: Studio Staff
- The user is iterating visually through browser comments and screenshots.

## Primary Shoot files

- `src/components/shoot/ShootStagePage.tsx`
- `src/components/shoot/shoot.css`
- `src/components/shoot/SharedCallSheetPage.tsx`
- `src/data/shoot.ts`

## Product decisions already implemented

### Setup

- The quick-start panel heading is `Setup`.
- Setup contains five concise questions.
- Capture choices are icon tiles and support multiple selection:
  - Interviews
  - Scripted scenes
  - B-roll or general coverage
- `A mixture` was removed.
- `Not sure yet - decide later` is plain text, has a purple hover state, and advances directly to the next step.
- Interview Questions are hidden when Scripted scenes is selected without Interviews.

### People

- The people step uses a search/input at the top.
- Added people appear in a list beneath the input.

### Locations

- The location step uses Google Maps/address autosuggest.
- A selected suggestion is submitted and added to a list beneath the input.
- Listed addresses appear as hyperlinks.
- Location name was removed from Setup and can be added later elsewhere.
- `Not confirmed yet` was removed.
- The separate `Google Maps link or address` label above the field was removed.

### Dates

- The dates step follows the same pattern as People and Locations: input at the top, existing dates listed beneath.
- Shoot dates are labelled Day 1, Day 2, and so on.

### Must-have shots

- Text entries can be submitted and added like the preceding list screens.
- `No must-haves - let Brisk suggest them` was removed.

### Call Sheet and Shoot helper

- The Shoot sidebar's On Set section contains both `Call Sheet` and `Shoot helper`.
- `Start shoot` remains visible for users who can manage, regardless of approval status. Readiness messaging remains non-blocking.
- Shoot helper opens inside the main Shoot workspace, keeping the project stage header and the full Shoot sidebar visible.
- `ShootWorkspaceSection` includes `shoot-helper` and preserves it in stored/parsed workspace state.
- `OnSetLiveView` is exported from `SharedCallSheetPage.tsx` and accepts an optional `onBack` handler.
- The page heading changes to `On set` for Call Sheet and Shoot helper.
- Shoot helper description: `Run the shoot from the live Schedule, Shot List and crew details.`
- The standalone route `/share/call-sheet/loom-launch-film?day=day-1&live=1` remains available.

The latest browser check showed `Shoot helper` selected beneath `Call Sheet`, with the live helper content rendered inside the Shoot route while the full sidebar remained visible.

## Related work in the same checkout

Do not disturb these existing changes:

- Brief custom CTA selection and display refinements.
- Storyboard frame review controls for replacing or adding media, copying links, downloading, duplicating, and deleting.
- Storyboard comments shown as numbered pointers matched to pinned comments.
- Other project-wide changes visible in `git status`; do not assume the whole diff belongs to the Shoot stage.

At handover, the branch points to commit `b26733e` (`Shoot Tab - first setup updates`) with substantial uncommitted work layered on top.

## Verification

During the live dev session, do not run `npm run build`.

After each implementation change, use:

1. `npx tsc --noEmit`
2. `git diff --check`
3. An HTTP 200 check against the affected localhost route
4. A browser check for the requested behaviour and visual state

The latest Shoot helper work passed TypeScript, diff, route, and browser checks before this handover was written.

## Prompt for a fresh chat

Use this if the new chat does not automatically receive repository context:

> Continue work on the Brisk Shoot stage in the existing checkout and branch. Read `AGENTS.md` and `Docs/shoot-stage-handover.md` fully before doing anything. Preserve all current tracked and untracked changes. Do not make a product change until I give the next instruction.
