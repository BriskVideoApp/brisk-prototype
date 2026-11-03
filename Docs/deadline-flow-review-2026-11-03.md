# Deadline flow review - 3 November 2026

The four reproduced defects are fixed. The Client's initial Brief date establishes final delivery on send or approval; Brisk can suggest a later date without changing it. Later Client changes are proposals. Studio Admin/Staff can change the date directly or propose a change, with the other side agreeing proposals. All deadline entry points now reuse one dialog. Live desktop sign-off remains outstanding.

## Verification

Ran the existing Vitest/JSDOM tooling against the real TurnaroundProvider, ProjectTimingProvider, DeadlineDialogProvider, access checks, StageDeadlinePanel and ProjectDeadlineDialog. Used isolated fixture state and storage, fixed dates, mocked surrounding app providers/router and native-dialog shims. No live project data was changed. The five access levels were checked through their actual compatibility-role mapping; this does not verify the live Test mode switcher or distinct account sessions.

Command: `npx vitest run src/components/project-timing/deadline-flow.test.tsx src/data/prototype-access.test.ts`.

Result after fixes: 56 passing checks, comprising 42 deadline-flow checks and 14 existing access checks. The original audit reproduced four failures before implementation. Their regression cases pass; the Brief case now follows the latest approval that later changes must use the deadline dialog. TypeScript and diff checks passed.

The associated browser-control tool is unavailable. Shell HTTP requests to the delivery and Videos routes returned connection failure (curl exit 7, HTTP 000). No live desktop layout, focus trapping, calendar positioning or real navigation sign-off is claimed. No production build was run.

## Verified behaviour

- Existing stages do not acquire invented start times on app load. Explicit handover starts a timer; return from Client review starts a revision cycle.
- Specific dates persist on remount; reversed internal/Client dates are rejected. Automatic deadlines can be saved through the actual editor.
- Working-day arithmetic skips weekends, preserves local time across daylight saving and applies the approved video-length bands.
- Paused projects retain dates and reject stage edits. Completed projects have no active stage timers.
- The real calendar/form supports Studio proposal and Client agreement, plus Client counter-proposal and Studio agreement. The agreed date stays unchanged until the other side agrees. Neither side can agree its own proposal.
- Replaced proposals become superseded; stale agreement is rejected; agreement attribution and date history persist.
- Direct Studio saves record the actor, previous date and reason, supersede pending proposals and create a project Chat update. Stale provider writes and an already-open draft after an external update cannot overwrite the latest date.
- Production-risk messages stay internal until explicitly shared. Client-visible messages use the reviewed external copy. Reading a message does not approve a date.
- Shared and unshared production warnings clear when the forecast recovers. Shared copy remains in history. Repeated risk creates a new incident; paused projects are not falsely treated as recovered.
- The first sent/approved Brief sets the final deadline, even when Brisk suggests a later date. Repeating that submission does not duplicate active warnings. A later Brief submission cannot overwrite the deadline or clear its warning; an authorised deadline change resolves the superseded issue.
- Clients cannot propose a first date outside the Brief. Legacy approved Brief snapshots are adopted once when no final date exists, persist on remount and cannot overwrite an established date.
- Completion or archive clears active timing warnings. Completion records also suppress pending proposal alerts and block writes before the project status catches up.
- A future Saturday/Sunday deadline has a calendar-relative label. Due today is reserved for the same local date; weekday arithmetic is unchanged.
- Final delivery shows its current date or TBC, with pending and suggested dates kept separate. Exact times, timezone and reasons remain under Timing details. Historical dates and proposals remain available.
- Deadline links open the shared dialog in context and retain a delivery URL for copied links and new tabs. Review timing disappears for completed projects. Source review covers the entry-point wiring; live navigation remains unverified.

## Role results

| Access level | Edit stage dates | Direct final change | Propose final change | Agree proposal | Internal stage dates |
| --- | --- | --- | --- | --- | --- |
| Studio Admin | Yes | Yes | Yes | Client proposals | Visible |
| Studio Staff | Yes | Yes | Yes | Client proposals | Visible |
| Studio Freelancer | No | No | No | No | Visible within permitted project |
| Client Owner | No | No | After initial Brief date | Studio proposals | Excluded from markup |
| Client Teammate | No | No | After initial Brief date | Studio proposals | Excluded from markup |

The action/render matrix passed. Agreement in both directions and direct Studio saving were exercised through the actual dialog form. Outside-workspace and completed-project writes were rejected. Older saved proposals without proposer-side metadata continue to require Client agreement. Freelancer render checks use the existing scoped Test mode project preview; the separate access suite covers accepted-assignment restrictions.

## Repaired defects

1. **Stale Brief warning:** an authorised deadline correction resolves the superseded issue and preserves its historical dates. Later Brief submissions cannot bypass the established-date rule.
2. **Stale shared production warning:** schedule recovery now resolves the saved warning and persists that resolution. Reviewed Client copy remains unchanged.
3. **Completed-project warning:** completed/archived projects and completion records now resolve saved timing issues, hide review links and suppress pending proposal calls to action.
4. **Weekend label:** zero intervening working days no longer imply Due today. Future weekend dates display Due Sat or Due Sun.

## Usability changes

Tom approved consolidating the deadline screens using the existing date-editing dialog. ProjectDeadlineDialog reuses DS EditingDialog, existing date/time controls and StageDeadlinePanel. Final delivery comes first; Stage timing, Timing details and Delivery history are expandable. Stage saves remain independent, with confirmation and a Close action. Studio users choose Change date or Propose change; Clients only see proposal controls after the initial Brief date. Discuss date retains project Chat. The old Chat review's explicit production-risk sharing moves into Timing details with the same visibility boundaries. No claim of visual sign-off is made from the DOM checks.
