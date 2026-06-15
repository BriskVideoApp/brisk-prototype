# Brisk DS — Form Inputs

All form components accept standardized props: Label, Hint/description, State, and onChange. Insert as instances and set variant properties only.

---

## d-Input

**Variants:** Size (S / M / L) · State (Default / Filled / Hover / Focus / Typing / Error / Success / Disabled) · Label (bool) · Hint (bool) · Icon start (swap) · Icon end (swap)

- Default size is M
- Input hover fill → `--brand/secondary-hover`
- Input Typing glow → `--extra/purple-secondary`
- Disabled stroke → `--disabled/border`

---

## d-Textarea

Same states as `d-Input`. Use for free-form multi-line text: comments, notes, descriptions. Never use `d-Input` for multi-line content.

---

## d-Dropdown

**Variants:** Size · State (Default / Open / Filled / Hover / Focus / Error / Disabled)

Use for mutually exclusive selection from 6+ options. For ≤5 options, prefer `d-Radio list`.

---

## d-Multiselect

**Variants:** Size · State

Use when the user may select more than one option from a long list. For short lists, prefer `d-Checkbox list`.

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

---

## d-Radio · d-Radio list

**d-Radio variants:** State · Selected (bool) · Label (bool)

Use for mutually exclusive selection among few options (2–5). Use `d-Radio list` for a pre-built vertical list of radio buttons.

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
