# Queued UI refinements — 4 November 2026

## Review drawing control — discuss after deadlines

Tom requested a pencil control directly on the Edit review screen because the existing Draw on screen button is hard to find at the bottom of the comments composer. Also discuss a keyboard shortcut. Inspect existing player controls and shortcuts, propose the placement and key, and discuss with Tom before implementing. Preserve the existing drawing behaviour and role visibility.

Reference: `/projects/fluff-ball/stages/edit`, `button.composer-drawing-toggle` in the comments toolbar. This is queued for discussion, not implementation approval.

## Masters upload clarity — implemented locally

Tom confused Add asset with Upload in the empty deliverable row. He resumed this work on 4 November with "Now can you make the changes I discovered in Masters?" The empty row now has one Upload video button beside its name. Supporting files are offered after the video exists, labelled Add file under Supporting files.

Uploaded video rows show a preview beside the name, a quiet Uploaded status and version, with the filename on hover; the preview expands the existing player. Browser-readable new uploads generate a small saved frame. Older uploads with no accessible frame show the approved film-strip icon. The existing Download and re-cut actions remain in the action column; captions and thumbnails stay in Assets. Broken remote seed thumbnails now use a local mock asset, with a fallback icon for stale saved image links.

Reference: `/projects/fluff-ball/stages/masters`, Platform cutdown row.
