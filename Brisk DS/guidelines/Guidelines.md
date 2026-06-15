# Brisk DS — Overview & Reading Guide

**Design language:** Neo-brutalism · **DS file:** `5528Fqe3Kq0aQCDpjzQ74d` · **Viewport:** 1440px desktop only

---

## Core rule — DS-only, zero invention

Every visual decision must come from the Brisk DS:
- Components: `d-` prefix instances only
- Colors: named token variables only
- Typography: DS text styles only
- Spacing/radius: token values only
- Icons: `i-Icon/*`, `i-Logo/*`, `i-Illust/*`, `i-Pictogram/*`
- Effects: `--box-shadow/elevated/m` or `/s` only

Never hardcode hex colors, invent component shapes, use outside icons, apply custom shadows, or create patterns not already in the DS.

---

## Missing asset protocol — STOP before proceeding

If any component, style, variable, or icon is missing from the DS:
1. **Stop.** Do not improvise or substitute.
2. **Report to operator:** what is missing · why it is needed · how it should look/behave · which DS tokens or patterns to build from.
3. **Tell the operator:** "Please contact Yura to confirm whether this addition is necessary and how it should be implemented before I continue."
4. **Do not continue** until the operator confirms the asset exists or provides an alternative.

---

## Reading order

Start here, then follow in sequence:

1. `setup.md` — DS file, viewport, technical constraints
2. `foundations/tokens-color.md` — color vocabulary
3. `foundations/tokens-spacing-radius.md` — spacing, radius, layout grid
4. `foundations/typography.md` — text styles
5. `foundations/effects.md` — shadow rules
6. `components/overview.md` — component catalog + decision trees
7. `icon-discovery.md` — icon catalog and usage rules
8. `brand/logo-flows.md` — logo and flow icons

---

## Design language: neo-brutalism

- **Black edges, hard shadows.** Every enclosing container on a light surface gets a 1px `--border/primary` stroke.
- **No soft shadows.** Only `--box-shadow/elevated/m` (4,4 offset, radius 0) or `--box-shadow/elevated/s` (2,2 offset). Never blurred, feathered, or multi-stack.
- **Interactive controls:** no shadow at rest — shadow appears on Hover only.
- **Elevated surfaces** (cards, popovers, dropdowns, modals, drawers): `--box-shadow/elevated/m` at rest.
- **Surface color defines layout hierarchy**, not borders. Borders are for interactive elements only.

---

## What NOT to do

- Never use `--border/secondary` or `--border/elevated` on active/resting enclosing edges — disabled-only tokens.
- Never apply `--illustration/*` tokens directly to product UI surfaces.
- Never apply soft, blurred, or multi-stack shadows.
- Never add a manual DROP_SHADOW to interactive controls at rest.
- Never override strokes, fills, effects, or spacing on `d-` component instances — variant properties only.
- Never use `m-` prefixed components — desktop only.
- Never leave raw `0` for padding/gap/radius — bind to `padding/none`, `gap/none`, `radius/none`.
- Never round a non-matching spacing value to the nearest token — use the raw number.
