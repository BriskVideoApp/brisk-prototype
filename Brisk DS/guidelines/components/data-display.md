# Brisk DS — Data Display Components

---

## d-Table · d-Table menu

Use `d-Table` for structured tabular data. Use `d-Table menu` for row-level contextual actions (three-dot menu or inline action set). Never build a custom table from raw frames.

---

## d-Card

**Fill:** `--bg-elevated-block/primary` only. Never use any other fill on a Card.

**Stroke:** `--border/primary` 1px (neo-brutalism rule — all elevated containers get a black border).

**Shadow:** `--box-shadow/elevated/m` at rest.

**Radius:** `radius/xxs` (2px) on all corners.

Use Cards to group related content that is visually elevated above the page canvas. Do not use Card as a generic container — use it only when the content needs to be distinguished as a self-contained unit.

---

## d-Tag-Badge

**Variants:** Size · Type · Light (bool)

Use for labels, categories, statuses, and counts. Radius: `radius/xs`.

---

## d-Chips

Use for filter chips, selected tags, and multi-select tokens. Never create custom pill-shaped tags — always use `d-Chips`.

---

## d-Status dot

Use to indicate live status (online, offline, busy, away) alongside an avatar or list item. Radius: `radius/full`.

---

## d-Avatar

**Variants:** Size · Shape (Square / Circle)

- Circle → person/user avatars
- Square → brand/company/workspace avatars

Radius for Circle: `radius/full`. Radius for Square: `radius/xs` or `radius/s` depending on size.

Never create a custom avatar frame. Always use `d-Avatar` instances.

---

## d-Accordion

Use for collapsible content sections where only one section needs to be visible at a time. Do not use Accordion for navigation — use `d-Side menu` instead.

---

## d-Timeline

Use for chronological event sequences. Never build a custom list with manual date labels.

---

## d-Chart

Use for data visualizations. Never draw custom chart elements — always use `d-Chart` instances.

---

## d-Calendar

Use for date-range views, scheduling, and event display. For date input, use `d-Date input` or `d-Date picker` instead.

---

## d-Rate

Use for star/rating inputs. Never create custom star shapes.

---

## d-Divider-border-separator

Use to visually separate sections or list items. Never use a manually drawn line for separation.

---

## d-Dropdown menu

Use for contextual action menus that appear on click (right-click menus, three-dot menus, action lists). Shadow: `--box-shadow/elevated/m`. Radius: `radius/m`.
