# Brisk DS — Color Tokens

Always use named token variables. Never hardcode hex values. Prefer semantic tokens; use palette tokens only as a last resort (notify operator first).

---

## Borders

| Token | Use |
|---|---|
| `--border/primary` | Standard 1px black border on all active/resting enclosing edges |
| `--border/secondary` | Disabled state only — never on active or resting edges |
| `--border/elevated` | Never use on neo-brutalism surfaces — use `--border/primary` instead |
| `--border/focus-state` | Focus ring inner stroke (#91baff) — only inside `d-Focus state` instance |

---

## Brand

| Token | Use |
|---|---|
| `--brand/primary` | Primary button fill at rest |
| `--brand/primary-hover` | Primary button hover |
| `--brand/primary-click` | Primary button pressed |
| `--brand/secondary` | Tertiary button fill at rest |
| `--brand/secondary-hover` | Hover tint: Secondary, Tertiary, Ghost buttons + Input hover |
| `--brand/secondary-click` | Pressed: Secondary, Tertiary, Ghost buttons |

---

## Page backgrounds

| Token | Use |
|---|---|
| `--bg-page/primary` | Bottom canvas layer ONLY (warm beige). Never on sidebars, cards, modals, or panels — those use white. |
| `--bg-page/secondary` | Secondary canvas layer |
| `--bg-page/tertiary` | Tertiary canvas layer |

---

## Block & elevated backgrounds

| Token | Use |
|---|---|
| `--bg-block/primary` | Section / panel background |
| `--bg-block/secondary` | Secondary section/panel |
| `--bg-block/dim` | Dimmed / overlaid surface |
| `--bg-elevated-block/primary` | Card, popover, modal background |
| `--bg-elevated-block/secondary` | Secondary elevated surface |
| `--bg-elevated-block/dark` | Dark elevated surface |

---

## Item surfaces (interactive fills)

`--item/primary` (white — Input field, Secondary button at rest) · `--item/secondary` · `--item/tertiary` · `--item/hover` · `--item/click` · `--item/dark-primary` (also Shoot flow accent) · `--item/dark-secondary` · `--item/dark-tertiary` · `--item/dark-transparent` · `--item/progress` (track) · `--item/progress-filled` · `--item/white-on-color`

---

## Disabled

| Token | Use |
|---|---|
| `--disabled/primary` | Disabled buttons |
| `--disabled/tertiary` | Disabled inputs, chips, light controls |
| `--disabled/border` | Disabled Input / Chip stroke |

---

## Extra palette (accents & flow colors)

Each hue has primary (saturated) / secondary (mid) / tertiary (lightest) tiers.

| Token | Flow association |
|---|---|
| `--extra/stars` | Brief flow (warm yellow) |
| `--extra/lime-*` | Script flow |
| `--extra/cyanic-*` | Media flow |
| `--extra/pink-*` | Edits flow |
| `--extra/purple-*` | Masters flow + Input Typing glow |

---

## System

`--system/error` · `--system/success` · `--system/warning` · `--system/info` · `--system/neutral`

---

## Button danger

`--btn/danger` (error fill at rest) · `--btn/danger-hover` · `--btn/danger-click` · `--btn/danger-secondary-hover` · `--btn/danger-secondary-click` (also Storyboard flow accent) · `--btn/inverse-hover`

---

## Text & icons

`--text/primary` (body) · `--text/secondary` (secondary labels) · `--text/tertiary` (placeholder) · `--text/title` (UI labels, button text) · `--text/white` (on dark fills) · `--text/white-on-color` (on colored fills) · `--link/primary`

`--icon/primary` · `--icon/white` (on colored fills) · `--icon/info` (decorative)

`--illustration/bg/black/light/shadow-dark/shadow-middle/shadow-light/stroke` — within `i-Illust/*` only. Exception: `--illustration/shadow-dark` = Styleframes flow accent.

`--gray/100` — shadow base color for `--box-shadow/elevated/m` and `/s`

---

## Palette tokens — last resort only

Notify the operator before using any palette token. State which token, why no semantic token fits, and where it will be applied.

`--gray` 5–100: `5:#F8F9FA` `10:#EEF1F4` `20:#CDD5DE` `30:#ABBBC9` `40:#8FA0AF` `50:#778592` `60:#616C76` `70:#4A545C` `80:#353C43` `90:#21262B` `95:#181C20` `100:#0E1114`

`--blue` 5–100: `5:#F6FAFE` `10:#E8F2FE` `20:#C0D5FF` `30:#91BAFF` `40:#53A0FF` `50:#0086EA` `60:#0D6CBD` `70:#0F5493` `80:#0C3C6C` `90:#062647` `95:#041C39` `100:#021125`

`--purple` 5–100: `5:#FBF9FF` `10:#F3EEFF` `20:#DCCDFF` `30:#C6ABFF` `40:#B187FF` `50:#9F60FF` `60:#8B2CFF` `70:#6625CD` `80:#5300A1` `90:#340768` `100:#1B003C`

`--red` 5–100: `5:#FFF8F8` `10:#FFECED` `20:#FFC6C8` `30:#FF9EA2` `40:#FF7071` `50:#FE2836` `60:#D60428` `70:#A80817` `80:#7B0515` `90:#520401` `100:#2B0104`

`--green` 10–100: `10:#C6FED0` `20:#5EEF88` `30:#2CD463` `40:#24B553` `50:#1D9745` `60:#157B2F` `70:#0E601F` `80:#04460B` `90:#002D01` `100:#001503`

`--yellow` 5–100: `5:#FFFAF0` `10:#FFEFD4` `20:#FDCE5D` `30:#E5B13A` `40:#C89600` `50:#A77D00` `60:#896500` `70:#684F07` `80:#49390A` `90:#2F2404` `100:#171001`

`--orange` 10–100: `10:#FFEEE1` `20:#FFCA9C` `30:#FDA465` `40:#F77B28` `50:#D7601D` `60:#B64804` `70:#893C00` `80:#622C00` `90:#3D1D02` `100:#1D0D00`

`--lime` 10–100: `10:#D5FDB9` `20:#A6E74D` `30:#93C933` `40:#81AC00` `50:#6B8F00` `60:#5D7300` `70:#495900` `80:#344000` `90:#1F2900` `100:#0D1300`

`--cyan` 10–100: `10:#D2F7FF` `20:#6DE5FA` `30:#00CBE0` `40:#00AEBF` `50:#0091A2` `60:#007682` `70:#145B64` `80:#064249` `90:#022A30` `100:#001417`

`--pink` 10–100: `10:#FFECF3` `20:#FEC5DD` `30:#FD9AC8` `40:#FD68B5` `50:#F716A2` `60:#CA0F83` `70:#9B146C` `80:#75054B` `90:#4E0133` `100:#270317`

`--white/100` #FFFFFF · `--black/100` #000000

Opacity variants: `--opacity/black-100-*` (16/40/48/56/72/80%) · `--opacity/white-100-*` (4/8/12/16/24/40/48/56%) · `--opacity/blue-50-*` and `--opacity/purple-40-*` (8/16/24/32%) · `--opacity/red/green/gray/yellow-40-16%` · `--overlay/dark` (modal backdrop)
