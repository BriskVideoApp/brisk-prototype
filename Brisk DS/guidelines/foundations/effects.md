# Brisk DS — Effect Styles

---

## Allowed effects

| Effect | Offset | Blur | When to apply |
|---|---|---|---|
| `--box-shadow/elevated/m` | 4,4 | 0 (hard) | Hover on large controls (40px+); rest state on all elevated surfaces (cards, modals, popovers, dropdowns, drawers) |
| `--box-shadow/elevated/s` | 2,2 | 0 (hard) | Hover on small controls (under 40px) |

---

## Forbidden effects

Never apply these:
- `--box-shadow/window/regular`
- `--box-shadow/card/regular`
- `--box-shadow/elevated/inversed`
- `--box-shadow/elevated/left`
- `--box-shadow/elevated/right`
- Any soft, blurred, feathered, or multi-stack shadow
- Any manually constructed DROP_SHADOW on interactive controls at rest

---

## Shadow application rules

- **Interactive controls at rest** (buttons, inputs, icon buttons): no shadow.
- **Interactive controls on hover:** apply `--box-shadow/elevated/m` (large controls) or `--box-shadow/elevated/s` (small controls) via the effect style — not manually.
- **Elevated surfaces at rest** (cards, popovers, dropdowns, modals, drawers): `--box-shadow/elevated/m` always.
- Shadow color base: `--gray/100`.

---

## State summary

| Context | Rest | Hover |
|---|---|---|
| Large interactive control (40px+) | No shadow | `--box-shadow/elevated/m` |
| Small interactive control | No shadow | `--box-shadow/elevated/s` |
| Card / popover / dropdown | `--box-shadow/elevated/m` | — |
| Modal / Drawer | `--box-shadow/elevated/m` | — |
