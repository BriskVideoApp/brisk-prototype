# Anchored settings popover

Tom approved the compact checklist popover on 19 October 2026 after comparing it with the existing Columns menu and an editing dialog. This is an authorised React DS addition, not a claim that Yura supplied a new component or icon.

**Source:** `Brisk DS/src/app/components/Popover.tsx` and `Popover.module.css`.

## Use

Use for a short contextual settings checklist. Keep dropdown fields in `BriskSelect`, centred forms in `EditingDialog`, and specialised controls unchanged. The pilot is the Videos Columns picker only.

- One white elevated surface, primary dark border, medium radius and hard shadow. No inner row borders or decorative dividers.
- Compact title and optional description above a scrollable body. The footer stays visible.
- Compose the existing DS Checkbox and Button; never substitute text-character ticks. The Checkbox uses the approved `DsIcon` check asset, its 20px square and minimum 44px native row target.
- The controlled `open` / `onOpenChange` props retain the caller's state. `trigger` receives the button ref, events and accessible attributes; spread these onto the existing DS Button.
- `footer(close)` supplies a focus-restoring close callback. Immediate settings use Done, not Save/Cancel. Keep Reset only when the existing setting provides it.
- The Columns pilot preserves role-specific options, saved choices, order, fixed Project/Actions columns and the last optional column safeguard. Reset retains its original ordering/visibility reset and closes the picker. No storage keys or table logic change.

## Keyboard and placement

The trigger opens a labelled non-modal dialog, not a menu/listbox with decorative ticks. Opening focuses the first enabled field. Native Space and the Checkbox's existing Enter shortcut toggle choices. Tab visits each field and footer action; leaving the boundary returns to the opener's logical page order without trapping focus. Escape and Done close and return focus. Outside pointer/focus dismisses without stealing focus.

The portal mounts inside the nearest native dialog, otherwise the document body. It aligns to the trigger's trailing edge, shrinks to the visual viewport and opens above when that offers more room. Constrained lists scroll while header/footer remain visible. Resize, scroll and visual viewport changes update its position.

No other menus or specialised pickers are migrated by this addition.
