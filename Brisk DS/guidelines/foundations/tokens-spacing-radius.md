# Brisk DS — Spacing & Radius Tokens

---

## Spacing tokens

Use `gap/*` for spacing between siblings. Use `padding/*` for container insets. Always bind zero values to the token — never leave raw `0`.

| Token | Value |
|---|---|
| `gap/none` / `padding/none` | 0px |
| `gap/xxs` / `padding/xxs` | 2px |
| `gap/xs` / `padding/xs` | 4px |
| `gap/s` / `padding/s` | 8px |
| `gap/m` / `padding/m` | 12px |
| `gap/l` / `padding/l` | 16px |
| `gap/xl` / `padding/xl` | 24px |
| `gap/2xl` / `padding/2xl` | 32px |
| `gap/3xl` / `padding/3xl` | 40px |

**Non-matching values** (e.g. 20px, 28px): use the raw number — never round to the nearest token.

---

## Radius tokens

Always check all 4 corners independently — never assume symmetric radius.

| Token | Value | Primary use |
|---|---|---|
| `radius/none` | 0px | Sharp corners, anchored panel edges |
| `radius/xxs` | 2px | `d-Card` |
| `radius/xs` | 4px | Tag-Badge, Chip, small controls; Tab container top corners |
| `radius/s` | 8px | Button, Input, Icon button |
| `radius/m` | 12px | Popover, dropdown menus |
| `radius/l` | 16px | Business mail, Drawer top-left corner only |
| `radius/full` | 999px | Avatar, Status dot, circular controls |

**Asymmetric example — Drawer:** `radius/l` on top-left only, `radius/none` on all other corners.

---

## Layout rules

- **8pt grid.** All spacing on 4px multiples where possible.
- **Auto-layout on every frame.** Never position elements with absolute x/y unless unavoidable.
- **Modal/Drawer content slot.** The `Content` frame is auto-layout FILL x HUG, no fill, no stroke. Place content inside it — never delete or resize the slot.
- **Tabs.** Mixed radius — sharp corner on the side meeting the content block.
