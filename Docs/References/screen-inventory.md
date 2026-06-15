# Screen Reference Inventory

This directory holds screenshots that Codex should consult when building features. Each folder follows different trust rules. **Read this file before referencing any screenshot.**

## Trust rules

### `brisk/` — Source of visual truth (and partial design direction)
Screens designed in the new Brisk DS. Use these as the authoritative reference for:
- Visual styling (colours, type, spacing, borders, shadows, asymmetric corners)
- Icon usage (Flow icons only)
- Component appearance and states
- Layout patterns where Brisk versions exist

When in doubt about how something should LOOK in the new product, refer here first.

### `current/` — REFERENCE ONLY (not specification)
Screenshots from the live ChopChop product on the legacy ChopChop DS.

**These show what the existing product does today. They are NOT a specification for what the new prototype should do.** The new Brisk product is being designed; many features will be changed, restructured, combined, or removed.

- **Use as REFERENCE for:** what features exist today, what fields/data are tracked, how flows are structured at a high level, edge cases already encountered, role-based differences
- **DO NOT TRUST for:** visual treatment (legacy ChopChop DS), exact layout (often outdated), exact field set (often bloated with redundancies), whether a feature should exist in v2 at all
- **DO NOT clone these screens directly.** Treat them as input to a design conversation, not as final specs.

### Process when building from a `current/` reference

When asked to build a screen and a `current/` reference exists, Codex must:
1. **Inspect** the referenced screenshot
2. **Propose** a Brisk-DS-styled version: what to keep, what to drop, what to restructure, what to add
3. **List proposed data fields** for any new TypeScript types — keep minimal, ask before adding
4. **Wait for confirmation** before writing any component code

Do not directly translate `current/` screens into code without operator approval of the redesigned version.

---

## How to reference these in Codex prompts

> Build the Active Videos page. Use `Docs/References/current/Active Videos Studio View.png` as a reference for what exists today, but propose a redesigned version using Brisk DS styling from `Docs/References/brisk/Brisk - Video Review.png`. List proposed columns and confirm before writing code.

---

## `brisk/` — Brisk DS references (6 files)

| File | Description |
|------|-------------|
| `Brisk - Comment Client _ Team.png` | Comment thread screen — client and team views |
| `Brisk - Comment component.png` | Comment UI component example (isolated) |
| `Brisk - Comment component 2.png` | Additional comment component states/variants |
| `Brisk - Video Review.png` | Full Video Review screen — comment thread, reactions, timeline markers, client/team toggle |
| `Brisk - Video Review Drawing.png` | Video Review with drawing/annotation overlay |
| `Brisk - Video Review Mobile.png` | Video Review screen, mobile breakpoint |

---

## `current/` — ChopChop Bubble app references (43 files)

**Reminder:** Reference only. Legacy ChopChop visual treatment. Features may change in Brisk.

### Active Videos / Project list
| File | Description |
|------|-------------|
| `Active - Deadline 1.png` | Active Videos, deadline-focused view |
| `Active - Deadline 2.png` | Deadline view, alternate filter/role |
| `Active Video Tags.png` | Tagging system for active videos |
| `Active Videos Studio View.png` | Active Videos table from Studio Owner / Manager perspective |

### Brief workflow
| File | Description |
|------|-------------|
| `Brief summary.png` | Brief overview page |
| `Brief Versions 1.png` | Brief versioning — step/state 1 |
| `Brief Versions 2.png` | Brief versioning — step/state 2 |
| `Brief Versions 3.png` | Brief versioning — step/state 3 |
| `Brief Versions 4.png` | Brief versioning — step/state 4 |
| `Brief_Video Types.png` | Video type selection during brief creation |

### Team / People
| File | Description |
|------|-------------|
| `Assign Team.png` | Team assignment flow — primary view |
| `Assign Team 2.png` | Team assignment — alternate view |
| `Assign Team 3.png` | Team assignment — third view |
| `Filmmaker Jobs 1.png` | Filmmaker job dashboard — view 1 |
| `Filmmaker Jobs 2.png` | Filmmaker job dashboard — view 2 |
| `Filmmaker Jobs 3.png` | Filmmaker job dashboard — view 3 |
| `Filmmaker Jobs 4.png` | Filmmaker job dashboard — view 4 |
| `People 1.png` | People management — list view |
| `People Actives 3.png` | Active people list |
| `People Capacity 2.png` | People capacity / availability view |
| `People Logged.png` | Logged time per person |

### Production / Planning
| File | Description |
|------|-------------|
| `Shoot Planner 1.png` | Shoot planning — view 1 |
| `Shoot Planner 2.png` | Shoot planning — view 2 |
| `Shoot Planner 3.png` | Shoot planning — view 3 |
| `Shoot Planner 4.png` | Shoot planning — view 4 |
| `Shoot Planner 5.png` | Shoot planning — view 5 |
| `Script.png` | Script writing / review |
| `Media Library.png` | Media library |

### Time tracking
| File | Description |
|------|-------------|
| `Log hours.png` | Hours logging |
| `Log hours 2.png` | Hours logging — alternate view |

### Communication
| File | Description |
|------|-------------|
| `Chat.png` | Internal chat |
| `Chat Customer View.png` | Chat from customer/client perspective |
| `Chat Groups.png` | Group chat / channels |
| `Notifications.png` | Notifications |

### Sharing
| File | Description |
|------|-------------|
| `Share - Copy Link.png` | Share via copy link flow |
| `Share buttons.png` | Share button UI/states |
| `Sjhare - Studio View.png` | ⚠️ Filename typo — should be `Share - Studio View.png`. Studio-side share screen. |

### Customers / Membership
| File | Description |
|------|-------------|
| `Client queue.png` | Customer-facing queue of pending items |
| `Customer Empty State.png` | Customer-facing empty state |
| `Invite Customer View 1.png` | Customer invitation flow — view 1 |
| `Invite Customer View 2.png` | Customer invitation flow — view 2 |
| `Membership 1.png` | Membership / subscription — view 1 |
| `Membership 2.png` | Membership / subscription — view 2 |

---

## Things to verify when you have time

- `Brisk - Comment component` vs `Brisk - Comment component 2` — what's the distinction (different states, variants, sizes)?
- `Brief Versions 1–4` — sequential steps in a flow, or four different states of the same screen?
- `Active - Deadline 1` vs `Active - Deadline 2` — different roles, different filters, or iterations?
- `Filmmaker Jobs 1–4` — confirm these are four distinct screens, not iterations
- `Shoot Planner 1–5` — confirm five distinct screens

## When new screens are added
1. Drop the file into `brisk/` or `current/`
2. Add a row to the appropriate table above
3. Commit + push