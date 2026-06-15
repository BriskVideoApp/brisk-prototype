# Brisk DS — Components Overview & Decision Trees

All components use the `d-` prefix. Insert as instances. Apply variant properties only — never override strokes, fills, effects, or spacing on instances.

Swap slots are marked (swap) · Boolean toggles are marked (bool).

---

## Component catalog by category

**Buttons & links:** `d-Button` · `d-Icon button` · `d-Group button` · `d-Text Link Button` · `d-Link button`

**Form inputs:** `d-Input` · `d-Textarea` · `d-Dropdown` · `d-Multiselect` · `d-Date input` · `d-Date picker` · `d-Checkbox` · `d-Checkbox list` · `d-Radio` · `d-Radio list` · `d-Toggle` · `d-Segmented control` · `d-Slider` · `d-Slider with label` · `d-Drag and drop` · `d-Upload file`

**Navigation:** `d-Header` · `d-Subheader` · `d-Side menu` · `d-Footer` · `d-Tabs` · `d-Breadcrumbs` · `d-Pagination` · `d-Pagination dots` · `d-Progress steps` · `d-Scrollbar`

**Overlays & feedback:** `d-Modal` · `d-Drawer` · `d-Popover` · `d-Popconfirm` · `d-Tooltip` · `d-Alert banner` · `d-Notification toast` · `d-Push notification` · `d-Info block` · `d-Loading spinner` · `d-Skeleton` · `d-Progress status`

**Data display:** `d-Table` · `d-Table menu` · `d-Card` · `d-Tag-Badge` · `d-Chips` · `d-Status dot` · `d-Avatar` · `d-Accordion` · `d-Timeline` · `d-Chart` · `d-Calendar` · `d-Rate` · `d-Divider-border-separator` · `d-Dropdown menu`

**Media & comms:** `d-Video player` · `d-Music player` · `d-Business mail` · `d-Comment` · `d-Messenger`

**Utility:** `d-Focus state` · `d-Pointer` · `d-Apps market` · `d-Modal/content`

---

## Decision tree: which button?

```
Need a primary call-to-action (main action on the page/section)?
  → d-Button, Type=Primary
  → MAX ONE per visible section. If you need more, demote others.

Need a standard supporting action?
  → d-Button, Type=Secondary

Need a brand-tinted soft action (less emphasis than secondary)?
  → d-Button, Type=Tertiary

Need a text-only action with no background or border?
  → d-Button, Type=Ghost

Need a text link that navigates (inline with prose or standalone)?
  → d-Button, Type=Ghost-link  OR  d-Text Link Button

Need icon only, no label?
  → d-Icon button (Shape=Square for standard, Shape=Circle for avatar-style)

Need multiple related actions grouped together?
  → d-Group button

Need a navigation link (href, external)?
  → d-Link button
```

---

## Decision tree: which input?

```
Free text, single line?
  → d-Input

Free text, multi-line?
  → d-Textarea

Mutually exclusive options, few choices (≤5)?
  → d-Radio / d-Radio list

Mutually exclusive options, many choices (6+)?
  → d-Dropdown

Multiple selections allowed, few options?
  → d-Checkbox / d-Checkbox list

Multiple selections allowed, many options?
  → d-Multiselect

Binary on/off setting?
  → d-Toggle

Filter or tab-like switching between a small fixed set?
  → d-Segmented control

Numeric range or single value?
  → d-Slider or d-Slider with label

Date entry (typed)?
  → d-Date input

Date selection (calendar picker)?
  → d-Date picker (Type=single or Type=range)

File upload?
  → d-Upload file or d-Drag and drop
```

---

## Decision tree: which feedback component?

```
Brief status update after an action (success, error, warning)?
  → d-Notification toast

Persistent page-level alert (e.g. degraded service, required action)?
  → d-Alert banner

Inline field-level hint or contextual info (not an error)?
  → d-Info block  OR  Hint text on d-Input

Confirmation of a destructive or irreversible action?
  → d-Popconfirm

Contextual help label shown on hover?
  → d-Tooltip (Dark variant)

Complex confirmation requiring user input or choice?
  → d-Modal

Loading state (whole section not yet ready)?
  → d-Skeleton

Loading state (action in progress)?
  → d-Loading spinner

Step-by-step progress tracking?
  → d-Progress steps  OR  d-Progress status
```

---

## State rules (all interactive components)

**Stroke:**
- Active/Hover/Pressed → `--border/primary` weight 1
- Focus → `--border/primary` weight 4 + inner `d-Focus state` instance with `--border/focus-state`
- Disabled → `--border/secondary` (controls) or `--disabled/border` (inputs, chips)
- Inverse=On / Ghost → no stroke

**Shadow:**
- Controls at rest → none
- Controls on hover → `--box-shadow/elevated/m` (large, 40px+) or `--box-shadow/elevated/s` (small)
- Elevated surfaces at rest → `--box-shadow/elevated/m`
