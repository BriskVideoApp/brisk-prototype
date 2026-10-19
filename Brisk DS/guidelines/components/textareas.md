# React multi-line fields

Use `Textarea` from `Brisk DS/src/app/components/Textarea.tsx` for approved ordinary multi-line form fields. Tom authorised this missing DS implementation on 19 October 2026. This is an approved token-based addition, not a new asset supplied by Yura.

## Context-sized fields

- One shared treatment: Paragraph/S body text, 12px token padding, small radius, white resting fill and dark border.
- Native `rows` sets the starting height, defaulting to three. Preserve existing rows and layout minimum heights when migrating. Do not turn every field into the same-height box.
- Vertical resizing remains available. There is no automatic growth, horizontal resizing or new keyboard shortcut.
- `wrapperClassName` supplies layout only; `className` applies to the native textarea. Do not replace the DS appearance in consumer styles.

## Native behaviour and accessibility

- Native React textarea attributes, events and refs pass through, including `value`, `defaultValue`, `name`, `rows`, `cols`, `wrap`, `maxLength`, `required`, `disabled`, `readOnly`, `autoFocus`, form attributes and ARIA/data attributes. Refs point at the native textarea.
- `label` creates an explicitly associated label using a supplied or generated unique id. A label-free field must retain an accessible name through native ARIA attributes. Never nest Textarea inside another label.
- `labelSuffix` retains existing Required/Optional copy without changing validation. `hint` has a stable id appended to any existing `aria-describedby`.
- `error` sets the error border and `aria-invalid`. Caller-supplied invalid states and external descriptions remain intact. Supporting these states does not authorise adding new validation or error flows.
- Change and blur callbacks are composed with the typing indicator, not replaced. No trimming, sanitisation, value transformation or application persistence is added. Enter remains a native line break.

## States

The strengthened Input family supplies the semantic-token treatment: lavender hover with a small hard shadow, blue focus ring, purple typing ring, red error border with visible focus and muted disabled colours. Read-only values stay focusable without typing or hover decoration. Disabled values remain visible.

## Verified pilot scope

- Default Submit message, for both Client and Studio destinations: five rows, the existing minimum height, 240-character limit, required attribute, placeholders in the live example and existing blank/unchanged save gating.
- Client message templates: the five-row Message field. Subject, sign-off, variable resolution, preview, normalisation, selection, save and restore logic are unchanged.
- Editable Studio notification templates: the five-row Message field. Title, fixed-wording restrictions, category selection, preview, save and restore logic are unchanged.

Unused Studio description and invitation screens are not counted as migrated. Chat, AI prompt/composer, Script, Brief, review and specialised Shoot editors remain unchanged. This pilot does not change send/submission workflows, notification preferences or access roles.

## Follow-up batches

- Studio instructions in AI Playbook use Textarea with the existing 120px layout minimum and native two-row starting value. No character limit, requirement, auto-growth or validation was added. Uploads, links, save/discard, unsaved-change handling and Studio access restrictions are unchanged. The AI composer is not part of this batch.
- People notes remain a later batch until separately migrated and verified.
