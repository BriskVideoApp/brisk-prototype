# Brisk DS — Setup & Technical Constraints

## DS file

- **File key:** `5528Fqe3Kq0aQCDpjzQ74d`
- **Components page:** contains all `d-` components
- **Icons page:** "Icons & Logos & Images" — all `i-Icon/*`, `i-Logo/*`, `i-Illust/*`, `i-Pictogram/*`

---

## Viewport

- **Desktop only:** 1440px wide
- **No mobile version of Brisk.** Do not create mobile layouts or responsive variants. If a mobile layout is requested, stop and report per the missing asset protocol in `overview.md`.

---

## Component prefix rules

- **Use:** `d-` prefix — adopted desktop components
- **Never use:** `m-` prefix — these are mobile components and do not exist in this DS
- Always insert components as **instances** from the DS file, never as detached frames or drawn shapes
- Apply **variant properties only** on instances — never override strokes, fills, effects, padding, or spacing directly on an instance

---

## Auto-layout requirements

- Use **auto-layout on every frame** — never position elements with absolute x/y unless unavoidable
- `gap/*` tokens for spacing between siblings
- `padding/*` tokens for container insets
- Bind zero values to `gap/none`, `padding/none`, `radius/none` — never leave raw `0`

---

## 8pt grid

- All spacing on 4px multiples where possible
- Non-matching values (e.g. 20px, 28px) stay raw — do not round to nearest token

---

## Focus states

Focus always requires two layers:
1. Outer weight-4 `--border/primary` stroke on the element
2. Inner `d-Focus state` instance with `--border/focus-state` (#91baff) stroke
