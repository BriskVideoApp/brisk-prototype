# Brisk DS — Icon Discovery & Usage

All icons live on the **"Icons & Logos & Images"** page of DS file `5528Fqe3Kq0aQCDpjzQ74d`. Always use as instances — never draw custom shapes, import outside icons, or create inline SVGs.

---

## Icon catalog

| Prefix | Count | Notes |
|---|---|---|
| `i-Icon/[Name] (swap)` | 1,064 | Phosphor Icons 1.4 Regular, PascalCase names. Browse at phosphoricons.com. |
| `i-Logo/[brand]` | 257 | Brand/product logos |
| `i-Flag` | — | `Country=[ISO code]` variant property |
| `i-Payment method` | — | Payment method logos |
| `i-Illust/[name]` | 6 | Empty states / error illustrations only |
| `i-Pictogram/[name]` | 3 | File, Inbox, Move to inbox |

---

## Usage rules

- Do NOT guess icon names. Phosphor Icons uses PascalCase — verify the exact name at phosphoricons.com before inserting.
- Icons inherit text color via `currentColor` — do not manually set icon fills.
- `i-Illust/*` instances are for empty states and error screens only — never apply `--illustration/*` color tokens to product UI surfaces.
- `i-Pictogram/*` instances are for the three listed contexts only.
- Never substitute a brand logo with a custom-drawn shape — always use `i-Logo/[brand]` instances.

---

## Finding an icon

1. Go to the "Icons & Logos & Images" page in DS file `5528Fqe3Kq0aQCDpjzQ74d`.
2. Find the `i-Icon/[Name]` component matching the Phosphor Icon name.
3. Insert as an instance and swap to the needed icon via the swap slot.
4. If the needed icon does not exist in the DS, stop and report per the missing asset protocol in `overview.md`.
