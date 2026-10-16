# App simplicity, robustness and efficiency

## Status

Initial structural audit and local server baseline reported on 15 October 2026. The first three changes were implemented and checked on 16 October 2026. Broader restructuring and the full UI review remain pending.

The decisions below were clarified with Tom on 16 October 2026. Tom authorised the first three changes while retaining the current look and functionality.

## Goal

Make the Brisk prototype simple to understand, robust in use and easy to adjust and update. Reduce unnecessary code, duplicated logic and oversized page components while preserving the current appearance and all existing functionality. Use shared components consistently so a later approved UI change can be made in one clear place.

Speed is one outcome to measure, not the sole reason for this work. Local development compilation can account for some perceived slowness. Do not use localhost timings alone to justify a structural rewrite, a visual change or removing functionality. Fewer lines are useful only when they make the implementation clearer or remove unnecessary work.

This is a front-end-only prototype. Keep the existing stack, mock-data approach and working user flows. Do not add services, packages, a backend or production infrastructure.

## Starting point

The initial audit found a large codebase for a front-end prototype: approximately 104,000 TypeScript/TSX lines, 70,000 CSS lines and 61 routes. Some individual page files are unusually large, including Shoot, Brief and Script. These figures are only a starting snapshot; recount them when the audit begins and record the method and date. Source line counts do not measure runtime performance by themselves.

The observed multi-second navigation to Script is a symptom to investigate, not proof of a particular cause. Identify whether time is spent in route loading, client-side JavaScript, rendering, shared app-shell work, or the local development environment before choosing changes. Do not treat development bundle sizes as production measurements.

The 15 October baseline covered seven routes. First development-server requests took approximately 0.69-3.10 seconds; median repeat document responses took approximately 27-38 milliseconds. All sampled routes returned 200 and TypeScript passed. These measurements do not establish browser click-to-ready speed or production performance. Detailed browser profiling was blocked by a saved browser permission. Record that gap rather than assuming browser performance has been measured.

## First pass completed - 16 October 2026

### Shared controls and where future edits belong

| Pattern | Shared implementation | Current consumers |
| --- | --- | --- |
| Calendar | `src/components/form/BriskDatePicker.tsx` | Brief, Videos, freelancer time entry and Shoot |
| Date formatting/parsing | `src/lib/brief-dates.ts` | Calendar and Brief |
| Script AV editor | `src/components/script/ScriptAvEditor.tsx` | Script and Storyboard AV view |
| Script editor helpers | `src/components/script/script-editor-utils.ts` | Shared AV editor and Script page |
| Video player | `src/components/video-review/InlinePlayer.tsx` | Video Review, Masters and transcript players |
| Review comment thread | `src/components/video-review/ReviewCommentThread.tsx` | Video Review, Masters and Storyboard frame review |
| Review helpers | `src/components/video-review/review-utils.ts` | Player, comment thread and Video Review |

These are extractions of existing code. All 63 moved declarations were checked against the checkpoint and retain their original text apart from export visibility. Existing class names and all CSS files are unchanged. DS controls remain imported from `Brisk DS/`. Appearance and behaviour differences between these patterns and other controls are decisions for the later UI review.

### Optional panels

- `src/components/ai/BriskAiHeaderButton.tsx` contains the existing header button with its original markup and behaviour.
- `src/components/ai/DeferredBriskAiAssistant.tsx` loads the assistant on first opening. Its opening keyboard shortcut remains available before the implementation loads. After first opening, the assistant remains mounted to retain conversations and unsent input across closing and navigation.
- `src/components/chat/DeferredChatPage.tsx` defers Chat in the global drawer and the Customer Dashboard drawer. Existing drawer mount/unmount behaviour, props and conversation keys are retained. The dedicated Chat route still loads its page directly.
- The initial shared development JavaScript file no longer contains either panel implementation. It measured approximately 4.49 MB uncompressed after this pass, compared with approximately 6.04 MB in the audit baseline. These are development files with development overhead, not production bundle sizes or proof of a particular speed-up.

### Workspace saving

`PrototypeStateContext.tsx` now uses the existing immediate persistence path for its persistence effect too. A reference to the last successfully saved state prevents writing the same immutable state again. Storage keys, data format, initialisation/fixture guards and immediate saving before the state update are retained. No broader provider restructuring was performed.

### Verification and limits

