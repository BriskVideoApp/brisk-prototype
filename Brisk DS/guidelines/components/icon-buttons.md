# Icon-only buttons

## Approved React standard

Tom authorised the shared `IconButton` addition on 19 October 2026: quiet by default and context-sized. Import it from `Brisk DS/src/app/components/IconButton.tsx`. This follows the documented square/circle shapes and existing DS tokens; the size mapping below is the approved prototype proposal, not a claim about an original-kit size matrix.

```tsx
<IconButton aria-label="Close thread" onClick={onClose}>
  <DsIcon name="x-close-cross" />
</IconButton>
<IconButton size="M" aria-label="Manage project members" onClick={onManage}>
  <DsIcon name="users-three" />
</IconButton>
```

## Appearance and targets

- `quiet` is the default. Transparent surface and no visible border at rest, subtle lavender hover fill, blue keyboard-focus outline plus hard shadow, and flattened pressed shadow. Do not frame every icon action.
- `secondary` is available only where an action needs stronger emphasis. It uses the white surface, dark border and the size-appropriate hard hover shadow.
- `S` has a 32px visual surface and a 16px DS icon. Use for compact close/list actions.
- `M` has a 40px visual surface and a 20px DS icon. Use for ordinary header actions.
- Both use a real 44 x 44px native button target, in normal layout, with no overlapping pseudo-element hit areas. Allow surrounding actions to wrap or reflow. Never shrink the native target to recover space.
- `square` has the DS 8px radius. `circle` is reserved for avatar-style actions, not an alternative shape for ordinary toolbars.
- `className` is for layout/visibility hooks only. The scoped stylesheet owns visual states. Icons must still come through the approved `DsIcon`; do not supply interactive children.
- Disabled quiet controls stay unframed with muted icons. Disabled secondary controls use the existing muted button tokens. Neither has hover/focus shadows.

## Native and accessible behaviour

- A non-empty `aria-label` is required. It names the action; icon content is decorative. Preserve contextual names, for example which thread or client is affected.
- The label supplies the default existing app tooltip. `tooltip` or `data-tooltip` can supply shorter supplementary wording; explicit `aria-description` is preserved. Do not add a duplicate native `title`.
- Use `tooltipAlign="start"` or `"end"` at container edges and `tooltipPlacement="bottom"` inside clipped popover headers. These position the existing app tooltip; they do not introduce a separate tooltip system. A tooltip identical to the label does not add a duplicate accessible description.
- The outer native button receives refs and all native props/events, including `disabled`, `aria-expanded`, `aria-controls`, form associations and keyboard handlers. Its type defaults to `button`; use an explicit `submit` only when required.
- The component does not navigate, manage permissions, change application state, intercept keyboard events or create persistence. Prefer native `disabled`; retaining `aria-disabled` alone does not suppress a consumer's click handler.
- Native button activation supplies Enter and Space. Do not introduce custom shortcuts or change consumers' dismissal/focus-return rules.

## Pilot boundaries

Only ordinary Chat back, project/client settings, member management, thread close and shortcut-sheet close actions, plus the existing recent-notification and notification-demonstration popover close controls, use this pilot. Preserve the notification close control's existing responsive visibility and the mobile bell link.

Dark-rail navigation/search, message action toolbars, rich-text/composer controls, attachment/player tools, reactions, call controls, tabs, unread badges, notification navigation, grouped sharing/review controls and specialised editors remain unchanged. Do not add X buttons to editing dialogs, which retain their approved Cancel/Close/Done footers.
