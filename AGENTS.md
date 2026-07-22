# AGENTS.md (master rules for Codex)

<aside>
📄

**File name:** `AGENTS.md` • Place at the **root** of the `brisk-prototype` repo. Codex and Claude Code both read this file first on every session. Keep it short - this is the rule book, not the spec.

</aside>

## How to use this file

- Export the markdown block below as `AGENTS.md` and drop it at the **root** of the repo (not in `/docs/`).
- Update it when house rules change. Don't add feature specs here - they live in `/docs/`.
- After any change, prompt Codex: *"Re-read AGENTS.md before continuing."*

Read Brisk DS/guidelines/Guidelines.md before using any component - it has the exact prefixes, token paths, and missing-asset protocol

## File content

```markdown
# AGENTS.md - Brisk Prototype

You are working on the Brisk prototype. Brisk is a SaaS for video production teams. This repo is a front-end-only reference. The developer will rebuild it for production. Read this file fully before doing anything else.

## Mission

Make screens that show how Brisk should look and behave. This is a reference, not a finished product.

## Scope

- **Front-end only.** No backend, no real database, no real auth.
- **Hard-coded mock data.** Just typed arrays in `src/data/`. No API layer.
- **No deployment.** `npm run dev` working locally is enough.
- **No tests.** Skip unless asked.

## Stack (kept deliberately small)

- **Next.js 15** (App Router)
- **Tailwind v4**
- **TypeScript** (strict, no `any`)
- **Brisk DS** - Yura's component library, sits in `Brisk DS/` at the repo root
- **npm** for installs

That is the whole stack. No TanStack Query, no Zustand, no MSW, no Storybook, no Clerk, no React Hook Form. Add nothing without asking Tom first.

## Where things live

```

brisk-prototype/

├── AGENTS.md                       ← this file

├── brisk-design-system.md          ← visual rules

├── brisk-production-journey.md     ← how filmmakers think

├── brisk-saas-patterns.md          ← roles, white-label, client portal

├── Brisk DS/                       ← Yura's components (do not rebuild)

├── Brisk Visuals/                  ← exported DS visual assets: flow icons, logos, illustrations, pictograms

├── docs/                           ← feature briefs (added as we go)

└── src/

	├── app/                        ← Next.js pages

	├── components/                 ← prototype-only components

	└── data/                       ← hard-coded mock data


## Skill file routing

Before generating any screen, load the right skill:

- **Anything visual** (colour, type, spacing, components, states) → `brisk-design-system.md`
- **Filmmaker language, stages, statuses, terminology** → `brisk-production-journey.md`
- **Roles, white-label, client portal, onboarding** → `brisk-saas-patterns.md`
- **Component code** → import from `Brisk DS/`. Do not rebuild components that already exist there.

If a question spans multiple skills (most do), load all relevant ones.

## Screen references

Before building or modifying any screen, read `Docs/References/screen-inventory.md` and consult the referenced screenshots.

- The `brisk/` folder defines **visual truth** - use these for styling, components, icons, layout patterns.
- The `current/` folder is **reference only** - it shows what the legacy ChopChop product does today, not what the new prototype should do. Many features will change in Brisk. Propose a redesigned, Brisk-styled version and confirm with Tom before writing code.
- Never directly clone a `current/` screen into code without operator approval of the redesign.

## Coding rules

- TypeScript strict. No `any`. No `@ts-ignore` without a comment explaining why.
- Server components by default; add `"use client"` only when needed.
- Keep components small and readable. The developer will read this code.
- Commit early and often. One commit per logical change.

## Verification rules (critical - read before every session)

**During a live dev session, DO NOT run `npm run build`.** A production build overwrites the `.next/` folder with production artefacts, which poisons the running dev server and causes stale-cache errors (`Cannot find module './[number].js'`, `__webpack_modules__[moduleId] is not a function`, `ENOENT: no such file or directory, .next/server/...`, 500 Internal Server Error). The operator then has to kill the server, delete `.next`, and restart from scratch.

