# Brisk Design System Skill

You are designing screens for **Brisk**, a multi-tenant SaaS platform for video production teams. Apply the rules below to every component, layout, and screen you generate. These rules override generic design defaults.

## Current authority

Follow `AGENTS.md` for the three prototype access roles, front-end-only scope and precedence of explicit approved decisions. Preserve this branch's adaptable production flow and current icon mapping. Older Notion exports, five-role examples and archived assets do not override these rules.

Read the [approved desktop design baseline](Docs/desktop-design-baseline.md) before an audit or desktop UI change. It indexes recent approvals, distinguishes DS primitives from app-level compositions, and identifies unresolved patterns. It does not certify every existing consumer or claim that the Figma source is synchronised.

Tom's approved sequence is desktop first: fix and sign off the full desktop UI before the mobile design pass. Default visual reviews, implementation and verification to desktop, including Client-facing screens. Defer mobile-only work and routine mobile checks unless explicitly requested; preserve existing responsive behaviour. See Current design sequence in `AGENTS.md`.

## Visual language: Neo-brutalism

- Style is neo-brutalism: clean, confident, slightly raw. Not skeuomorphic. Not glassy. Not soft.
- Use sharp corners by default. Rounded corners only where the kit explicitly defines them.
- Borders and shadows are load-bearing. Do not flatten them away.

## Layering rules

- **Page background:** primary background colour (warm off-white from the kit).
- **All layers above the page:** white.
- **Approved desktop navigation exception:** Tom approved a very pale neutral-grey background for the hybrid left sidebar on 20 October 2026. Use `--brisk-bg-block-secondary` in expanded and collapsed navigation, including settings and all three role views. Keep the top bar and content surfaces white, and retain existing lavender selection, hover and focus states. This is not permission to tint other panels or introduce a dark sidebar.
- Never stack tinted layers. Use whitespace and borders for separation, not tints.

## Strokes

- **Dark stroke** on:
	- All interactive elements (buttons, inputs, dropdowns, toggles, tags)
	- Major page elements (site navigation, tables, cards that frame content)
- **No stroke** on:
	- Inner content within already-bordered containers (avoid double borders)
	- Decorative blocks, dividers handled by spacing instead
- Stroke weight and colour: use the kit's tokens.
- Component-specific approved variants take precedence over these general stroke rules: quiet Buttons, IconButtons and text-first menu rows are intentionally unframed at rest. Do not add borders to make them conform to a generic rule.

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

### Workspace page headers

Tom approved a shared header for Videos, To Do, People, Clients, Media Library, Expenses and Brand Kits on 20 October 2026. Use the app-level `WorkspacePageHeader` composition with DS `Headings/M-bold` (32px/40px), 24px vertical and 32px horizontal desktop padding, a white surface and a primary bottom border. Page controls sit on the right and may wrap when space is constrained. Keep filters and tabs below the header. Supporting text is omitted except for To Do's date, shown below its title. Do not apply this workspace standard to project, profile, section or dialog headings.

The latest scoped placement puts People/Clients search in the header and Invite person/Add Client to the right of the filter row below. The global Media Library header likewise contains search, never a Studio-wide Download all. Scoped Client/project downloads stay with the location's media controls. See the baseline for preserved workflows and exclusions; these are app compositions, not a new DS Search component.

### Terminology
- "Stage icons" = the adaptable workflow icons (Brief, Script, Shoot, Storyboard, Edit or Animation, Masters). Media uses the same circular treatment but stays pinned outside the reorderable flow. Rendered exclusively by StageChip.
- "DS icons" (or "General UI icons") = everything else. Imported via the DsIcon component.
- Do NOT use the term "Flow icons" - it was legacy shorthand that caused confusion between the two categories. If someone (human or AI) refers to Flow icons, ask them to clarify which of the two above they mean.

## Type rendering

- Do NOT set `text-rendering: geometricPrecision` anywhere.
- Do NOT set `-webkit-font-smoothing` or `-moz-osx-font-smoothing` anywhere.
- Leave all text rendering at browser defaults. Plus Jakarta Sans is designed for default subpixel antialiasing and looks harsh and thin under `antialiased` or `grayscale`.
- If the app's type ever looks thin or grey compared to the DS reference, the first place to check is font-smoothing overrides.

## Icons

Brisk uses two icon categories. Do not mix them.

### Stage icons (Brief, Script, Shoot, Storyboard, Edit or Animation, Masters, plus pinned Media)
These are the workflow progress icons rendered on Active Videos and any other stage-progress surface.

- Rendered by the `StageChip` component in `src/components/active-videos/ActiveVideosPage.tsx`.
- Glyphs come through `DsIcon`, which maps icon names to SVGs in `/public/brisk-icons/`.
- Current stage-to-SVG mapping:
  - Brief - `/public/brisk-icons/clipboard-text.svg`
  - Script - `/public/brisk-icons/pen-nib.svg`
  - Shoot - `/public/brisk-icons/video-camera-ds.svg`
  - Storyboard - `/public/brisk-icons/grid-four.svg`
  - Media - `/public/brisk-icons/image-square.svg`
  - Edit - `/public/brisk-icons/scissors.svg`
  - Animation - `/public/brisk-icons/paint-brush.svg`
  - Masters - `/public/brisk-icons/film-strip.svg`
- State variants (drive the circle colour and fill):
  - `not_started` - grey outline, no fill
  - `in_progress` - green filled
  - `waiting` - coloured filled (orange, pink, etc depending on waiting reason)
  - `done` - green filled with tick or completed treatment
