# Confirmation dialogs

Approved by Tom on 16 October 2026. Use this shared React component for confirmations throughout Brisk.

**Source:** `Brisk DS/src/app/components/ConfirmationDialog.tsx`

## Appearance

- White surface, primary dark border, medium hard shadow and medium radius.
- Extra large padding and section gaps. Small gap between title and explanation.
- Extra small bold heading and small paragraph text.
- Small DS Buttons aligned right, with Cancel first.
- Red `danger` action for deletion, removal or discarding work. Purple `primary` for approval, sending and other positive actions.
- No decorative header icon, divider or extra close button.
- The compact surface is 480px wide; expanded is 680px. Both shrink to fit smaller screens and scroll when needed.

## Compact

```tsx
import { ConfirmationDialog } from ".../Brisk DS/src/app/components/ConfirmationDialog";

<ConfirmationDialog
  title="Delete this file?"
  description="This cannot be undone."
  confirmLabel="Delete file"
  tone="danger"
  onCancel={close}
  onConfirm={deleteFile}
/>
```

## Expanded

Use `expanded` for typed confirmation, a message editor, recipient choices or detailed impact lists. Put that content in `children`. Keep its existing validation and callbacks. Use `confirmDisabled` for validation; add `data-confirmation-autofocus` to a field that should receive initial focus.

Use the `actions` slot only when more than two actions are necessary. Its buttons must use DS Button, size S. Include an explicit way to cancel. Do not create another confirmation shell or add feature-specific styles to this one.

`useConfirmation()` supplies an async `confirm(options)` and `confirmationDialog` to render for a previously synchronous in-app prompt. Cancellation or unmount resolves false. Await it before changing data.

## Behaviour

Native modal dialog semantics keep the background inert and contain keyboard focus. Escape and a backdrop click cancel. Focus starts on Cancel unless a field is explicitly marked, and returns to the opener on close. Enter never bypasses a disabled action. Nested controls should prevent the default Escape behaviour when consuming Escape themselves.

Keep recovery descriptions accurate. Do not replace a permanent-deletion warning with a promise of Trash or Undo unless that recovery exists.

## Browser navigation exception

Studio Settings retains its synchronous native unsaved-work warning for browser history traversal and the browser-managed reload/tab-close warning. Do not remove these safeguards or replace them with an asynchronous dialog without reviewing the navigation lifecycle separately. In-app settings links and section selection use the shared DS dialog.
