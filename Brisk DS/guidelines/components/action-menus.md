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

Do not add deletion, confirmation flows or new permissions as part of this pilot. Hide column is a reversible view action, not a destructive action.
