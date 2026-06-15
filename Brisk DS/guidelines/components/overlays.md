# Brisk DS — Overlays & Feedback

---

## d-Modal

**Variants:** Size

**Content slot rule:** The `Content` frame inside `d-Modal` is auto-layout, FILL x HUG, no fill, no stroke. Always place content inside this slot — never delete it, resize it, or place content outside it.

**Backdrop:** `--overlay/dark`

Use for:
- Complex confirmations requiring user input
- Forms or multi-step flows that interrupt the current context
- Displaying detailed information that requires full focus

Do not use for:
- Simple yes/no confirmations — use `d-Popconfirm` instead
- Inline status updates — use `d-Notification toast` instead

---

## d-Drawer

**Variants:** Size

**Radius:** `radius/l` on top-left corner only, `radius/none` on all other corners. Always verify all 4 corners.

**Content slot rule:** Same as `d-Modal` — use the `Content` slot, never replace or delete it.

Use for contextual panels, detail views, and settings that slide in from the side without fully blocking the page.

---

## d-Popover

Use for contextual menus, additional options, or rich tooltip content triggered by a click. Radius: `radius/m`. Shadow: `--box-shadow/elevated/m` at rest.

---

## d-Popconfirm

Use for simple yes/no confirmations for destructive or irreversible actions (e.g. "Delete this item?"). Appears anchored to the trigger element. Do not use Modal for this — Popconfirm is lighter and keeps the user in context.

---

## d-Tooltip

**Variant:** Dark only

Use for short contextual labels on hover (icon meanings, truncated text, shortcuts). Never use Tooltip for critical information — it is invisible without hover. Maximum ~60 characters of text.

---

## d-Alert banner

**Variants:** Type (Info / Success / Warning / Error / Neutral)

Use for persistent page-level alerts that require user awareness (degraded service, required action, system notice). Place at the top of the page content area, below the header.

Do not dismiss an Alert banner without user action unless the underlying condition resolves.

**Type selection:**
- Info → neutral informational notice
- Success → action completed, feature activated
- Warning → something needs attention but is not broken
- Error → something is broken or failed
- Neutral → non-semantic general notice

---

## d-Notification toast

**Variants:** Type (Info / Success / Warning / Error / Neutral)

Use for brief, auto-dismissing feedback after a user action (saved, sent, deleted, error occurred). Appears at the edge of the screen. Disappears after ~4s.

Never use Toast for information the user must act on — use Alert banner or Modal instead.

---

## d-Push notification

Use specifically for app-level push notification previews. Not for in-product feedback — use Toast for that.

---

## d-Info block

Use for inline contextual guidance, tips, or non-critical information within a form or content section. Not a replacement for field-level hint text on `d-Input`.

---

## d-Loading spinner

Use when an action is in progress and the result will appear in the same view. Show only when the wait time is expected to be more than ~300ms.

---

## d-Skeleton

Use when an entire section or page is loading and content is not yet available. Replace skeleton frames with actual content as soon as data arrives.

---

## d-Progress status

Use for tracking the status of a multi-stage process where stages may be in-progress, complete, or pending (e.g. order tracking, pipeline stages). Different from `d-Progress steps` which is for wizard-style step navigation.
