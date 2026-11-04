# Queued UI refinements — 4 November 2026

## Review drawing control — discuss after deadlines

Tom requested a pencil control directly on the Edit review screen because the existing Draw on screen button is hard to find at the bottom of the comments composer. Also discuss a keyboard shortcut. Inspect existing player controls and shortcuts, propose the placement and key, and discuss with Tom before implementing. Preserve the existing drawing behaviour and role visibility.

Reference: `/projects/fluff-ball/stages/edit`, `button.composer-drawing-toggle` in the comments toolbar. This is queued for discussion, not implementation approval.

## Masters upload clarity — implemented locally

Tom confused Add asset with Upload in the empty deliverable row. He resumed this work on 4 November with "Now can you make the changes I discovered in Masters?" The empty row now has one Upload video button beside its name. Supporting files are offered after the video exists, labelled Add file under Supporting files.

Uploaded video rows show a preview beside the name, a quiet Uploaded status and version, with the filename on hover; the preview expands the existing player. Browser-readable new uploads generate a small saved frame. Older uploads with no accessible frame show the approved film-strip icon. The existing Download and re-cut actions remain in the action column; captions and thumbnails stay in Assets. Broken remote seed thumbnails now use a local mock asset, with a fallback icon for stale saved image links.

Reference: `/projects/fluff-ball/stages/masters`, Platform cutdown row.


## Shoot compact call sheet and free shot order - implemented locally

Tom approved replacing Simple mode's checklist-only screen with a compact call sheet, then requested all shots remain available regardless of earlier completion. He authorised finishing this work autonomously while away.

- Simple mode reuses `SharedCallSheetPage` for saved date, general call, wrap, primary location/address/directions and the day's assigned People above the existing checklist. Missing details are clearly unset, with add/edit actions; no missing time is silently invented.
- `ShootDayEditorFields` is shared by Planning's inline editor and Simple mode's DS EditingDialog. Date/time/location editing, PDF, location editing and Add person reuse existing controls.
- Notes read as content until Add/Edit notes is selected. Empty Documents and the duplicate primary location section are hidden. Optional sections collapse; compact emergency information only uses confirmed saved data.
- All coverage groups open by default. Progress no longer collapses groups or hides captured shots. Manual collapse remains available; capture checkboxes work in any order and remain reversible.

Desktop verification covered Simple and full Call Sheet, unchanged Save gating, typed time and pointer Save, notes Add/Done, existing location editor and later-shot availability with an earlier shot incomplete. The apparent pointer-save problem was the open time picker overlapping Save: completing the picker closes it and Save works. Blur/Enter also close the picker appropriately. The user's original 07:00-19:00 times, 9 shots and 7 captured shots were preserved. Simple mode restored after checking Planned mode.

## Planning Shot List layout, readiness and footer - implemented locally

Tom approved the Planning simplification and explicitly confirmed that Mark shot list ready means accepting all remaining suggested shots and groups. Overall Approve Shoot stays separate.

- Replace the squeezed shot type/size/camera columns with a readable summary under each shot and Details opening the existing compact shot editor. Keep inline shot text, notes, reference, comments, reordering and overflow actions.
- Remove repeated Accept, Accept group and Accept all from the Shot List. Suggested badges remain until editing or confirming readiness.
- The confirmation says: “This will accept the remaining Brisk suggestions and mark the shot list ready.” Missing locations stay a separate warning. Confirm updates follows the same acceptance behaviour.
- Save readiness against the accepted list fingerprint, so accepting suggestions does not immediately invalidate readiness. Interview suggestions remain untouched.
- Remove the duplicate View Visual References footer shortcut, already available in the sidebar. Readiness is the primary footer action; stage Send and Approve use existing secondary variants on this section. Header Share continues to handle links and access; explicit review handover remains in the footer.

Verification: an unsaved empty-preview fixture generated 8 suggested shots across 4 groups. Confirming readiness removed all suggestion badges, showed Shot List ready and did not produce Updates to confirm. Its missing-location warning remained visible before confirmation and overall Shoot approval remained available separately. Restored readiness after the fixture check and discarded the fixture. Desktop inspected at 1135px and 1280px; no page overflow at the narrower width. Shared editor and full Planned day fields checked. Final TypeScript, diff and affected-route checks recorded in the desktop baseline.

No tests or production build, staging, commit, push or deployment. The separate review-pencil request remains queued for discussion.
