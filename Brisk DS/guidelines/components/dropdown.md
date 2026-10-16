# Dropdowns and selection pickers

Approved by Tom on 17 October 2026. Use the shared `BriskSelect` for dropdown fields and multi-selection pickers throughout Brisk.

**Source:** `Brisk DS/src/app/components/Select.tsx` and `Select.css`.
**Compatibility import:** `src/components/form/BriskSelect.tsx` re-exports the DS component. It contains no separate implementation.

## Appearance

- White menu surface, one primary dark border and medium hard shadow.
- Menu radius `m` (12px), field and option radius `s` (8px), menu inset `xs` (4px).
- Search is an integrated, borderless row with a search icon. Separate it from the options using spacing, without another enclosing border or divider.
- Small DS label typography. Options have a minimum 40px height and wrap long text. Keep meaningful descriptions, logos and format previews when needed.
- Selected options use the secondary brand fill, primary brand text and a checkmark. The active keyboard option has a separate focus outline; browsing does not commit a single selection.
- Fields have no shadow at rest. Hover adds the hard shadow, focus adds the focus ring, and pressed flattens the shadow. Retain disabled and invalid states.
- A contextual trigger can retain an existing status, source, chip or Brand Kit presentation. It must use this component's menu, positioning and keyboard handling.

## Choosing the variant

- Single selection: default. Select an option to commit and close.
- Multiple selection: `multiple`. Each click changes that option immediately; Done closes. Keep the caller's existing selection limits and special rules.
- Search appears automatically for more than 15 options. Set `searchable` explicitly when finding a name, Client, skill or source warrants it. Do not require search for short, easily scanned lists.
- For new forms with two to five single choices, prefer radio buttons. For short multiple-choice lists, prefer checkboxes. Existing compact controls are not expanded into radio lists as part of this rollout.
- Person lists should put Me first when applicable, then sort the other names alphabetically. The caller owns meaningful option order; never alphabetise production stages, priorities or statuses automatically.
- Add role uses `mode="action"`: the same surface with menu/menuitem semantics, without presenting an action as a saved selection. A custom-role form remains in the footer.

## Usage

```tsx
import { BriskSelect } from "@/components/form/BriskSelect";

<BriskSelect
  ariaLabel="Choose whose work to view"
  clearable={false}
  options={peopleOptions}
  placeholder="Choose a person"
  value={personId}
  onChange={setPersonId}
/>
```

Keep IDs, stored values, callbacks and validation unchanged. Empty options such as All Clients and No location retain their original empty value. `required` communicates the field requirement; the caller retains its existing form validation. `name` provides hidden form values when needed.

Use `description`, `content`, `icon`, `logoSrc`, `group` and `triggerLabel` for richer choices. Supply a plain text `label` for search and an accessible name. `searchText` adds search terms such as a Client's website. `triggerContent` may contain display content, never another interactive control.

`footerAction` keeps actions such as Add source, Create location and All days. `keepOpen` preserves flows which add an item without dismissing the picker. `footer` supports an existing inline creation form, including duplicate-Client warnings and custom roles. Keep these actions outside the listbox.

## Keyboard and accessibility

- Plain picker: a labelled combobox controls a listbox. Searchable picker: the search input is the combobox; its options are in a separate listbox. The active option is communicated with `aria-activedescendant`.
- Arrow keys browse; Enter chooses. Space chooses in the plain picker and remains ordinary text in search. Home and End navigate the plain list but retain normal cursor movement in the search field.
- Escape dismisses without changing an uncommitted single choice and returns focus to the opener. It must not also close an enclosing dialog. Multi-selection changes remain immediate, as before.
- Tab reaches any footer actions, then moves to the next field in the opener's logical order. Shift+Tab moves backwards. Options do not each create an extra Tab stop.
- Keep selection, focus and hover distinguishable. Use a checkmark as well as colour.
- No matching options is announced separately from the listbox. An empty search result cannot accidentally submit the enclosing form.

## Positioning and mobile

The menu follows the field width, with a small minimum width where necessary, and shrinks to the visible viewport. Open above when there is more space there. Long lists scroll; keep the active option visible. Reposition on scrolling, resizing and visual viewport changes, including the on-screen keyboard.

Mount the portal inside the opener's nearest native dialog, otherwise in the document body. This avoids clipped menus in scrolling forms and drawers while respecting modal focus containment.

## Scope boundaries

Calendar and time entry, address suggestions, mentions inside text, media browsing, colour selection and rich source-browser dialogs are separate interaction patterns. Inline choice grids such as Brief video type and call to action remain visible grids. They must not be replaced with a simple dropdown at the expense of their functions. General navigation and action menus remain separate from selection fields.
