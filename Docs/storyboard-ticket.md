# Storyboard - approved Script conversion, image upload, review and approval

## Status

Implemented in the desktop prototype.

This ticket replaces the broader storyboard proposal in the source PDF for the current desktop prototype. It records the decisions made after reviewing the ticket, the Option B production-flow model and the existing Script and Edit Stages.

## Outcome

Give filmmakers a dedicated Storyboard Stage where an approved Script can be turned into one editable frame per Script row, illustrated with one directly added image, reviewed with Brisk's existing Edit comments and approved before Animation begins.

## When Storyboard appears

- Storyboard is included automatically when an animation video type is selected in the Brief and the project uses the Option B animation flow.
- The recommended animation flow is `Brief > Script > Storyboard > Animation > Masters`.
- Studio Staff can add Storyboard to another project through **Adjust project flow**.
- A manually added Storyboard is inserted immediately after Script.
- Studio Freelancers and Clients cannot change the project flow.
- The Stage may be visible as **Not started** before Script approval, but no storyboard is created yet.

## Creation rule

- A storyboard can be created only from an approved Script.
- Creation is an explicit **Create Storyboard** action, not an automatic side effect of approval.
- The Script **Actions** menu shows **Convert script to storyboard** when Storyboard is in the project flow. The action remains visible but disabled until the current Script version is approved.
- The created version records the approved Script version used as its source.
- Each Script row becomes one Storyboard frame, preserving the Script row's Words, Visual direction and duration.
- The first view after creation is the Board view.

## Views

### Board view

- Default view.
- Image-first frame cards in storyboard order.
- Each card shows frame number, approved Words, Visual direction, duration, image state and comment count.
- The duration is edited directly from the seconds control in the card header. Enter or clicking away saves a whole-second value, with a minimum of one second.
- Card actions reuse the Media icon treatment for comments, copying a frame link, downloading the current image and removing it.
- Clicking an illustrated frame image opens its review. The frame menu contains replace media, delete media, duplicate frame and delete frame actions.
- Frames can be reordered, duplicated and deleted.
- New frames can be added without changing the Script.

### AV view

- Optional alternate view.
- Directly reuses the existing Script AV editor component, including its Words, Visuals, image and comment-row treatment.
- It shows the same frame data as Board view, not a separate document.

## Images

- One image per frame.
- Images are added directly using the same media picker pattern as the Script Visuals column.
- A frame image can be added, replaced or removed. Replace media opens the same upload, Media library, stock footage and link picker used by Script.
- No AI image generation in this version.
- No batch upload, automatic matching, confidence scoring or unmatched-image tray.

## Comments and mark-up

- Opening a frame uses the existing Edit review comment experience.
- The Storyboard toolbar reuses Script's **Comments** control and all-comments rail. Selecting a comment opens its frame review.
- Comments support Client and Team visibility, replies, reactions and resolve/reopen.
- Clients see Client comments only. Filmmakers can use both Client and Team comments.
- The current Edit freehand drawing and point-pin behaviour may be used.
- Arrow, rectangle, ellipse, text-label and highlight tools are not part of this ticket and do not need a new shared annotation model.

## Ordering and Script relationship

- Storyboard order is independent from Script order after creation.
- Reordering the Storyboard does not change the Script, so it needs no warning.
- Adding, duplicating or deleting Storyboard frames does not change the Script.
- A future explicit **Apply Storyboard order to Script** action would require a warning and would unapprove the Script. That action is out of scope.
- The source Script version remains recorded in Storyboard data for traceability without adding repeated header copy.

## Versions and approval

- Storyboard versions are independent from Script versions.
- Version selection reuses Script's compact version button and version panel, including new blank, duplicate and rename actions.
- The Storyboard toolbar reuses Script's **Actions** control with Undo, Redo, Download PDF and Delete version. Script-only copy and conversion actions are excluded.
- The Stage supports review request, Client approval and unapproval using the same approval rules as Script.
- Studio Staff and Clients can approve. Studio Freelancers cannot approve.
- Editing an approved Storyboard creates a new editable version and removes Stage approval after confirmation.
- Animation can begin after the Storyboard is approved.

## Permissions

Use the same simple role model as the rest of the prototype:

| Capability | Studio Staff | Studio Freelancer | Client |
| --- | --- | --- | --- |
| View Storyboard | Yes | Yes | Yes |
| Edit frames and images | Yes | Yes | Yes |
| Add Client comments | Yes | Yes | Yes |
| Add Team comments | Yes | Yes | No |
| Request review / send to Studio | Yes | Yes | Yes |
| Approve / unapprove | Yes | No | Yes |
| Add or remove the Stage from the project flow | Yes | No | No |

## Desktop prototype acceptance criteria

1. Selecting an animation video type in the Brief recommends a flow containing Storyboard after Script.
2. Studio Staff can add Storyboard from Adjust project flow on non-animation projects.
3. The Storyboard chip in the project Stage header opens the Storyboard route.
4. An unapproved Script shows a blocked creation state with a route back to Script.
5. An approved Script can be converted into one frame per Script row.
6. Board view is the default and AV view presents the same data.
7. A user can add, replace or delete one image on a frame using the Script media-picker pattern.
8. A user can reorder, duplicate, delete and add Storyboard frames without changing Script order.
9. Clicking a frame image opens the Edit-style review experience and supports comments, replies, reactions, resolution, visibility and current freehand mark-up.
10. Storyboard reuses Script's Actions and Comments controls, omitting Script-only copy and conversion commands.
11. Storyboard supports versions, request review, approval and unapproval with Script-equivalent permissions.
12. Animation projects show **Animation**, not **Edit**, after Storyboard.

## Deferred

- Mobile-specific Storyboard layouts and interactions
- Batch image upload or automatic image-to-frame matching
- AI image generation
- Expanded shape, label or highlight annotation tools
- Applying Storyboard order or frame changes back to Script
- Backend storage, production permissions and real file upload

## Prototype constraints

This implementation is front-end only. It uses typed mock data and browser-local prototype state. The production application will supply persistence, real uploads, audit history and permission enforcement.