- TypeScript passed after each change.
- The affected route HTTP checks passed during the extraction. All nine final route checks returned 200, covering Videos, Script, Brief, Shoot, Storyboard, Edit, Masters and both Client portal entry routes.
- Browser checks covered calendar selection and month navigation, Storyboard AV/visual-column toggling, an existing Storyboard comment, and transcript player mute/speed controls.
- Staff, Freelancer and Client previews were exercised. The original Client preview was restored. Client Chat was also checked at 390 x 844 and the temporary viewport override was removed.
- The narrow-screen Chat check exposed conversation content squeezed/clipped by the existing fixed-width sidebar. Chat's markup and styles are unchanged in this pass. This is a separate layout issue for the later UI review, not a successful mobile layout verification.
- Ask Brisk opened using its shortcut on a fresh page, and its unsent input survived close/reopen and in-app navigation. Chat history, close/reopen, navigation and Escape closing were checked. Before/after screenshots were captured for the calendar, Ask Brisk and Chat.
- Six isolated before/current persistence checks passed. They confirm two writes before and one write after for normal edits and creation, immediate saving, restoration of existing data, the initialisation guard and onboarding draft saving. The harness uses isolated browser-like storage and lives outside the repository.
- A browser project tag edit survived refresh. The temporary change was removed and the original tags were confirmed after another refresh.
- Of 59 relevant existing checks, 58 passed. The Studio Brand Kit palette check at `src/data/prototype-state.test.ts:216` failed identically against the untouched source checkpoint. It expects a different palette from the current onboarding data. This pass does not alter that data or resolve that separate discrepancy.
- Full media playback over external sample URLs and exhaustive interaction coverage were not established. Browser click-to-ready timing remains unmeasured because detailed profiling was blocked in the audit. No production build was run.

The original source checkpoint, focused patch, isolated check harness and screenshots for this pass are under `/private/tmp/brisk-efficiency-2026-10-16/`. Temporary files are supporting evidence; this ticket is the durable record. No packages or test infrastructure were added to the repository.

## Scope

1. Establish a reproducible baseline for route navigation and initial rendering, including the Script route and a small representative set of other routes.
2. Map the app's routes, large components, shared state/providers, imports and styling so refactor candidates are clear.
3. Identify code that is duplicated, unused, unnecessarily coupled, or expensive to load or render.
4. Recommend a small, prioritised sequence of refactors, then implement only changes that have a clear benefit and a safe way to check behaviour.
5. Re-measure after each meaningful change and report what improved, what did not, and any trade-offs.

## Agreed implementation order

Start with these focused changes, checking each separately:

1. Extract existing shared controls from large page modules so unrelated screens can import the controls directly. Preserve the control's existing markup, styling and behaviour. Reuse an existing DS component where it already meets the requirement.
2. Load optional panels, such as Chat and Ask Brisk, when needed. Preserve their draft, conversation and history behaviour across closing, reopening and navigation.
3. Remove the confirmed duplicate full-workspace save while preserving when edits become durable and how existing saved data is restored.

Prepare the reusable-component inventory alongside this work. Broader changes to state providers and large page structures should follow the settled UI. Handle CSS loading and consolidation cautiously because style order can change the appearance. A smaller stylesheet is not sufficient justification for visual differences.

## Reusable components and the later UI review

Use three clear levels:

- **DS foundations and controls:** reuse `Brisk DS/` and its tokens for buttons, inputs and other existing components. Follow the missing-component protocol instead of creating a parallel local design system.
- **Shared Brisk patterns:** reuse app-specific patterns such as date selection, Stage headers, comments, sharing and review controls where the appearance and behaviour should match.
- **Page-specific content:** keep details local where the behaviour or meaning differs. Do not force different workflows into a single component with a large collection of unrelated options.

For each repeated pattern, record its current implementations, routes, intended shared source, legitimate variants and any differences for Tom's later UI review. Distinguish code that already reuses one component from visually similar code copied into several files. Review both code reuse and how the result looks.

Extract matching existing behaviour first. Propose inconsistent appearance or behaviour for the later UI review rather than silently choosing a new design during extraction. Preserve intentional differences in role access, approval rules and content visibility.

## Safety plan for shared state and page restructuring

These changes carry more risk because a page can look correct while saved data or another role's journey has broken. The implementer must define and perform the checks; Tom should not have to discover regressions later or inspect technical details to judge safety.

