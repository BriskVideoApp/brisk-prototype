# Skill: Brisk Design System

## How to use this skill

- This skill lives in your `brisk-prototype` repo as `brisk-design-system.md`. Codex reads it on every session.
- Pair it with Yura's component library in the `Brisk DS/` folder.

## Skill file content

```markdown
# Brisk Design System Skill

You are designing screens for **Brisk**, a multi-tenant SaaS platform for video production teams. Apply the rules below to every component, layout, and screen you generate. These rules override generic design defaults.

## Visual language: Neo-brutalism

- Style is neo-brutalism: clean, confident, slightly raw. Not skeuomorphic. Not glassy. Not soft.
- Use sharp corners by default. Rounded corners only where the kit explicitly defines them.
- Borders and shadows are load-bearing. Do not flatten them away.

## Layering rules

- **Page background:** primary background colour (warm off-white from the kit).
- **All layers above the page:** white.
- Never stack tinted layers. Use whitespace and borders for separation, not tints.

## Strokes

- **Dark stroke** on:
	- All interactive elements (buttons, inputs, dropdowns, toggles, tags)
	- Major page elements (site navigation, tables, cards that frame content)
- **No stroke** on:
	- Inner content within already-bordered containers (avoid double borders)
	- Decorative blocks, dividers handled by spacing instead
- Stroke weight and colour: use the kit's tokens.

## Shadows

- Use the kit's shadow tokens for elevation. Do not invent shadow values.
- Hover state: shadow appears.
- Focus state: focus ring + shadow.
- Pressed state: shadow flattens.

## Spacing

- Use only the kit's spacing tokens. No magic numbers.
- One exception: the tag component uses **negative spacing** to compensate for Plus Jakarta Sans alignment. Preserve this. Do not "fix" it.

## Typography

- **Font:** Plus Jakarta Sans (Google Font). Use only this family.
- Known issue: text is not vertically centred inside small tag components. The kit applies negative spacing as a workaround. Keep this workaround in place for tags.
- Heading and body scale: use kit text styles only.

## Icons

- Use **Flow icons** only. The full library lives in the `Brisk DS/` folder.
- Do not generate or substitute SVGs from other sources.
- If an icon is missing, ask before adding one from elsewhere.
- Current production-stage UI uses the circular seven-stage treatment for Brisk stages: Brief, Script, Shoot, Storyboard, Media, Edit, Masters. Do not use Styleframes, square flow tiles, letter tiles, or generic substitute icons for current stage pickers or progress rows.

## Components

- Always import from the `Brisk DS/` folder. Do not rebuild Button, Input, Card, Modal, Table, etc.
- **Desktop components** are marked `D` in the kit. Use these for Studio surfaces.
- **Mobile components** are marked `M`. Use these for all client-facing flows and for any Studio surface that must remain usable on mobile. Mobile is a first-class target alongside desktop.
- If a component is missing from the kit, ask before creating a local one. Don't silently invent.

## States

Every interactive element must define:

- Default
- Hover (shadow appears)
- Focus (focus ring + shadow)
- Active / pressed (shadow flattens)
- Disabled (reduced contrast, no shadow, no hover)
- Loading (where relevant)

## Empty states

- Always design an empty state. Never ship a blank container.
- Empty state shows: short headline, one-line explanation, one primary action.
- Tone: helpful and direct. British English.

## Locked / plan-gated features

- Show locked features. Do not hide them.
- Use the kit's locked badge or treatment. Tooltip explains the plan required.

## Do

- Use kit tokens for every colour, spacing, radius, shadow, and text style.
- Apply dark strokes to interactive elements and major containers.
- Design desktop and mobile in parallel. Client-facing flows are mobile-first.
- Preserve the tag negative-spacing workaround.
- Use Flow icons only.

## Don't

- Don't introduce new colours, fonts, or shadows outside the kit.
- Don't ship desktop-only client-facing flows. Client surfaces must work on mobile.
- Don't tint background layers above the page background.
- Don't double-border (avoid borders inside already-bordered containers).
- Don't substitute icons from other libraries.
- Don't rebuild any component from scratch if it already exists in `Brisk DS/`.

## British English

- All UI copy and labels in British/Australian English: organise, colour, centre, finalise, analyse, favour.
- Never American spellings.

## Punctuation

- Never use em dashes (—). Use hyphens (-) instead.
```
