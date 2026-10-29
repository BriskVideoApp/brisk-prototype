# Brisk DS - Overview & Reading Guide

**Design language:** Neo-brutalism · **DS file:** `5528Fqe3Kq0aQCDpjzQ74d` · **Reference viewport:** 1440px desktop; preserve existing responsiveness

## Current prototype authority

Read the [approved desktop design baseline](../../Docs/desktop-design-baseline.md) alongside this guide. Original `d-` instance instructions describe the Figma kit; approved React extensions and app-level compositions have their own scoped guidance. Neither a Figma catalogue entry nor existing app markup proves that a reusable React component exists or has been approved. Latest explicit user decisions and component-specific approved variants supersede conflicting older examples within their scope. This reconciliation does not confirm changes to the Figma source.

For new features, follow the [AGENTS design contract](../../AGENTS.md#design-contract-for-future-features). Reuse the approved implementation before adding CSS. Do not redesign working screens to satisfy a generic rule or an original audit recommendation that a later decision supersedes.

## React runtime map

| Need | Runtime source | Rule |
| --- | --- | --- |
| Reusable controls | `Brisk DS/src/app/components/` and its component-specific guides | Import actual exports and select documented variants. Consumer CSS arranges controls; the DS owns their visual and interaction states. |
| Dropdown compatibility import | `src/components/form/BriskSelect.tsx` | Re-exports the DS Select implementation; do not fork it. |
| Approved app compositions | [Desktop baseline](../../Docs/desktop-design-baseline.md) | Reuse the scoped header, shell, stage and workflow implementations; these are not automatically new primitives. |
| Colour, spacing, radius and shadow variables | `styles/brisk-tokens.css`, imported by `src/app/globals.css` | Use existing runtime names such as `--brisk-border-primary`, `--brisk-space-m`, `--brisk-radius-m` and `--brisk-shadow-m`. Globals currently repeats some declarations; do not add another definition site or consolidate values during feature work. |
| Text styles and font | `src/app/globals.css` and the font setup in `src/app/layout.tsx` | Use existing named classes and component styles. Verify that a class exists; a Figma style name alone does not supply runtime CSS. |
| General UI icons | `src/components/video-review/DsIcon.tsx` and its mapped `public/brisk-icons/` assets | Verify the name and asset; use `DsIcon`, not an icon-library import or a drawn substitute. |
| Production-stage presentation | Existing `StageChip` implementation | Preserve circular stages, their state treatment and pinned Media. Never use the legacy `FlowIcon` export or archived Flow assets. |

Slash-separated names such as `--border/primary`, `gap/m` and `Headings/M-bold` below identify Figma vocabulary. They are not literal runtime variable or class names. Inspect the actual definition before use; do not infer a missing alias from similar names. The prototype does not load the DS demo's default shadcn theme or exported demo styles as its runtime theme.

---

## Core rule - reuse approved design, zero invention

Every visual decision must come from the Brisk DS:
- Components: actual approved React exports/compositions; `d-` instances when working in Figma
- Colours: existing named runtime token variables only
- Typography: DS text styles only
- Spacing/radius: existing tokens and exact geometry explicitly specified by approved patterns
- Icons: approved mapped assets through `DsIcon`; Figma instance prefixes apply in Figma
- Elevation: existing hard-shadow tokens, following each approved component's state contract

Never hardcode new colours, invent component shapes, use outside icons, apply new custom shadows or create an unapproved pattern. Preserve scoped exceptions, including quiet Media sorting, tinted Brand Kit cards and the current pink pulsing unread badges. These approvals do not generalise to unrelated controls.

---

## Missing asset protocol - stop the affected work before proceeding

If any component, style, variable, or icon is missing from the DS:
1. **Stop the affected work.** Look for the existing export, mapped asset or approved composition first. A missing Figma-to-React counterpart is not permission to rebuild it.
2. **Report to operator:** what is missing · why it is needed · how it should look/behave · which DS tokens or patterns to build from.
3. **Tell the operator:** "Please contact Yura to confirm whether this addition is necessary and how it should be implemented before I continue."
4. **Do not implement the missing piece** until the operator confirms the asset exists or explicitly approves an alternative. Reuse a previously approved scoped pattern without requesting the same approval again. Record the resulting approval in the desktop baseline; do not invent one or silently substitute another asset.

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

- **Black edges, hard shadows.** Ordinary enclosing edges follow the primary-border treatment. Approved quiet controls, content hairlines and specialised compositions retain their own rules; do not double-border them.
- **No soft shadows.** Only `--box-shadow/elevated/m` (4,4 offset, radius 0) or `--box-shadow/elevated/s` (2,2 offset). Never blurred, feathered, or multi-stack.
- **Interactive controls:** follow their component-specific states. Quiet variants may have no raised hover shadow.
- **Elevated surfaces:** follow the approved component or composition's elevation, including resting hard shadows where specified.
- **Surface colour and spacing define layout hierarchy.** Borders belong on the enclosing edges and controls specified by the approved pattern, not every nested block.

---

## What NOT to do

- Do not replace primary enclosing borders with disabled border colours. Approved content separators and existing component variants retain their own treatment.
- Never apply `--illustration/*` tokens directly to product UI surfaces.
- Do not introduce soft or blurred surface elevation. Focus/selection outlines, stage-state shadows and media-overlay legibility effects are distinct from ordinary elevation; preserve an approved scoped treatment rather than applying a blanket replacement or file-wide exemption.
- Never add a manual DROP_SHADOW to interactive controls at rest.
- Never override strokes, fills, effects, or spacing on `d-` component instances — variant properties only.
- Never use `m-` prefixed components — desktop only.
- Never leave raw `0` for padding/gap/radius — bind to `padding/none`, `gap/none`, `radius/none`.
- Preserve non-token dimensions explicitly specified by an approved component or pattern; never round them or treat this as permission to invent arbitrary spacing.
