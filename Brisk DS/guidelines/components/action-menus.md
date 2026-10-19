# Quiet action menus

Tom approved Quiet action menu on 19 October 2026. Extend the existing `BriskSelect` action-mode foundation, not ordinary selection-field behaviour. The pilot covers Chat call options and Videos column actions. Scheduling, custom date/time editors, general navigation and other specialised menus remain unchanged.

## Appearance and composition

- Use `mode="action"`, `value=""`, `clearable={false}` and an explicit accessible label. Actions are commands, not saved field selections: no ticks, selected-value fill, Done or Save.
- One white surface, primary border, medium radius and hard shadow. Rows are borderless with 44px minimum height, small DS labels and a separate blue keyboard outline. Retain useful existing `DsIcon` assets; do not invent icons for text-first commands.
- `actionTrigger(props)` adapts an existing trigger. Spread its ref, events and accessible attributes onto the actual native button. Specialised split controls retain their existing trigger presentation.
- `actionContext` supplies pointer coordinates, the actual opener element and an optional stable fallback focus element for commands that remove their opener. Keep the caller's existing actions, disabled rules and role restrictions.
- Options may set `disabled` in action mode. Disabled actions remain visible, cannot be invoked and are skipped by keyboard navigation. Ordinary selection fields retain their existing behaviour and density.

## Behaviour

Arrow keys browse enabled commands with wrapping; Home and End reach the first and last enabled command. Enter/Space activates, Escape closes and restores focus, and Tab exits in the opener's logical page order. Type-ahead finds enabled commands. Outside pointer/focus dismisses without stealing focus. Opening an action dialog must not lose its initial focus to the closing menu.

Context menus fit the visual viewport, flip above when appropriate, and update on scrolling/resizing. The portal stays within the nearest native dialog, otherwise the document body. A stable fallback handles actions such as Hide column that remove the original header. Actions and persistence remain the caller's responsibility.

Videos headers expose Shift+F10 and the Context Menu key alongside existing right-click access. Supply `keyboard: true` for a keyboard-opened context menu. Staff/Client headers preserve the Project and Actions anchors, and cannot move a data column past fixed Actions. The last optional column cannot be hidden. The Freelancer menu retains only Move left, Move right and Pin column; hiding remains unavailable.

Hide column is a reversible view action, not a destructive action.

## Script document actions

Tom approved the Script actions migration on 19 October 2026. `ScriptDocumentControls` opts into `actionMenu="quiet"` on the Script page only; Storyboard retains its existing menu until reviewed separately. Use the shared action-mode surface with the default width for longer labels and a quiet DS Button labelled Script actions. Rows are text-only, including Undo and Redo, with equal 44px minimum targets. Existing group dividers become whitespace; Delete version stays last, using the shared danger tone and an 8px spacing break above it.

Retain every supplied callback, action order, disabled condition and native explanation. `BriskSelectOption.title` passes the caller's explanation to the native option button without adding helper text or changing ordinary field styling. Keep the controlled open state so opening Comments or Versions closes the command menu. Use the shared keyboard navigation, outside dismissal, viewport fitting and focus return. Script copy/export scope, conditional Convert script to storyboard, approval guards, last-version safeguards and deletion confirmation remain unchanged. This migration does not restyle Comments, version pickers, the Script editor or Storyboard controls.

Tom subsequently approved the Script Comments trigger as a quiet text-only DS Button, matching Transcripts. Opt into `commentsStyle="quiet"` on Script only; preserve its accessible name, expanded/pressed state and existing toggle callback. Keep the comments panel, visibility rules and all comment tools unchanged. Storyboard retains its existing Comments trigger until reviewed separately.

## Media menus

Tom approved simplified Upload and quiet folder actions on 19 October 2026. Upload has three single-line, text-only commands: From your computer, Google Drive and Dropbox. Use equal 44px minimum rows without descriptions, option icons or extra gaps. Retain the existing Upload trigger and source callbacks, including the empty-folder entry point.

Folder commands remain permission-driven: Rename, Move to top level and Delete require `canManage`; Copy folder link requires `canCopyLink`. Keep text-first rows. Place Delete last with `dividerAbove` for an 8px spacing break, not another border. `tone="danger"` is action-only and uses `--brisk-text-destructive`, mapped to the approved DS Red 60 palette token for readable text. Disabled styling still takes precedence. Ordinary field selections are unaffected.

Folder menus retain pointer/context access and support keyboard access, Escape and focus return. Use a stable All media fallback when an action removes its opener, and allow the existing rename input to take focus. Preserve folder and asset dragging and project/global visibility rules.

