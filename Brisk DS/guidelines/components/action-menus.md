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

## Media menus

Tom approved simplified Upload and quiet folder actions on 19 October 2026. Upload has three single-line, text-only commands: From your computer, Google Drive and Dropbox. Use equal 44px minimum rows without descriptions, option icons or extra gaps. Retain the existing Upload trigger and source callbacks, including the empty-folder entry point.

Folder commands remain permission-driven: Rename, Move to top level and Delete require `canManage`; Copy folder link requires `canCopyLink`. Keep text-first rows. Place Delete last with `dividerAbove` for an 8px spacing break, not another border. `tone="danger"` is action-only and uses `--brisk-text-destructive`, mapped to the approved DS Red 60 palette token for readable text. Disabled styling still takes precedence. Ordinary field selections are unaffected.

Folder menus retain pointer/context access and support keyboard access, Escape and focus return. Use a stable All media fallback when an action removes its opener, and allow the existing rename input to take focus. Preserve folder and asset dragging and project/global visibility rules.

The existing mobile layout hides the folder-actions sidebar below 860px and provides a folder picker instead. This batch does not add a new mobile folder-management entry point.

The danger tone is visual only. It does not add a confirmation, Trash or Undo. Existing folder deletion is unchanged: folders with non-archived assets or subfolders cannot be deleted; otherwise the existing callback removes the folder immediately. Do not broaden that behaviour, change permissions or alter specialised file actions in this batch.
