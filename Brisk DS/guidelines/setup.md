# Brisk DS — Setup & Technical Constraints

## DS file

- **File key:** `5528Fqe3Kq0aQCDpjzQ74d`
- **Components page:** contains all `d-` components
- **Icons page:** "Icons & Logos & Images" — all `i-Icon/*`, `i-Logo/*`, `i-Illust/*`, `i-Pictogram/*`

---

## Viewport

- **Current design phase:** desktop first, using the 1440px kit reference. Tom approved fixing and signing off the full desktop UI before the mobile design pass on 20 October 2026; see Current design sequence in `AGENTS.md`.
- Defer new mobile layouts, mobile-only fixes and routine mobile verification unless explicitly requested. Preserve existing responsive code and functionality. When mobile work requires a missing component or asset, follow the missing-asset protocol in `Guidelines.md`.

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