Use this verification ladder instead:

1. **`npx tsc --noEmit`** - type-check without emitting files. Safe to run any time.
2. **Runtime check via the running dev server** - curl the affected route (`curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/[route]`) and confirm it returns 200, not 500. This catches hydration errors, client-only crashes, and stale-import bugs that `tsc` misses.
3. **Only run `npm run build` when the operator explicitly asks** for a production-build check before handing off to a developer. If a production check is unavoidable mid-session, warn the operator first and be ready to guide the operator through `rm -rf .next && npm run dev` afterwards.

`tsc` + a runtime HTTP check is the minimum bar for "work complete". `npm run build` passing is neither necessary nor sufficient - it doesn't catch hydration errors, and it breaks the dev server.

## Design system rules

- **Always import from `Brisk DS/`.** Do not rebuild Button, Input, Card, Modal, Table, etc.
- If a component is missing from `Brisk DS/`, ask before creating it locally. Don't silently invent.
- Use Brisk DS tokens (CSS variables) for every colour, spacing, radius, shadow, and text style. No magic numbers.
- Use Flow icons only (in `Brisk DS/`). Do not import icons from other libraries.
- Use exported visual assets from `Brisk Visuals/` for Flow icons, logos, illustrations, and pictograms.
- Flow icons live in `Brisk Visuals/Flow icons/`. Use these SVGs for production stages before falling back to placeholder or generic icons.
- Do not recreate Flow icons with generic Phosphor icons, letter tiles, or local approximations.
- Current production-stage UI uses the circular six-stage treatment: Brief, Script, Shoot, Media, Edit, Masters. Do not use Style Frames / Styleframes, Storyboard, square flow tiles, or letter tiles for current Brisk stage pickers or progress rows.

## Role-switcher requirement

The prototype must include a persistent role switcher in the top bar that lets the user view any screen as:
- Studio Staff
- Studio Freelancer
- Customer

V1 keeps the role model deliberately simple - three roles, no granular permissions. The original five-role split (Owner/Manager/Filmmaker on Studio side; Account Owner/Teammate on Customer side) is deferred to V2.

This is a prototype demo affordance only - in production, role is set by the user account.

## Mock data rules

- Mock data lives in `src/data/` as typed arrays. No fetch calls. Components import data directly.
- Seed realistic counts: dozens of projects, not 3 demo rows.
- Use real-sounding company names, project names, and customer names (no "Lorem Ipsum Co").
- One dataset, shared across all role views. The role switcher changes what is *visible*, not what *exists*.
- Current role is held in a simple React context. No Clerk, no auth library.

## Behaviour rules

- **Read AGENTS.md and the relevant skills before generating code.** If you didn't, stop and re-read.
- **Ask before destructive changes.** Deleting files, renaming top-level folders, changing the stack - confirm first.
- **Stop after the happy path.** Don't add edge cases, error states, or loading states unless asked.
- **One feature at a time.** Don't bundle multiple features in one session.
- **If a spec is ambiguous, ask.** Don't guess at product behaviour.
- **Surface trade-offs.** If two approaches are reasonable, name both and ask.

## Don't

- Don't add backend code, real auth, real APIs, or real databases.
- Don't add libraries to the stack without asking.
- Don't rebuild components that already exist in `Brisk DS/`.
- Don't write tests or set up CI/CD unless asked.
- Don't use the word "task" for units of work - use "Stage" (see Production Journey skill).
- Don't use Style Frames / Styleframes as an Active Videos stage. It is redundant for Brisk's current production flow.
- Don't design Quote, Proposal, or Concept flows - they're not in Brisk yet.
- Don't ship desktop-only client-facing flows - client surfaces must work on mobile.

## British English

All code comments, UI copy, labels, empty states, and documentation in British/Australian English: organise, colour, centre, finalise, analyse, favour. Never American spellings.

## Punctuation

Never em dashes (—). Use hyphens (-).

## When in doubt

Ask Tom. Better to pause for a clarifying question than to ship guesses.
```
