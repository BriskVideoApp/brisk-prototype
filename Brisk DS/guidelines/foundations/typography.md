# Brisk DS — Typography

**Font: Plus Jakarta Sans only.** Always use a named DS text style. Never set raw font size, weight, or line height directly.

Never use styles with the `.For DS description/` prefix — those are DS-internal only.

---

## Paragraph & Label

Paragraph (prose, body copy) and Label (UI element labels, table cells, captions) share identical specs. Apply the semantically correct prefix for context.

| Suffix | px | Line-height | Regular | SemiBold |
|---|---|---|---|---|
| XS | 12 | 16 | `Paragraph/XS` · `Label/XS` | `Paragraph/XS-semibold` · `Label/XS-semibold` |
| S | 14 | 20 | `Paragraph/S` · `Label/S` | `Paragraph/S-semibold` · `Label/S-semibold` |
| M | 16 | 24 | `Paragraph/M` · `Label/M` | `Paragraph/M-semibold` · `Label/M-semibold` |
| L | 20 | 32 | `Paragraph/L` · `Label/L` | `Paragraph/L-semibold` · `Label/L-semibold` |
| XL | 24 | 36 | `Paragraph/XL` · `Label/XL` | `Paragraph/XL-semibold` · `Label/XL-semibold` |

**When to use each prefix:**
- `Paragraph/*` — running text, descriptions, body copy, prose blocks
- `Label/*` — button text, input labels, table cell content, captions, form field hints

---

## Headings

All Heading styles are Bold. Use for section titles, page headers, modal titles, card headings.

| Style | px | Line-height | | Style | px | Line-height |
|---|---|---|---|---|---|---|
| `Headings/3XS-bold` | 14 | 20 | | `Headings/L-bold` | 40 | 48 |
| `Headings/2XS-bold` | 16 | 24 | | `Headings/XL-bold` | 48 | 56 |
| `Headings/XS-bold` | 20 | 28 | | `Headings/2XL-bold` | 56 | 64 |
| `Headings/S-bold` | 24 | 32 | | `Headings/3XL-bold` | 64 | 72 |
| `Headings/M-bold` | 32 | 40 | | `Headings/4XL-bold` | 80 | 88 |

---

## Decision: which size to use

- **Page title / hero header** → `Headings/XL-bold` or `Headings/2XL-bold`
- **Section title** → `Headings/S-bold` or `Headings/M-bold`
- **Card/modal title** → `Headings/XS-bold` or `Headings/S-bold`
- **UI label, button** → `Label/S-semibold` or `Label/M-semibold`
- **Body copy, descriptions** → `Paragraph/M` or `Paragraph/S`
- **Caption, hint text, secondary info** → `Label/XS` or `Paragraph/XS`
