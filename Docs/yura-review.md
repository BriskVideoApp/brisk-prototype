# Yura Review Log

## Script AI panel prototype

Added prototype components under `src/components/script-ai/`:

- `ScriptAiPanel`
- `SourcesControl`
- local typed models for AI sources, messages, inferred intents, and insert requests

Notes for DS review:

- The chat-first AI panel uses local prototype markup styled with Brisk tokens because this repo does not currently expose React DS components for draggable floating panels, chat thread rows, compact source popovers, or file-upload controls.
- Sources sit behind a single `+ Sources (n)` chip. The popover lists attached sources with remove actions, and `Add source` is mocked as an uploaded-source chip.
- Message actions use inline Insert and Copy text actions until a shared chat action pattern exists.
- The minimised state remains a visible strip with sources, per the Script tab spec. This should become a DS panel-minimised treatment if that pattern is standardised.
- Insert behaviour is prototype-only: selected text is replaced, whole-script generation creates a new script version, visual suggestions update the active row's visual field, and paper edit rows insert beneath the active row.

## Share controls prototype

Added prototype components under `src/components/share/`:

- `ShareActionRow`
- `ShareOptionSection`
- `ShareRadioOption`
- `RequestReviewModal`

Notes for DS review:

- The share controls use local prototype markup styled with Brisk tokens because this repo does not currently expose React `d-Button`, `d-Popover`, `d-Radio list`, `d-Tooltip`, or `d-Notification toast` components.
- Button hierarchy follows the latest review note: Copy Link as tertiary, Request Review as secondary, and Approve as the primary filled action.
- The Copy Link popover keeps the screenshot layout while using Brisk tokenised borders, radius, and hard elevation instead of the softer Figma shadow.
- The radio rows are fully clickable and use local radio styling until the DS radio list is available as a React component.
- `Video only` is available only on Edit and Masters, and forces Access to `View only`.
- Share-link viewers see Approve disabled with the tooltip copy `Sign in to approve`.
- The Request Review modal reuses the Share controls border, radius, and elevation treatment. It is local prototype markup until React DS exports exist for `d-Modal`, `d-Select`, `d-Radio list`, `d-Text area`, and `d-Notification toast`.

## Today tab prototype

Added prototype components under `src/components/today/`:

- `TodayPage`
- `TodaySidebar`
- `TodayHeader`
- `ProjectRail`
- `ProjectCard`
- `WeekGrid`
- `DayColumn`
- `TimeBlock`
- `TimeEntryEditor`
- `TodayUnavailable`
- `StageFlowIcon`

Notes for DS review:

- The repo currently exposes Brisk icon primitives and exported Flow SVG assets, but not React `Button`, `Input`, `Card`, or `Popover` components. Today uses local prototype markup styled with Brisk tokens and should be swapped to DS components once those React exports are available.
- The Today stage picker now uses the current circular seven-stage treatment: Brief, Script, Shoot, Storyboard, Media, Edit, Masters. It intentionally avoids the older square Flow SVG exports and Styleframes.
- The Today sidebar is a local prototype surface. A shared app shell and true `d-Side menu` implementation should replace it in a later pass.
- Time blocks use native HTML5 drag-and-drop and pointer resizing for V1. If mobile/touch drag becomes required, confirm whether a DS drag treatment or approved library should be used.

## Project Team panel

Updated prototype components under `src/components/project/team/`:

- `TeamPanel`
- `RoleRow`
- `RoleEditorModal`
- `AddRoleButton`
- `InvitationList`
- `StaffPill`
- `FreelancePill`

Notes for DS review:

- The panel uses Brisk tokens and local prototype markup because this repo does not currently expose React DS exports for Button, Input, Modal, Avatar, or Table.
- The Team panel is now a casting tool only: role, person, invitations, and one manually-entered hour total per role. Logged hours and remaining hours live on the Today tab.
- Stage ownership is still stored for Today tab cards, but role hours are edited as one total and distributed across covered stages under the hood.
- The role visibility model now supports Producer/Admin, Studio Staff, Studio Freelancer, and Customer. Customer hides the panel.
- Role values are stored as lower camel case data keys, with British English preserved in both data and UI labels, for example `colourist` and "Colourist".
- Default role staging follows the approved V1 mapping: Producer owns Brief, Script, Masters; Editor owns Media and Edit; Shooter owns Shoot; Motion Designer owns Storyboard and Edit for animation projects. Role hours are no longer generated from video length/type templates.
- `RoleSlot` and `Invitation` replace the deprecated one-person role assignment model. Pending freelance invitations can include any number of candidates, with first acceptance auto-declining the rest.
- Role rows now open one `RoleEditorModal` for assigning, reassigning, editing stages covered, withdrawing invitations, viewing invitation history, and removing the role. The row overflow menu and separate stage/person modals are removed from the panel surface.
- The role editor now uses progressive disclosure: role hours and stage coverage are compact at the top, stage checkboxes are collapsed behind `Edit`, and people are split behind a `Team` / `Gig` segmented control.
- Team member assignment now mirrors the Gig invite pattern: checkbox rows with one footer `Assign` action, rather than per-row assignment buttons.
- Gig freelancers now use the same row structure as Team members: checkbox rows with footer actions for `Send invites` and single-person `Assign`.
- Selecting the currently assigned person in the role editor changes the shared action to `Unassign`, clearing the accepted assignment while leaving the role slot in place.
- `Remove role` moved out of the modal footer into a quiet header trash icon with confirmation.
- The Team panel header overflow menu and collapse control were removed in the Active Videos drawer; the section stays open.
- Inside the Active Videos drawer, the Team header now follows the same quiet section treatment as Hours and Deadline instead of using the full card header styling.
- Freelancer invitations in the role editor now use row checkboxes with one footer `Send invites` action. Direct assignment is a quiet inline action for cases already arranged outside Brisk.
- Pending invitees now render as compact single-line summaries, with withdraw shown only inside the role editor as a text action.
- Person-type chips use user-facing casting labels: `Team` for studio staff and `Gig` for freelancers.
- Row hours are shown as highlighted text and can be edited inline; the role editor remains available by clicking elsewhere on the row.
- Staff/freelance pills, the role editor modal, popconfirm, and toast are local prototype treatments that should be replaced by `d-Tag-Badge`/`d-Chips`, `d-Modal`, `d-Popconfirm`, and `d-Notification toast` once React DS exports are available.
- Avatar initials were removed from Team rows and the picker for V1.1.

## Active Videos row affordance

Updated the Active Videos project list row pattern:

- Every row now has an always-visible right-edge chevron using the existing Flow `caret-right` icon, placed in the fixed actions area.
- Row hover uses a neutral Brisk block-secondary wash across the full row width, with the chevron darkening on hover and selected rows.
- The hover-only ellipsis action remains available, now sitting beside the resting chevron instead of being the only visible row affordance.
- This pattern currently applies to the Active Videos project table, which is the only list in this pass where a row opens the project side peek.
