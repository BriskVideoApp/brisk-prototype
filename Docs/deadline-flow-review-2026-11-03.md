# Deadline flow review - 3 November 2026

The four reproduced defects are fixed. The Client's initial Brief date establishes final delivery on send or approval; Brisk can suggest a later date without changing it. Later Client changes are proposals. Studio Admin/Staff can change the date directly or propose a change, with the other side agreeing proposals. All deadline entry points now reuse one dialog. The desktop walkthrough below is now complete; Tom's visual sign-off remains separate.

## Live desktop walkthrough - 3 November 2026

Inspected the running app at 1440 x 1000. Started with Fluff ball, then created the clearly labelled mock project **Deadline review demo** for saved actions. Fluff ball retained its 1 August final date and 18 November pending proposal. The demo was completed and then archived after verification; its mock history remains available. Returned to Fluff ball in Studio Admin view.

| Flow | Observed result |
| --- | --- |
| Initial Client Brief | Client Owner chose 4 November and sent the Brief. Final delivery became 4 November; the 16 November suggestion did not replace it. |
| Later Brief edit | Clicking another calendar date opened the shared proposal dialog with the existing final date intact. Cancelling discarded the draft. |
| Bilateral proposals | Client Owner proposed 20 November and Studio Staff agreed. Studio Staff proposed 23 November and Client Teammate agreed. Each proposing side lacked Agree date; final delivery changed only on agreement. |
| Direct Studio save | Studio Admin saved 25 November over a pending 24 November proposal. History retained the initial date, both agreements, actor, reason and superseded proposal. Project Chat showed Changed, without claiming Client agreement. |
| Stage timing | Specific dates saved independently with Stage deadline saved and Close. Dates survived navigation/reload. The panel retained internal and Client dates; Clients had no internal date or edit action, while Freelancer access was read-only. |
| Production-risk sharing | An early final date created an internal warning. Client Owner saw neither its suggestion nor explanation until Studio Staff explicitly shared edited Client copy. Sharing retained the final date and excluded the internal stage-duration explanation. |
| Entry points | Brief, Videos deadline cell, project-panel stage action and Chat update opened the same dialog. Discuss date reached project Chat. The delivery URL rendered the same dialog and Close returned to Videos. |
| Completion and archive | With a pending proposal and shared warning, completion removed active warnings, stage deadlines and change/agreement controls. Archive remained read-only. Chat retained the reviewed Client copy and earlier proposal as resolved historical updates. |

Calendar placement and selection worked inside the dialog, including the lower stage editor in a long scrolling form. The header/footer remained visible while the body scrolled. Keyboard activation, calendar-only Escape, dialog Escape and opener-focus restoration were exercised. The native modal kept background controls unavailable; backwards tabbing at the boundary could move to browser chrome, then return to the dialog.

One in-scope focus defect was repaired: opening the Client proposal form focused the time input and immediately expanded its picker. `ProjectDeadlineDialog` now opts its existing `DeadlineDateTimePicker` date trigger into the DS dialog's documented `data-dialog-autofocus` mechanism, already used by `SearchDialog`. Studio radio focus and other date-picker consumers retain their defaults. No visual styles, new controls, icons or permission changes were added. Live recheck confirmed the Client date trigger receives focus with both pickers closed, including when opening from a later Brief date click.

Validation: `npx tsc --noEmit` and `git diff --check` passed. Browser network observations returned HTTP 200 for Fluff ball's Brief, the demo delivery document, and Videos/Chat route responses. Shell curl still returned HTTP 000 / exit 7. No production build or new automated tests were run; the earlier 56-check result below was not rerun during this walkthrough.

Evidence: [Client focus repair](../audits/deadlines-2026-11-03/client-deadline-focus.jpg), [completed deadline](../audits/deadlines-2026-11-03/completed-deadline.jpg), [Chat history](../audits/deadlines-2026-11-03/deadline-chat-history.jpg), [Fluff ball preserved](../audits/deadlines-2026-11-03/fluff-ball-preserved.jpg).

Limits and separate finding: role checks used the prototype's Test mode, not independent authenticated accounts. Initial-date establishment through approval, stale-write races, schedule recovery and the zero-working-day weekend boundary retain their earlier automated evidence rather than a new live reproduction. Mobile remains deferred. From the Cats portal in Client Test mode, Start Video lost the contextual Client, showed Jess Taylor / Loom and Start Video unavailable, and logged duplicate `/prototype/scenarios` navigation keys. The demo was therefore created through the Studio naming form before switching to Client for the deadline flow. This separate preview/navigation issue was not changed.

## Earlier automated verification

Ran the existing Vitest/JSDOM tooling against the real TurnaroundProvider, ProjectTimingProvider, DeadlineDialogProvider, access checks, StageDeadlinePanel and ProjectDeadlineDialog. Used isolated fixture state and storage, fixed dates, mocked surrounding app providers/router and native-dialog shims. No live project data was changed. The five access levels were checked through their actual compatibility-role mapping; this does not verify the live Test mode switcher or distinct account sessions.

Command: `npx vitest run src/components/project-timing/deadline-flow.test.tsx src/data/prototype-access.test.ts`.

Result after fixes: 56 passing checks, comprising 42 deadline-flow checks and 14 existing access checks. The original audit reproduced four failures before implementation. Their regression cases pass; the Brief case now follows the latest approval that later changes must use the deadline dialog. TypeScript and diff checks passed.

At the time of the automated review, browser control was unavailable and shell HTTP requests to the delivery and Videos routes returned connection failure (curl exit 7, HTTP 000). The later desktop walkthrough above supplies live interaction evidence; it does not constitute Tom's visual sign-off. No production build was run.

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
