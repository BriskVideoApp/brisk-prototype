# Shared desktop audit baseline

Audit only, 20 October 2026. Repository BriskVideoApp/brisk-prototype, branch codex/unified-brisk-prototype, inspected HEAD 3188bc4ca88d6ed2689c9b5bf8c47a7bfdd56e63. Initial tracked worktree clean. 61 page route patterns discovered in data/routes.json. Current runtime http://localhost:3000. Lead owns browser interactions and screenshots centrally. Reviewers must not open or manipulate browser state unless explicitly reassigned.

## Scope and authority

Read AGENTS.md in full, Brisk DS/guidelines/Guidelines.md, Docs/desktop-design-baseline.md, brisk-design-system.md, brisk-production-journey.md, brisk-saas-patterns.md, Docs/References/screen-inventory.md, relevant component guidance and Docs/ux-decision-log.md. Read applicable source rather than relying on prior audits. Latest explicit approvals > scoped approved DS controls/tokens > consistent guidance > verified live implementations > external heuristics. No implementation, commits, dependency changes, tests, production builds or stored-data mutations. Desktop 1440 and 1133. Three roles only: Studio Staff, Studio Freelancer, Customer. Preserve optional Storyboard, Animation, single Shoot with substages, pinned Media, Client preview and project naming. Normal copy Filmmaker/Client; access roles stay unchanged. British English, no em dashes.

## Shared inventory and coverage

data/routes.json is the starting route inventory, not proof of coverage. src components inventory is data/source-files.txt. The lead maintains the master coverage register. Reviewers should return discovered nested surfaces and live/unused classifications with source evidence. Finite state contract: default + available branches, menu/dialog/expanded states, applicable selected/disabled/read-only/restricted states, empty/no-results with existing data, keyboard/focus checks. Never claim full coverage from source or a default screenshot.

## Findings contract

Write reviewer output only in reviewers/<reviewer>.json and an optional .md. Candidate IDs A01/B01/C01, lead assigns final IDs. Fields: id, title, area, family, category, severity (S1 critical task/access risk; S2 substantial task/accessibility barrier; S3 local usability/consistency; S4 polish), impact, classification (Observed defect / Approved-standard violation / Heuristic judgement / Research hypothesis / Source-supported risk), confidence, roles, routes, states, observed, expected, authority, recommendation, rationale, alternatives, tradeoffs, rootCause, occurrences, sources (path:line), evidence (existing screenshot IDs or requested capture), verificationRemaining, reviewStatus (Needs decision initially).

Explicitly distinguish directly verified observations from source risks. Do not invent user research, approval or accessibility certification. Recommend the smallest coherent change and identify what could break. Preserve specialised contextual variants rather than flattening all controls. A widespread implementation is not independent approval. No approved screenshot exists is a valid explicit reference entry. Request concrete browser reproduction/captures from lead for high-impact candidates. Submit useful early checkpoints and save work as you go.

## Assignments

- A: visual and DS compliance across live component families. Produce a component baseline catalogue with scoped authority, canonical source, permitted variants and unresolved decisions; identify high-confidence deviations and request captures. Own no master files.
- B: usability and accessibility across core tasks and nested controls. Inspect semantics, keyboard/focus, accessible names, save boundaries, feedback and action scope. Challenge cosmetic recommendations lacking task impact. Own no master files.
- C: route/component coverage and permissions. Reconcile all routes, aliases, demos, direct-entry restrictions, role visibility, financial scopes and apparent/actual controls; enumerate nested workflows and source risks. Produce reviewers/route-classification.json and reviewers/nested-inventory.json. Own no master files.

Lead personally verifies highest-impact candidates and reconciles duplicates/contradictions. All recommendations remain unfixed and unapproved.

## Completion pass - 21 October 2026

Tom authorised a separate disposable demo session. After verified browser-storage isolation, existing scenarios may be loaded/reset and sample project/onboarding content created or progressed there. Normal working data and application code remain protected. No real invitations, messages, payments or destructive actions. UI quality, good design, refinement, sophistication and simplicity remain the emphasis. Prototype identity/persistence plumbing is excluded as a product finding. Lead controls all browser actions. New evidence uses F-series IDs, completion action records and explicit finite-state mapping. Preserve prior findings and evidence provenance.