The existing mobile layout hides the folder-actions sidebar below 860px and provides a folder picker instead. This batch does not add a new mobile folder-management entry point.

The danger tone is visual only. It does not add a confirmation, Trash or Undo. Existing folder deletion is unchanged: folders with non-archived assets or subfolders cannot be deleted; otherwise the existing callback removes the folder immediately. Do not broaden that behaviour, change permissions or alter specialised file actions in this batch.

## Transcript menus

Tom approved compact quiet text-only Transcript actions on 19 October 2026. The subsequent approved page layout moves the per-clip Copy text shortcut into this menu: Copy text, Rename, Download PDF, Hide transcript, then Delete. Keep equal 44px minimum rows, with the existing danger tone and 8px spacing break before Delete. No option icons or inner divider. Use the shared quiet `IconButton` overflow trigger, including its 44px target and end-aligned tooltip.

Use `actionMenuSize="compact"` for these short labels. At current tokens the preferred width is 180px, still bounded by the visual viewport and at least the trigger width. The default action-menu width and ordinary selection fields stay unchanged. Do not shrink row heights or labels to make a compact menu.

`actionFallbackFocus(trigger)` can capture a stable focus destination before Hide or Delete removes its own opener. Transcript actions use the collection's All filter; rename must still receive its existing input focus. Escape returns to the opener, Tab follows the existing page order, and the shared menu owns keyboard navigation and viewport positioning.

Preserve the existing callbacks and visibility rules. In this front-end prototype Delete removes a transcript from the current panel session, not its source media file; Hide retains the existing collection-restore behaviour. Do not add confirmations, change persistence, or modify the transcript editor, PDF export, playback or text-selection tools in this styling batch.

The approved Transcript page layout resolves the previously flagged mobile clip-grid issue. Clip identity and actions span the row above the player and text; below 760px the player and text stack, retaining pointer access to the overflow menu. Use the shared quiet All / Highlights only filters, borderless reading content with section hairlines, and inline speaker/timecode metadata. Remove the misleading transcript-line count from the page; retain language and full paragraph data in the existing export payload.

Keep action scopes distinct. The header's Transcript actions menu contains Copy all transcript text and Download transcripts PDF, using the existing visible-collection callbacks even while Highlights only is selected. Disable these commands when no clips are visible. Script editing, version controls and Script export commands remain on the Script page. Tom subsequently removed the Script version selector from Transcripts: these are the project's media transcripts, not a versioned Script document. Do not add a transcript version selector. Comments retains the existing visibility, shared draft storage and comment tools; this navigation change does not migrate comment data. Preserve playback, text selection, highlighting, sending to Script, URL navigation and all session-only Hide/Delete behaviour. Do not add persistence or change source-media deletion.

## Transcript navigation home

Tom approved Media as the primary home for project transcripts on 19 October 2026. Use the same collection at `/projects/[projectId]/stages/media?view=transcripts`, with Media selected in the project header. The project Media toolbar has a quiet DS Button labelled Transcripts with the project-wide count, alongside Upload and Download all. Upload remains the primary action. Folder/search filters do not change the transcript count. A zero count opens the existing empty state.

Tom subsequently removed Add from transcripts from the Script header. Media and source-file entry points open the collection and return to Media. Preserve existing `from=script` history links with their Back to script return, but do not reintroduce the removed shortcut. Keep native browser history and refresh behaviour, the existing selected Script destination and send-to-Script callbacks. Reuse the existing transcript/document state rather than duplicating the page or copying data. Media is still pinned outside the production flow; do not introduce a Transcript stage.

Ready source-file transcript actions use the same Media view with the asset's clip query and anchor. Older `/script?subtab=transcripts` links redirect there, retaining clip, query context and hash. Transcript PDF return links and prototype navigation also point to the Media collection. Script menus, file permissions, upload/download behaviour and specialised player/editor controls remain unchanged.

## Sending transcript text into Script

Tom approved explicit destination labels on 19 October 2026. Selection and bulk-highlight commands name the working version, for example Send to Script V2. A chooser is only appropriate when there are multiple genuinely editable destinations. The current Script model has one writable working version; older versions are read-only previews with Restore as new version. Do not treat every unapproved historical snapshot as an editable destination or introduce a chooser for the single working version.

Only confirm a successful append: Added to Script V2 with an Open script link targeting that version. Keep the confirmation available until dismissed or replaced by another action, and retain a phone-width layout and keyboard focus treatment. Repeated sends remain deduplicated per working version. A historical preview or the existing approved-edit guard must not produce a success confirmation. Approved work still requires the existing explicit unapproval flow; after proceeding, the send label follows the newly created editable version and the user can send again. Preserve the transcript source metadata and Script undo history.
