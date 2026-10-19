# Labelled buttons

## Approved React standard

Use `Button` from `Brisk DS/src/app/components/Button.tsx` for ordinary labelled actions. Tom approved the existing DS reference on 17 October 2026: purple primary, white secondary, dark border, 8px corners and muted disabled controls. `Button.module.css` owns the appearance and interaction states. Colours, spacing, radius and shadows use shared Brisk tokens.

```tsx
import { Button } from "../../../Brisk DS/src/app/components/Button";

<Button size="S" variant="secondary" onClick={onCancel}>Cancel</Button>
<Button size="S" type="submit" disabled={!canSave}>Save changes</Button>
<Button size="S" variant="danger" onClick={onRemove}>Remove</Button>
```

## Variants

| Variant | Use |
| --- | --- |
| `primary` | Main action in the current section. Purple fill and white label. |
| `secondary` | Supporting action or explicit exit. White fill and dark label. |
| `tertiary` | Supporting action with the existing lavender fill. |
| `ghost` | Low-emphasis text action. Transparent border and surface at rest. |
| `danger` | Destructive action, including removal or access revocation. Red fill and white label. |

Keep the existing action hierarchy. Do not turn every action into a primary button or change a label or callback as part of a styling migration.

## Sizes and layout

- `S`: Label/S-semibold, padding/s vertically and padding/m horizontally. Use for dialog footers, toolbars and ordinary compact actions.
- `M`: Label/M-semibold, padding/m vertically and padding/l horizontally. Retain for established page-level and form actions.
- `L`: Label/L-semibold, padding/l vertically and padding/xl horizontally. Retain for existing large entry actions.
- Keep dialog actions small. Do not enlarge all controls to the same size.
- Labels can wrap to fit narrow screens; icons keep their intrinsic width. Let the surrounding action row wrap or stack where necessary.
- Consumer classes may retain layout hooks such as width, alignment or visibility. Do not add colour, radius, border, padding, typography or interaction overrides to consumers.
- Existing legacy classes may still style links and specialised controls. The scoped DS rules take precedence on `Button` so those classes cannot override its visual states. Broad page-level rules must exclude `[data-brisk-button]` when they suppress DS states.

## Interaction and native behaviour

- Rest: primary border, no shadow. Ghost retains a transparent border.
- Hover: lavender surface and dark label, with the medium hard shadow. Danger retains its red treatment. Ghost uses the lavender surface without the raised shadow.
- Keyboard focus: a visible focus-colour outline and hard shadow.
- Pressed: shadow flattens. Primary uses the darker brand fill and white label; supporting actions use the secondary pressed fill.
- Disabled: shared muted fill, border and text, with no hover shadow or movement. Prefer native `disabled`; retain existing `aria-disabled` semantics when already required by a consumer.
- The element remains a native `<button>`. `type` defaults to `button`; forms must explicitly use `type="submit"`.
- Native attributes, event handlers, form associations, `ref`, ARIA attributes and `data-*` attributes pass through. `tooltip` supplies `data-tooltip` and an accessible description; explicit `data-tooltip` and `aria-description` remain supported.
- Keep validation, permissions and async guards in the consumer. The DS component does not change application state, save data or decide whether an action is available.

## Scope boundaries

The labelled-button migration includes ordinary labelled upload-menu triggers and retry actions, while retaining the upload flow itself. Keep anchors and navigation links as links. Ordinary icon-only actions now have their own approved [IconButton](icon-buttons.md) pilot. Grouped sharing/review controls, tabs, segmented controls, calendars, time controls, selection choices, chips, media/player controls, drag handles, clickable cards and contextual menu rows retain their specialised patterns for separate reviews. A visible word alone does not make a specialised control an ordinary action button.
