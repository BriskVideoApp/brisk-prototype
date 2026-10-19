# React toggles

Use `Toggle` from `Brisk DS/src/app/components/Toggle.tsx` for approved immediate on/off settings. Tom chose the Single standard size proposal and retained DS blue keyboard focus on 19 October 2026 after reviewing the shadow-only alternative.

## Geometry and appearance

- One 42 x 22px track with a 16px thumb. These dimensions retain the existing Chat control; they are not claimed as Yura's original S/M/L specifications.
- Minimum 44px-high clickable row, and a minimum 44px width when there is no label. The native input covers the row. Label content appears before the track, matching Chat's existing layout.
- Existing semantic tokens supply the white resting surface, dark border, purple selected state, hard hover shadow, blue keyboard-focus outline with hard shadow and flattened pressed shadow.
- Disabled tracks use the existing muted fill/border tokens rather than fading the whole control. Thumb position still distinguishes disabled on from disabled off. Disabled controls have no hover/focus shadow, and labels use the shared disabled text token.
- Consumer classes are for row layout only. Do not resize/restyle the track or thumb. This implementation does not add a second size or a new icon asset.

## Native behaviour

The component is a stateless native checkbox with `role="switch"`. It accepts native input attributes/events/refs except type, role, numeric size and children, which belong to the component. `onChange` receives the original native React event. Controlled `checked` and uncontrolled `defaultChecked`, disabled values, names/values, form participation, ids, ARIA descriptions and native refs are retained. A ref points at the actual input.

Supply non-interactive descriptive `label` content or a native accessible name such as `aria-label`. Never nest Toggle inside another label or put interactive controls in its label. `wrapperClassName` styles the outer row; `className` applies to the native input.

Space, pointer activation and tab navigation remain native. No Enter shortcut, mixed state, internal application state, value transformation or persistence is added. Keep the caller's callback, saved value, disabled condition and immediate-update semantics.

## Chat pilot

Project External Chat settings use Toggle for WhatsApp and Slack's Use for this project controls. The existing reconnect restriction, enabled flags, labels and handlers remain. Turning off a preferred connector still selects Brisk as the default route. Changes remain immediate; closing the settings dialog with Cancel does not undo them, matching existing behaviour. Configuration controls, mapping saves, route radios, messages, send logic and persistence are unchanged.

Use Checkbox for choices that take effect only after Save. Other specialised controls and access/notification preferences were not converted in this pilot. Actual external integrations remain out of scope for this front-end prototype.
