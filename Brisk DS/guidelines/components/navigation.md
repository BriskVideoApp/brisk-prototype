# Brisk DS — Navigation Components

## Approved React app composition - 20 October 2026

The [desktop baseline](../../../Docs/desktop-design-baseline.md) records Tom's approved hybrid shell: left workspace navigation with top collapse control, account above permitted Studio settings, quiet Test mode below, history controls top-left, and Chat / Updates / Ask Brisk top-right. Use the existing `HybridSidebar`, `AppShell`, DS Buttons/IconButtons and approved icon assets. Preserve role-specific destinations and the circular project progress row.

This is an approved app-level composition, not confirmation of new `d-Header` or `d-Side menu` variants in Figma. The original-kit descriptions below remain Figma guidance; their absolute custom-frame prohibitions do not revoke this scoped React composition. Do not rebuild the shell or restore the former two-row navigation solely to match an older example. Other missing navigation components still require the missing-asset protocol.

---

## d-Header

Top-level global header. Present on every desktop page. Contains the Brisk Logo (or Logomark in compact mode), primary navigation links, and global actions. Never create a custom header frame — always use the `d-Header` instance.

---

## d-Subheader

Secondary header below `d-Header`. Use for contextual page-level actions, page title, and breadcrumbs. Not required on every page — use only when a page needs a defined sub-navigation band.

---

## d-Side menu

**Variants:** Side (Left / Right) · Expanded (bool)

Use for primary or secondary sidebar navigation.

- Side=Left → primary navigation (most common)
- Side=Right → secondary/contextual panel navigation
- Expanded=true → full labels visible
- Expanded=false → icon-only collapsed state

Never create a custom sidebar frame. Always use `d-Side menu`.

---

## d-Footer

Use at the bottom of full-page layouts. Contains secondary links, legal text, and supplemental navigation. Never create a custom footer frame.

---

## d-Tabs

**Variants:** Size · Mixed radius (sharp corner on the edge meeting the content block)

Use for switching between content panels at the same page level. Do not use Tabs for top-level page navigation — that belongs to `d-Side menu` or `d-Header`.

**Radius rule:** The tab container corners that abut the content panel below are `radius/none`. The outer top corners are `radius/xs`.

For Tom's approved Quiet by purpose React extension and the scoped Overview/People pilot, see [Quiet filters and content tabs](quiet-choices.md). Its underlined treatment is an explicit approved alternative, not a reinterpretation of the attached-panel geometry above.

---

## d-Breadcrumbs

Use to show the user's location in a hierarchy deeper than 2 levels. Do not show breadcrumbs on top-level pages. Always combine with `d-Subheader` when used.

---

## d-Pagination

Use when a dataset spans multiple pages and the user needs explicit page control. Prefer infinite scroll or load-more patterns for feeds; use Pagination for tables and structured lists.

---

## d-Pagination dots

Use for carousel or slideshow-style content where the total count is small (≤10 items) and page labels are not needed.

---

## d-Progress steps

Use for multi-step flows (wizards, onboarding, checkout) to show which step the user is on and how many remain. Do not use for status tracking — use `d-Progress status` instead.

---

## d-Scrollbar

Apply to scrollable containers that need a visible scrollbar indicator. Never draw a custom scrollbar shape.
