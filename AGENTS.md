# AGENTS.md - Brisk Prototype

You are working on the Brisk prototype. Brisk is a SaaS for video production teams. This repo is a front-end-only reference. The developer will rebuild it for production. Read this file fully before doing anything else.

Read `Brisk DS/guidelines/Guidelines.md` before using any component; it defines the exact prefixes, token paths and missing-asset protocol.

## Working repository and approved rules

- Work in `BriskVideoApp/brisk-prototype` on `codex/unified-brisk-prototype`. Do not switch to or update `main`, or create another branch, unless Tom explicitly asks.
- Latest explicit user-approved decisions take precedence over older planning documents and screenshots. Existing code is evidence of current behaviour, not proof that a conflicting product decision was approved.
- The prototype exposes **Studio Admin**, **Studio Staff**, **Studio Freelancer**, **Client Owner** and **Client Teammate** access levels, defined in `src/data/prototype-permissions.ts`. Existing `Studio Staff`, `Studio Freelancer` and `Customer` strings remain compatibility groups. Job titles do not grant access. See the 30 October permission scope in `Docs/desktop-design-baseline.md`.
- Never use legacy assets from `Brisk Visuals/Flow icons/`. Use the current `StageChip` stage presentation and approved assets exposed through `DsIcon` under `/public/brisk-icons/`.
- Keep the prototype front-end only with mock data. Product plans for authentication, Studio isolation or integrations do not authorise backend work.
- Preserve this branch's newer production flows, optional Storyboard, Animation, pinned Media, Client preview and project naming behaviour. Do not replace them with older fixed-stage or five-role guidance from `main` or Notion. Resolve material conflicts before changing the affected behaviour.
- The `brisk-*.md` files are reusable project guidance, not installed Codex `SKILL.md` packages.

## Ticket preflight

When asked to implement a ticket from any source:

1. Read the full ticket from its supplied source, using an available connector when needed. If inaccessible, ask the user to paste the full ticket before implementation.
2. Read relevant Brisk instructions, screen references and existing prototype/code. Look up available facts rather than asking the user to repeat them.
3. Treat the ticket as the working specification. Identify only material unanswered product decisions, conflicts or assumptions whose consequences could change the experience. Do not repeat questions already answered by the ticket or code, or reopen settled decisions without a material conflict.
4. If blockers remain, ask a short, grouped set of independent questions with a sensible recommendation and brief reason for each. Ask a short follow-up round only when an answer reveals another material dependency. Do not guess consequential product choices or implement blocked behaviour before it is resolved.
5. If there are no blockers, proceed with one-ticket-at-a-time implementation. The user does not need to repeat this preflight in every prompt.

Do not automatically run Matt Pocock's full Grill Me, To Spec or To Tickets flow, or generate a redundant specification. Use deeper discovery or ticket splitting only when requested or when the scope requires it; resolve the necessary scope decision first.

## Mission

Make screens that show how Brisk should look and behave. This is a reference, not a finished product.

## Scope

- **Front-end only.** No backend, no real database, no real auth.
- **Hard-coded mock data.** Just typed arrays in `src/data/`. No API layer.
- **No deployment.** `npm run dev` working locally is enough.
- **No tests.** Skip unless asked.

## Current design sequence

Tom approved desktop-first sequencing on 20 October 2026. Get the full desktop UI fixed and signed off before starting the mobile design pass. This applies to both Studio and Client-facing screens.

- Default reviews, recommendations, implementation and browser verification to desktop.
- Defer mobile layouts, mobile-only fixes and routine mobile verification until the full design is signed off, unless Tom explicitly requests mobile work for a particular task.
- Keep mobile findings for the later pass; do not make them the next active UI work or a blocker to desktop sign-off.
- Preserve existing responsive code and functionality. Deferring mobile work does not authorise removing it or deliberately breaking it.
- This sequencing supersedes older guidance requiring mobile-first design, parallel desktop/mobile work or mobile verification in every batch.

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

├── Brisk Visuals/                  ← exported visual references; archived Flow icons must not be used

├── docs/                           ← feature briefs (added as we go)

└── src/

	├── app/                        ← Next.js pages

	├── components/                 ← prototype-only components

	└── data/                       ← hard-coded mock data

