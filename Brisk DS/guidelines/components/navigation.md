# Brisk DS — Navigation Components

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
