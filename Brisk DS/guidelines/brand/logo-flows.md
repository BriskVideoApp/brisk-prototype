# Brisk DS — Logo & Flow Icons

---

## Brisk Logo & Logomark

**Section node:** `4424:68043` ("Brisk Logo") in DS file `5528Fqe3Kq0aQCDpjzQ74d`

| Component | Node ID | Key | Size |
|---|---|---|---|
| `Logo` | `4424:67782` | `6e96381ebdb61c6ec91b7b7315d67bba1bcb6d11` | 180 x 56 px |
| `Logomark` | `4424:67787` | `f9c0ab6d0cefd4f03636771a03fb03dad403ebc0` | 24 x 16 px |

**Fills:**
- `Logo` — complex/non-solid fill. Do not attempt to read or override it.
- `Logomark` — GRADIENT_LINEAR from `#5FAEE7` (position 0) to `#000000` (position 1), ~41% vertical scale.

**When to use which:**
- `Logo` — full wordmark: headers, splash screens, auth screens, marketing sections
- `Logomark` — compact/icon-only: tight nav slots, small badges, favicon contexts

**Usage rules:**
- Always insert as an instance — never draw or substitute a custom logo shape.
- Do not override fills, size, or opacity on either instance.
- Neither component has variants — there is no dark/light/inverse switch. If an inverse version is needed, stop and report per the Missing Asset Protocol in `overview.md`.

---

## Flow icons

**Component:** `Flow icons` COMPONENT_SET, node `4408:103175` in DS file `5528Fqe3Kq0aQCDpjzQ74d`

**Rule:** If a design must visually identify a specific Brisk production flow, use the correct `Flow icons` instance. Never substitute another icon, emoji, custom badge, or label. If flow identification is not needed, skip the component.

| Flow | Variant | Color token | Description |
|---|---|---|---|
| Brief | `Flow=Brief` | `--extra/stars` | Client goals, audience, tone, deliverables. Approval unlocks next stage. |
| Script | `Flow=Script` | `--extra/lime-secondary` | Blueprint for video narrative. Locked after brief approval. |
| Styleframes | `Flow=Styleframes` | `--illustration/shadow-dark` | Animation-only. Visual language lock: typography, color, illustration style. |
| Storyboard | `Flow=Storyboard` | `--btn/danger-secondary-click` | Animation-only. Scene-by-scene visual plan before animation begins. |
| Media | `Flow=Media` | `--extra/cyanic-secondary` | All raw ingredients: footage, brand assets, references. |
| Shoot | `Flow=Shoot` | `--item/dark-primary` | When new filming is required. Plans crew, location, schedule. |
| Edits | `Flow=Edits` | `--extra/pink-secondary` | Video construction: story, pacing, music, graphics, polish. |
| Masters | `Flow=Masters` | `--extra/purple-secondary` | Final delivery: exports, QC checks, captions. Approval = project complete. |

**Size usage:**
- S → tab labels, inline flow references
- M → card headers, row identifiers
- L → hero / prominent flow identification

**State usage:**
- `Edited=Yes + Status=true` → flow started or complete
- `Edited=No` → flow not started (~50% opacity)

**Exact variant name spellings** (do not abbreviate or alter):
- "Edit" → `Flow=Edits`
- "Style Frames" → `Flow=Styleframes`
- "Master" → `Flow=Masters`

**What NOT to do:**
- Never hardcode hex for the accent color — use the token listed in the table above.
- Never override the icon fill directly on the instance.
- Never use a generic icon (e.g. `i-Icon/Play`) to represent a flow — always use `Flow icons`.
