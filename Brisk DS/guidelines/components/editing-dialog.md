# Editing dialogs

Approved by Tom on 16 October 2026. Use `EditingDialog` for centred forms and settings dialogs throughout Brisk.

**Source:** `Brisk DS/src/app/components/EditingDialog.tsx`

## Appearance

Use the same white surface, primary dark border, medium hard shadow and medium radius as the confirmation dialog. The shared `DialogSurface` owns the padding, heading, scrolling, footer and focus handling.

- Extra small bold heading, small paragraph explanation, extra large outer padding and section gaps.
- No top-right X, decorative header icon or header/footer divider.
- Small DS Buttons aligned right. Put Cancel before Save or the existing primary action.
- Keep additional actions when the flow needs them, including Back, Delete, Upload and alternative destinations.
- Use `danger` for destructive actions. Keep the existing confirmation before changing data.
- Never apply feature-specific borders, shadows or padding to the outer surface.

## Usage

```tsx
import { EditingDialog } from ".../Brisk DS/src/app/components/EditingDialog";
import { Button } from ".../Brisk DS/src/app/components/Button";

<EditingDialog
  title="Edit profile"
  description="Update your contact details."
  onCancel={close}
  actions={
    <>
      <Button size="S" variant="secondary" onClick={close}>Cancel</Button>
      <Button size="S" disabled={!canSave} onClick={save}>Save</Button>
    </>
  }
>
  {fields}
</EditingDialog>
```

The default footer contains Cancel. Supply `actions` for a custom footer and retain an explicit exit. For controls that save immediately, retain Done or Close rather than suggesting that Cancel reverses a saved change. Keep Back separate from the action that closes the whole dialog. A non-dismissible progress step can retain its existing disabled action and no-op cancellation callback.

## Sizes and long forms

Use `standard` (560px) for ordinary forms; `compact` (480px), `expanded` (680px), `wide` (800px) or `full` (1120px) when the existing content needs it. All shrink to the viewport with an outer margin. Choose width for the content rather than creating another visual variant.

Only the body scrolls. The title and footer remain visible, including on small screens. Preserve multi-column field groups where space permits and their existing mobile stacking. Tables may scroll horizontally within the body.

## Behaviour and integration

- Keep all fields, validation, disabled states, callbacks, uploads, conditional sections and special actions.
- Native modal semantics make the background inert and contain keyboard focus. The first editable field receives focus, then the first footer action if there are no fields. `data-dialog-autofocus` explicitly chooses a field.
- Escape and a backdrop click call `onCancel`. Pass the original unsaved-work guard to that callback. Focus returns to the opener when the dialog closes.
- Menus and pickers rendered through a portal must mount within their opener's nearest `dialog`, falling back to `document.body` outside a dialog. They must consume Escape when closing themselves, so they do not also close the form.
- If footer buttons sit outside an HTML form, use `form={formId}` for native submit validation. Do not replace a submit with an unvalidated click handler.
- Retain nested confirmations, using `ConfirmationDialog` above the editor. Cancelling a confirmation must leave the form and its draft intact.

## Scope

The app's `ClientModal`, Shoot `ModalShell` and onboarding `StudioReviewDialog` are compatibility wrappers over this component. Team editors, freelancer time entry, Brand Kit setup/voice/font/rename forms, Media move/import, Masters request/download/source selection and Chat settings/call setup use it directly.

Contextual inline editors, anchored popovers, drawers, read-only media previews, upload progress, celebration screens and full-screen media review remain separate patterns. They do not become a centred form solely because they have dialog semantics.