1. Map the affected provider's consumers, dependencies, saved-data keys and required lifetime before moving it. Identify which data must survive navigation, closing a panel, refreshing, changing projects and changing workspaces.
2. Capture a recoverable checkpoint and representative saved-data examples before a focused change. Preserve unrelated work already in the checkout. Do not rename storage keys, reset fixtures or clear existing drafts to make a refactor pass.
3. Change one state boundary or responsibility at a time. Preserve the existing access and initialisation checks; do not remove a blank-page guard without establishing how role-specific content stays protected while state loads.
4. Exercise direct links, in-app navigation, browser back/forward and refresh using the relevant Studio Staff, Studio Freelancer and Client views. Check project and workspace isolation, draft recovery and the affected review/approval journey.
5. Compare before/after screenshots at matching viewport sizes, roles, data and UI states. Include mobile client views and relevant open menus, dialogs and disabled controls. Treat unexpected visual changes as regressions.
6. Run the safe type and HTTP checks in `AGENTS.md`, plus browser behaviour checks. A successful HTTP response and type check alone do not prove that an interaction or saved draft works.
7. Record the result and remaining gaps before continuing. If behaviour changes unexpectedly, correct or roll back that focused change before starting another.

For the later state restructuring, recommend focused automated regression checks for saved drafts, access and state across navigation. The existing rule against writing new tests without a request still applies. Do not claim these checks exist or have passed; record the proposed coverage and any manual-only gaps before that phase begins. Additional testing tools or packages require approval under `AGENTS.md`.

Risk cannot be removed completely. Shared-state changes should wait if a critical affected journey cannot be verified, rather than relying on Tom to find the problem during later use.

## Reports to produce

Save the audit report under `Docs/` and include:

- **Codebase map:** route and major component inventory, largest files, shared contexts/providers, and notable dependency or import hotspots.
- **Reuse inventory:** repeated controls and patterns, their current routes and implementations, DS equivalents, the proposed shared source, legitimate variants, and inconsistencies to address in the later UI review.
- **Performance baseline:** how measurements were collected; route-level navigation and render observations; key scripts/styles or render work contributing to delays; repeat runs and variability. Separate local development measurements from any production-like measurements available without changing the project setup.
- **Refactor findings:** each finding's evidence, benefit to simplicity, robustness, reuse or speed, risk to existing behaviour, estimated effort (small/medium/large), and recommended priority.
- **Functional and visual preservation checklist:** the visible interactions, saved-data behaviour and role-specific flows touched by proposed changes, with a practical verification path for each and matching screenshot references. Identify any behaviour that cannot be verified from the prototype.
- **Before/after summary and change guide:** measurements where relevant, duplication removed, which routes now share a component, where future edits should be made, regressions or inconclusive results and verification gaps. Do not claim a speed-up based only on fewer lines of code.

Do not create speculative reports or undertake a broad rewrite before the findings are reviewed. Keep the report concise and evidence-led.

## Guardrails

- Preserve existing user-facing features, routes, role previews, mock data and interactions unless a separate approved product decision removes them.
- Preserve the current appearance during code cleanup. Keep any approved UI redesign separate so a technical refactor does not quietly change the look.
- Make small, reversible changes in focused steps. Keep behaviour-preserving refactors separate from product or design changes.
- Do not delete files, change the stack, introduce packages or replace shared state patterns without specific justification and approval.
- Follow `AGENTS.md`, including its verification rules. During a live dev session, do not run `npm run build`; use the safe verification ladder in `AGENTS.md`.
- Do not write tests or set up test infrastructure unless requested. Use the documented manual checks and safe type/runtime checks for verification.
- Do not assume line count, component size or development bundle size alone demonstrates a performance problem.

## Acceptance criteria

1. The audit report records a dated, reproducible baseline and explains its limits.
2. The report identifies the highest-value, evidence-backed opportunities, ranked by user impact and risk.
3. A functional preservation checklist covers every affected route or interaction before each refactor is applied.
4. Refactors are delivered in small, reviewable changes and retain the existing prototype functionality.
5. Each completed change has before/after evidence; performance claims are based on comparable measurements.
6. The final report lists completed work, deferred recommendations, verification performed and any unresolved risks.
7. The reuse inventory identifies the shared implementation and intended variants for each pattern included in the work, and supplies a clear starting point for the later UI consistency review.
8. Matching screenshots and relevant behaviour checks support the claim that each refactor preserves the appearance and functionality. Unverified areas are reported explicitly.
9. The change guide explains where future edits belong, without introducing a second design system or an unnecessarily general component framework.

## Out of scope

- Building production backend, authentication, APIs, databases, file storage or real-time services.
- Redesigning screens or changing product behaviour as part of code cleanup.
- Migrating frameworks, replacing the app's state approach wholesale, adding dependencies or preparing a deployment.
