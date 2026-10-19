# Brisk DS — Form Inputs

All form components accept standardized props: Label, Hint/description, State, and onChange. Insert as instances and set variant properties only.

---

## d-Input

**Variants:** Size (S / M / L) · State (Default / Filled / Hover / Focus / Typing / Error / Success / Disabled) · Label (bool) · Hint (bool) · Icon start (swap) · Icon end (swap)

- Default size is M
- Input hover fill → `--brand/secondary-hover`
- Input Typing glow → `--extra/purple-secondary`
- Disabled stroke → `--disabled/border`

For the strengthened React implementation, native attributes/events, accessible hints/errors and the ordinary Client-form pilot, see [Single-line inputs](inputs.md). Preserve existing form behaviour when migrating; support for a native attribute does not authorise adding new validation.

---

## d-Textarea

Same states as `d-Input`. Use for free-form multi-line text: comments, notes, descriptions. Never use `d-Input` for multi-line content.

Tom authorised the missing React `Textarea` addition and Context-sized fields on 19 October 2026. Use the shared component for the approved ordinary-form pilot; retain native `rows`, limits and save behaviour. Height follows content needs, not one compulsory height for every field. See [React multi-line fields](textareas.md). Specialised editors and composers remain separate.

---

## d-Dropdown

**Variants:** Size · State (Default / Open / Filled / Hover / Focus / Error / Disabled)

Use for mutually exclusive selection from 6+ options. For ≤5 options, prefer `d-Radio list`.

For the approved React implementation, search threshold, menu geometry and keyboard behaviour, see [Dropdowns and selection pickers](dropdown.md).

---

## d-Multiselect

**Variants:** Size · State

Use when the user may select more than one option from a long list. For short lists, prefer `d-Checkbox list`.

Use `BriskSelect` with `multiple` in the prototype. Preserve immediate updates, limits and the existing Clear/Done actions. See [Dropdowns and selection pickers](dropdown.md).

---

## d-Date input

Use when the user types a date directly (known date). Pair with `d-Date picker` when visual calendar selection is needed.

---

## d-Date picker

**Variants:** Type (single / range)

- Type=single → select one date
- Type=range → select start and end dates

---

## d-Checkbox · d-Checkbox list

**d-Checkbox variants:** State (Default / Hover / Focus / Disabled) · Selection (Unchecked / Checked / Indeterminate) · Label (bool)

Use for multi-select among few options (2–5). Use `d-Checkbox list` for a pre-built vertical list of checkboxes.

The approved React `Checkbox` uses one 20px square and a minimum 44px clickable row. It supplies the approved check icon and mixed-state bar, including disabled selections, and owns hover, pressed and visible keyboard-focus styling through semantic tokens. Do not resize or restyle its square in consumer CSS.

Keep `onChange(checked)` as a boolean callback. Native input attributes, events and refs pass through; `indeterminate` sets both the native property and ARIA mixed state. Controlled `checked`, local `defaultChecked`, label-free ARIA labels and optional icon overrides are supported. Space uses the native action; Enter retains the existing DS shortcut. `label` accepts text or non-interactive descriptive content. Use `wrapperClassName` for row/card layout only and never nest this component inside another label. Preserve selection scope, persistence and existing save/cancel behaviour when migrating.

---

## d-Radio · d-Radio list

**d-Radio variants:** State · Selected (bool) · Label (bool)

Use for mutually exclusive selection among few options (2–5). Use `d-Radio list` for a pre-built vertical list of radio buttons.

Tom approved the proposed single-size React `Radio` foundation on 19 October 2026. The code was missing from the kit; this is the approved implementation, not a claim that the original radio guidance specified a size. It uses a 20px circle, a minimum 44px target, the checkbox family's semantic tokens, a selected dot that remains identifiable when disabled, and visible keyboard focus.

Import `Radio` from the DS and retain existing `fieldset`/`legend` groups and layout. Give mutually exclusive options the same native `name`; separate groups must use different names. Native input attributes, refs and event callbacks pass through unchanged, including `checked`, `defaultChecked`, `value`, `disabled`, `required`, form attributes and ARIA/data attributes. `onChange` receives the native event. The browser owns exclusivity, arrow keys, Space, tab order and form reset. Do not add a mixed state or an Enter shortcut.

`label` accepts text or non-interactive descriptive content. Use `wrapperClassName` for existing row/card layout and never nest Radio inside another label. The DS owns the circle and its states. Preserve names, values, callbacks, save/cancel and immediate-update behaviour. Specialised Brief choices, filters, voice/icon selection and sharing/review workflows are outside the initial migration.

---

## d-Toggle

**Variants:** Size (S / M / L) · Selected (bool) · Label (bool) · State

Use for binary on/off settings where the change takes effect immediately (no submit needed). Do not use Toggle as a selection control inside a form that requires submission — use Checkbox instead.

---

## d-Segmented control

**Variants:** Size

Use for switching between a small fixed set of mutually exclusive views or filters (2–4 options). Similar to tabs but for inline UI context, not page-level navigation.

---

## d-Slider · d-Slider with label

**d-Slider variants:** Type (Single / Range)

- Single → select one value on a continuous range
- Range → select min and max values

Use `d-Slider with label` when the numeric value should be shown alongside the handle.

---

## d-Drag and drop · d-Upload file

- `d-Upload file` → standard file input button pattern
- `d-Drag and drop` → drop zone for file upload

Never create a custom upload area — always use one of these two components.