- **Do NOT use the legacy SVGs previously in `Brisk Visuals/Flow icons/`.** Those have been archived and must not be referenced by any new code.
- When adding a new stage or a new state, extend `StageChip` and the `/public/brisk-icons/` set. Do not import SVGs from `Brisk Visuals/`.

### General UI icons
All non-stage UI icons (arrows, plus, close, chat, comment, search, etc.):

- Use the approved icon assets exposed by `<DsIcon />` in `src/components/video-review/DsIcon.tsx`, which maps names to SVGs under `/public/brisk-icons/`.
- Import via `<DsIcon />` by name. Never inline SVG paths or reference asset paths directly when constructing general UI.
- Default size: 16px in dense surfaces, 20px in headers, 24px only for hero moments.
- Default colour: `--gray-60` for passive, `--gray-90` for active, `--brand-primary` only inside primary buttons.
- Banned: Lucide, Heroicons, Feather, Font Awesome, Material Icons, Unicode glyphs, emoji-as-icon. Emoji are allowed in user-generated content only.
- If the DS doesn't have the icon you need, raise a request in `Docs/yura-review.md` and use text until it exists.

## Components

- Always import from the `Brisk DS/` folder. Do not rebuild Button, Input, Card, Modal, Table, etc.
- **Desktop components** are marked `D` in the kit. Use these for Studio surfaces.
- Mobile component selection and layout work are deferred to the later mobile pass. Do not assume that a separate mobile component exists; follow the missing-asset protocol when one is needed.
- If a component is missing from the kit, ask before creating a local one. Don't silently invent.

## States

For the requested feature, include the applicable interaction states below. Do not use this list to add unrelated flows beyond the ticket:

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
- Fix and verify desktop UI first. Review mobile after the full design is signed off, unless explicitly requested earlier.
- Preserve the tag negative-spacing workaround.
- Use `StageChip` for stage icons and `DsIcon` for general UI. Never use archived Flow icons or substitute third-party icons.

## Don't

- Don't introduce new colours, fonts, or shadows outside the kit.
- Don't turn the current desktop sign-off work into a parallel mobile redesign. Preserve existing responsive code and functionality.
- Don't tint background layers above the page background, except for the explicitly approved hybrid desktop sidebar treatment above.
- Don't double-border (avoid borders inside already-bordered containers).
- Don't substitute icons from other libraries.
- Don't rebuild any component from scratch if it already exists in `Brisk DS/`.

## British English

- All UI copy and labels in British/Australian English: organise, colour, centre, finalise, analyse, favour.
- Never American spellings.

## Punctuation

- Never use em dashes. Use hyphens instead.

## Reference examples

These references illustrate specific patterns, not blanket approval of every element on a page. Use them only where they agree with the latest explicit approvals and component guidance. Older screenshot layout, placement and typography are superseded by the scoped desktop baseline above. The forthcoming audit must verify current live consumers rather than treating these references as a completed sign-off.

### Active Videos

![Active Videos overview](Docs/References/brisk/Brisk%20-%20active-videos-overview.png)
![Active Videos sidebar and row rhythm](Docs/References/brisk/Brisk%20-%20active-videos-sidebar.png)
![Active Videos status pills](Docs/References/brisk/Brisk%20-%20active-videos-status-pills.png)

Use as the reference for:
- Row rhythm and hairline weight (single hairline in `--gray-10`, no card outlines around list items).
- Header hierarchy: title and scoped search above filters. The older top-right role-toggle placement is superseded by the desktop sidebar Test mode control; see the approved hybrid baseline.
- Status pill treatment (soft pill shape, `--brand-secondary` background, `--gray-90` text, no border).
- Progress icon system (coloured filled circle when active, grey outline when inactive, dashed connector line between).
- The older 32px Semibold h1 and Regular filter-label notes are superseded: workspace titles use DS `Headings/M-bold` (32px/40px), and migrated filters use the shared quiet-choice typography. Row styles remain contextual and subject to audit; do not infer a new text style from screenshot measurements.

### Video Review

![Video Review overview](Docs/References/brisk/Brisk%20-%20video-review-overview.png)
![Video Review comment panel](Docs/References/brisk/Brisk%20-%20video-review-comment-panel.png)

Use as the reference for:
- Header CTA hierarchy on detail pages (two secondary buttons plus one primary purple - never two primaries).
- Comment component: composer, thread, filters (All / Unresolved / Team / Client), reactions, reply, resolve, mention, edit, delete.
- Internal vs external comment card colours (external = soft cream, internal = soft lavender, Overall pill treatment).
- Presence avatar cluster.
- Dark player + light rail contrast pattern for any media-first surface (V2, not V1).

### Today

![Today summary strip](Docs/References/brisk/Brisk%20-%20today-summary-strip.png)
![Today empty state](Docs/References/brisk/Brisk%20-%20today-empty-state.png)

Use as the reference for:
- Summary strip / footer bar treatment (single line, muted, no button chrome, colour only when a value is out of range).
- Empty state pattern.
- Card and hairline spacing for personal-productivity surfaces.

### How to use these references

Before building a new surface:
1. Open the reference page in the running prototype.
2. Screenshot the relevant pattern.
3. Describe the styling rules back to yourself (or Codex) in one paragraph.
4. Match those rules first. Only invent new patterns if none of the references apply.

If a reference component isn't cleanly extractable from its source page, raise a ticket to isolate it before starting a new surface. Do not copy-paste and fork.
