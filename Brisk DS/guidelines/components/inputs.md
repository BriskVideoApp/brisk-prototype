# React single-line inputs

Use `Input` from `Brisk DS/src/app/components/Input.tsx` for ordinary single-line form fields. `Input.module.css` owns the appearance and interaction states using Brisk tokens. Extend this implementation rather than building a parallel input.

## Sizes and layout

- Keep S, M and L text/padding variants. M is the default; S supports compact forms.
- `label` supplies the associated visible label. If a visible label is not appropriate, supply a native `aria-label` or `aria-labelledby`.
- `labelSuffix` displays existing Required/Optional copy beside the label. It is descriptive only: it does not add native validation or change save rules.
- `wrapperClassName` supplies outer layout hooks, such as a full-width grid span. `className` is applied to the native input. Do not use either to replace the DS colours, borders, spacing or states.
- `iconStart` and `iconEnd` reserve space independently, including when both are present. Keep icon content and accessible names appropriate to the field.

## Native behaviour

The component accepts native React input attributes and a ref, except the native numeric `size` attribute, which is reserved for DS S/M/L sizing. This includes controlled `value` or uncontrolled `defaultValue`, name, type, autoComplete, autoFocus, disabled, readOnly, required, min/max/step, maxLength, inputMode, ARIA/data attributes and event handlers. Refs point at the actual input.

The internal typing indicator does not transform the value or replace the caller's handlers. Change and blur handlers are composed with that indicator; other native handlers pass through. Preserve the existing form's submission, validation, draft and save behaviour when migrating it. Do not introduce `required`, change an input type or add validation merely because the component supports it.

## Hints, errors and states

- Labels use an explicit supplied id or a generated unique id.
- `hint` receives a stable id and is appended to any caller-provided `aria-describedby`. Existing external descriptions are retained.
- `error` marks the field `aria-invalid` and changes its border. Existing native `aria-invalid` values are also preserved.
- Resting fields have a white fill, dark border and small radius. Hover has the existing lavender fill and small hard shadow.
- Focus has a visible blue ring. Typing in an editable, non-error field changes the ring to the existing purple typing colour. Blur resets that typing state.
- Errors retain their red border while focus remains visible. Disabled fields use muted semantic tokens with no hover/focus decoration. Read-only fields remain focusable and retain their value without typing or hover decoration.

## Pilot scope - 19 October 2026

The ordinary fields in Add Client, Client profile details and Start project use this input. Their labels, optional/required copy, autofocus, values, callbacks, duplicate detection, code sanitisation and save conditions remain in the app.

Search, Client selection, project-access checkboxes, logo uploads, rich composers, inline table editors, calendar/time controls and suggestion-based fields remain specialised. This pilot does not introduce Textarea, Checkbox, Radio or Toggle changes.

```tsx
<Input
  label="Client name"
  labelSuffix="Required"
  wrapperClassName="is-wide"
  autoFocus
  value={name}
  onChange={(event) => setName(event.target.value)}
/>

<Input
  label="Client code"
  value={code}
  error={codeConflict}
  hint={codeConflict ? 'This code is already used by another Client.' : 'Prefix for new project codes.'}
  onChange={(event) => setCode(event.target.value)}
/>
```