```

## Project guidance routing

Before generating any screen, read the relevant project guidance:

- **Current desktop approval baseline and superseded patterns** → `Docs/desktop-design-baseline.md` (read alongside, not instead of, the DS component guidance).
- **Anything visual** (colour, type, spacing, components, states) → `brisk-design-system.md`
- **Filmmaker language, stages, statuses, terminology** → `brisk-production-journey.md`
- **Roles, white-label, client portal, onboarding** → `brisk-saas-patterns.md`
- **Component code** → import from `Brisk DS/`. Do not rebuild components that already exist there.

If a question spans multiple topics (most do), read all relevant guidance files.

## Design contract for future features

Preserve the approved design. A feature request is not permission to redesign its surrounding screens or repair unrelated historical mismatches.

Before changing UI:
1. Read the current [desktop baseline](Docs/desktop-design-baseline.md), [visual guidance](brisk-design-system.md) and relevant component-specific guide in `Brisk DS/guidelines/components/`.
2. Identify the actual reusable React export or approved app composition and inspect an existing consumer. The Figma `d-` catalogue describes design instances, not importable React components. Do not recreate a primitive, copy a consumer into a new fork or invent an export because a catalogue entry exists.
3. Reuse that component's variants and interaction states. Consumer CSS may arrange it, but must not override its colour, typography, padding, border, radius, shadow or focus treatment unless a scoped approval explicitly permits it.
4. Verify every new icon name in `src/components/video-review/DsIcon.tsx` and its mapped asset under `public/brisk-icons/`. Use `StageChip` for production-stage presentation. Do not install an icon library, inline paths, draw substitutes or revive the legacy `FlowIcon` export.
5. Check that referenced tokens and text-style classes exist in the running app. Do not guess a name, silently add a fallback or redefine global tokens in a feature stylesheet. Missing definitions and genuinely new patterns follow the DS missing-asset protocol; pause the affected part and ask Tom before inventing a solution.

The [baseline](Docs/desktop-design-baseline.md) is the current approval register. The [implementation register](audits/desktop-2026-10-20/data/implementation-register.json) tracks later audit work. Historical findings and screenshots do not override later approvals. In particular, preserve the approved quiet Media sort, tinted Brand Kit category cards and pink pulsing unread badges within their documented scope.

Before handoff, review the changed code for component duplication, visual overrides, undefined tokens and unapproved icon sources, then follow the existing verification rules. Distinguish ordinary controls from player overlays, artwork/swatches, rich editors and other specialised treatments. Reuse an approved contextual pattern without applying generic white-panel, border or shadow rules to it. An exception must name its scope and approval; a whole media stylesheet is not automatically exempt.

When Tom approves a new reusable pattern or changes an existing one, update the baseline with the date, scope, source and reference evidence. Update the relevant component guide only when its reusable contract changes. Keep design approval, implementation, browser verification and visual sign-off distinct. Do not create another competing DS document or claim Figma parity without evidence.

## Screen references

Before building or modifying any screen, read `Docs/References/screen-inventory.md` and consult the referenced screenshots.

- The `brisk/` folder defines **visual truth** - use these for styling, components, icons, layout patterns.
- The `current/` folder is **reference only** - it shows what the legacy ChopChop product does today, not what the new prototype should do. Many features will change in Brisk. Propose a redesigned, Brisk-styled version and confirm with Tom before writing code.
- Never directly clone a `current/` screen into code without operator approval of the redesign.

## Coding rules

- TypeScript strict. No `any`. No `@ts-ignore` without a comment explaining why.
- Server components by default; add `"use client"` only when needed.
- Keep components small and readable. The developer will read this code.
- Discuss staging and commits with Tom first. When authorised, keep one commit per logical change and exclude unrelated work.

## Verification rules (critical - read before every session)

**During a live dev session, DO NOT run `npm run build`.** A production build overwrites the `.next/` folder with production artefacts, which poisons the running dev server and causes stale-cache errors (`Cannot find module './[number].js'`, `__webpack_modules__[moduleId] is not a function`, `ENOENT: no such file or directory, .next/server/...`, 500 Internal Server Error). The operator then has to kill the server, delete `.next`, and restart from scratch.

Use this verification ladder instead:

1. **`npx tsc --noEmit`** - type-check without emitting files. Safe to run any time.
2. **Runtime check via the running dev server** - curl the affected route (`curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/[route]`) and confirm it returns 200, not 500. This catches hydration errors, client-only crashes, and stale-import bugs that `tsc` misses.
3. **Only run `npm run build` when the operator explicitly asks** for a production-build check before handing off to a developer. If a production check is unavoidable mid-session, warn the operator first and be ready to guide the operator through `rm -rf .next && npm run dev` afterwards.

`tsc` + a runtime HTTP check is the minimum bar for "work complete". `npm run build` passing is neither necessary nor sufficient - it doesn't catch hydration errors, and it breaks the dev server.

## Final review and handoff

Before marking a ticket complete:

1. Review the diff against the full ticket and acceptance criteria, then against Brisk's role, visibility, visual, terminology and scope rules.
2. For application changes, run the approved verification above and inspect the affected behaviour in the running prototype on desktop. An HTTP 200 alone does not verify browser interactions or role visibility. Mobile verification is deferred under Current design sequence unless explicitly requested. Do not add tests or run a production build unless requested.
3. Fix in-scope issues found during review. Report unresolved gaps, consequential decisions and any checks that could not be run; do not claim unverified behaviour works.
4. For instruction-only or documentation-only changes, verify the saved text, links and diff instead of running application checks. Confirm application code and assets are unchanged.

## Design system rules

- **Reuse actual React exports from `Brisk DS/src/app/components/`.** Do not rebuild available primitives. Use `EditingDialog` and `ConfirmationDialog` for their approved purposes; `BriskSelect` also has an app compatibility re-export. Figma Card, Table and Drawer entries do not establish React exports. Reuse documented app compositions where approved; ask before creating a missing primitive.
- If a component is missing from `Brisk DS/`, ask before creating it locally. Don't silently invent.
- Use the existing Brisk runtime tokens and named text styles; see the runtime map in `Brisk DS/guidelines/Guidelines.md`. Preserve exact dimensions already specified by an approved component or pattern, including documented non-token geometry. Do not round values, introduce arbitrary styling or use this exception to bypass tokens.
- Use existing `StageChip` stage icons and `DsIcon` general UI icons, with approved assets under `/public/brisk-icons/`. Do not import icons from other libraries.
- Use approved visual assets for logos, illustrations and pictograms. Never import archived stage icons from `Brisk Visuals/Flow icons/`.
- If an approved icon is missing, follow the missing-asset protocol and use text until it is supplied. Do not substitute generic icons, letter tiles or local approximations.
- Current production-flow UI uses the circular stage treatment. The adaptable flow supports Brief, Script, Shoot, Storyboard, Edit or Animation, and Masters. Media stays pinned outside the reorderable flow because it is available throughout a project.
- Show Shoot once in the project flow. Pre-production and On Set are substages inside Shoot. Do not add Shoot Plan or On Set as separate project-flow stages.
- Storyboard is an optional project-flow stage after Script. Animation replaces Edit as the user-facing stage name for animation projects while retaining the same version, review and approval behaviour.
- Do not use Style Frames / Styleframes, square flow tiles, or letter tiles for current Brisk stage pickers or progress rows.

## Role-switcher requirement

The prototype must include a persistent Test mode switcher for:
- Studio Admin
- Studio Staff
- Studio Freelancer
- Client Owner
- Client Teammate

Tom requested this split on 30 October 2026 and supplied the [Brisk User Roles ticket](https://app.notion.com/p/35dabf184ca980abaebee740b3abb5bf). Staff retain all Studio projects. Narrower Staff project visibility and new stage permission controls remain deferred to V2. Preserve existing production actions and Client-only visibility boundaries. This supersedes the earlier three-view restriction, not the front-end-only scope. The unrelated historical five-role/job-title scheme remains superseded.

Tom approved the hybrid desktop navigation on 20 October 2026. Put the role switcher inside the quiet Test mode control at the bottom of the left sidebar, below the account menu and Studio settings where permitted. Preserve the existing top-bar control on narrow screens and clean-entry views while the mobile design pass is deferred.

This is a prototype demo affordance only - in production, role is set by the user account.

## User-facing terminology

- **Filmmaker** means anyone working for or with a Studio, including Studio Admins, Studio Staff and Studio Freelancers.
- **Client** means someone on the Customer side.
- Use **Filmmaker** and **Client** in normal interface copy.
- The underlying compatibility groups remain **Studio Staff**, **Studio Freelancer** and **Customer**; the five access levels control the Admin/Staff and Owner/Teammate distinctions.
- Show an exact access role only when the distinction affects access, invitations, project visibility, rates, costs, invoices, time tracking or responsibilities.
- **Filmmaker** is a shared professional identity, not an access role.
- Do not rename code types, stored values or permission identifiers purely for this language change.

## Mock data rules

- Mock data lives in `src/data/` as typed arrays. No fetch calls. Components import data directly.
- Seed realistic counts: dozens of projects, not 3 demo rows.
- Use real-sounding company names, project names, and customer names (no "Lorem Ipsum Co").
- One dataset, shared across all role views. The role switcher changes what is *visible*, not what *exists*.
- Current role is held in a simple React context. No Clerk, no auth library.

## Behaviour rules

- **Read AGENTS.md and relevant Brisk guidance before generating code.** If you didn't, stop and re-read.
- **Ask before destructive changes.** Deleting files, renaming top-level folders, changing the stack - confirm first.
- **Keep implementation to the requested happy path.** Include applicable design-system interaction and empty states, but do not invent unrelated error, loading or edge-case flows. Still surface consequential product risks during preflight.
- **One feature at a time.** Don't bundle multiple features in one session.
- **Resolve material product ambiguity through the ticket preflight.** Do not guess consequential behaviour.
- **Surface material trade-offs with recommendations.** Routine implementation choices within the ticket and existing patterns do not need a new approval round.

## Don't

- Don't add backend code, real auth, real APIs, or real databases.
- Don't add libraries to the stack without asking.
- Don't rebuild components that already exist in `Brisk DS/`.
- Don't write tests or set up CI/CD unless asked.
- Use "Stage" for units of work inside a video's production journey (see Production Journey guidance). Development tickets and the existing Today to-do terminology are not additional production stages.
- Don't use Style Frames / Styleframes as an Active Videos stage. It is redundant for Brisk's current production flow.
- Don't design Quote, Proposal, or Concept flows - they're not in Brisk yet.
- Don't expand desktop UI work into a mobile pass before the full design is signed off, unless Tom explicitly requests it. Preserve existing responsive behaviour.

## British English

All code comments, UI copy, labels, empty states, and documentation in British/Australian English: organise, colour, centre, finalise, analyse, favour. Never American spellings.

## Punctuation

Never em dashes (—). Use hyphens (-).

## When in doubt

Ask Tom. Better to pause for a clarifying question than to ship guesses.
