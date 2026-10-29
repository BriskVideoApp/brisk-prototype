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

This section describes Figma authoring. In React, use actual exports from `Brisk DS/src/app/components/` and the approved app compositions in the [desktop baseline](../../Docs/desktop-design-baseline.md); do not invent `d-` imports or load exported demo themes to recreate Figma instances. Follow the [runtime map](Guidelines.md#react-runtime-map).

- **Use:** `d-` prefix — adopted desktop components
- **Never use:** `m-` prefix — these are mobile components and do not exist in this DS
- Always insert components as **instances** from the DS file, never as detached frames or drawn shapes
- Apply **variant properties only** on instances — never override strokes, fills, effects, padding, or spacing directly on an instance

---

## Auto-layout requirements

These are Figma frame rules. In React, reuse the approved component/layout implementation and preserve intentional positioning for anchored menus, player overlays and other specialised controls. This is not permission to redesign them as ordinary document-flow panels.

- Use **auto-layout on every frame** — never position elements with absolute x/y unless unavoidable
- `gap/*` tokens for spacing between siblings
- `padding/*` tokens for container insets
- Bind zero values to `gap/none`, `padding/none`, `radius/none` — never leave raw `0`

---

## 8pt grid

- All spacing on 4px multiples where possible
- Preserve non-token dimensions explicitly specified by an approved pattern (for example 20px or 28px). Do not round them to the nearest token or invent arbitrary spacing.

---

## Focus states

React controls follow their component-specific approved focus contract. Preserve the existing visible blue outline and keyboard behaviour; do not replace it with the original Figma construction below or suppress it with a page-level reset.

Original Figma focus construction:
1. Outer weight-4 `--border/primary` stroke on the element
2. Inner `d-Focus state` instance with `--border/focus-state` (#91baff) stroke
