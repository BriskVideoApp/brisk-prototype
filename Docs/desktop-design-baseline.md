# Approved desktop design baseline

Reconciled with Tom's explicit decisions on 20 October 2026. This is an index of approved rules and their scope, not a completed UI audit, a new design proposal or confirmation that Yura's Figma source has been updated.

## Authority and approval boundaries

1. Latest explicit user-approved decisions take precedence within their stated scope.
2. Follow [AGENTS.md](../AGENTS.md), the [Brisk visual guidance](../brisk-design-system.md) and the approved component-specific React guidance linked below.
3. Use original-kit descriptions and screenshots where they do not conflict with a later scoped approval.
4. Existing code, repeated use, commit messages and historical review notes are evidence of implementation, not independent product approval. Verify consumers in the forthcoming audit.

Record a conflict rather than silently choosing a new standard. Approval of a component does not certify all its consumers. Approval of a layout does not approve every element inside it. Consistency permits meaningful contextual differences in content, permissions and workflows.

### What belongs where

| Layer | Authority and ownership | Boundary |
| --- | --- | --- |
| DS foundations and primitives | `Brisk DS/` tokens and approved React components | Component-specific guidance owns variants, interaction states and keyboard behaviour. The Figma `d-` catalogue is not proof of a corresponding React export. |
| Approved app-level compositions | Header, hybrid navigation, project-stage presentation and scoped page patterns below | Compose approved controls and tokens. These are not automatically new primitives in Yura's kit. |
| Scoped implementations | The exact pages and workflows named in an approval | Inspect other consumers before extending the rollout. Preserve callbacks, access checks, native links and persistence. |
| Historical or unresolved patterns | Older screenshots, review requests, unreviewed local controls and missing assets | Keep as evidence or audit candidates. Do not promote them merely because they exist or are common. |

## Approved reusable React controls

Use the existing exports from `Brisk DS/src/app/components/`; do not create parallel controls. Follow each linked document's scope and exclusions, rather than assuming every specialised control must be replaced.

| Family | Approved guidance |
| --- | --- |
| Labelled actions | [Button](../Brisk%20DS/guidelines/components/buttons.md): primary, secondary, tertiary, ghost and danger, preserving contextual S/M/L sizes. |
| Icon-only actions | [IconButton](../Brisk%20DS/guidelines/components/icon-buttons.md): quiet by default, named accessible targets and existing blue keyboard focus. |
| Ordinary fields | [Input](../Brisk%20DS/guidelines/components/inputs.md), [Textarea](../Brisk%20DS/guidelines/components/textareas.md), [Checkbox and Radio](../Brisk%20DS/guidelines/components/forms.md), [Toggle](../Brisk%20DS/guidelines/components/toggles.md). Search, rich editors and specialised pickers retain their documented boundaries. |
| Selection fields | [BriskSelect](../Brisk%20DS/guidelines/components/dropdown.md). The app compatibility export delegates to the DS `Select` implementation. Keep keyboard focus visible; the blue outline is not merely an open-menu decoration to remove. |
| Commands and native links | [Quiet action menus](../Brisk%20DS/guidelines/components/action-menus.md). Preserve actual anchors, conditional commands and disabled explanations. Follow the scoped text-only, equal-row and whitespace grouping decisions. |
| List filters and content tabs | [Quiet choices](../Brisk%20DS/guidelines/components/quiet-choices.md). Filters are pressed buttons; content tabs have panel semantics. Neither replaces linked production-stage navigation. |
| Editing and confirmation | [EditingDialog](../Brisk%20DS/guidelines/components/editing-dialog.md), [ConfirmationDialog](../Brisk%20DS/guidelines/components/confirmation-dialog.md) and [Popover](../Brisk%20DS/guidelines/components/popover.md). Preserve action meaning and save boundaries. |

For specialised Add/Replace media sources, keep all four workflows in their existing order: Upload file, Add from your Media, Stock footage search and Add link. Tom approved text-only rows, equal spacing and no dividers. This does not authorise removing sources or changing their workflows.

## Approved desktop app compositions

### Hybrid workspace navigation

- Use the left-hand hybrid sidebar for workspace destinations, with the collapse/expand icon at its top.
- Keep Chat, Updates and the quiet Ask Brisk action at the top right. Chat has its speech-bubble icon and visible label; Updates has its bell icon and visible label. Do not rename notification records, preferences or every notification-related heading purely to match the global Updates trigger.
- Keep Back, Forward and Recent pages together at the top left of the content bar. Recent pages uses the approved history icon and text-first native-link menu. It is separate from project breadcrumbs and progress.
- Put the account/avatar control above Studio settings where permitted. Place the inconspicuous Test mode control below it and Studio settings. Preserve the existing narrow-screen/clean-entry fallback, rather than moving the desktop role control back into the top bar.
- Sidebar background: `--brisk-bg-block-secondary` in expanded, collapsed and settings views. Keep the top bar and content surfaces white. Preserve lavender selection and keyboard focus.
- Staff workspace order: Videos, To Do, People, Clients, Media Library, Expenses, Brand Kits, subject to existing access checks. Clients use the approved `buildings` icon, Expenses `money` and Brand Kits `palette` through `DsIcon`.
- Freelancer and Client views retain only their permitted destinations. The Client Brand Kit is singular and scoped to their company; Videos retains the role-appropriate destination. Do not grant destinations or capabilities to make the sidebars identical.
- Brand Kits belongs below Expenses in the Staff sidebar. The old desktop All Brand Kits link beneath the Clients title is not the primary entry point; preserve any existing narrow-screen fallback.

Implementation references: [HybridSidebar](../src/components/navigation/HybridSidebar.tsx), [AppShell](../src/components/navigation/AppShell.tsx), [global actions](../src/components/navigation/GlobalHeaderActions.tsx), [Ask Brisk](../src/components/ai/BriskAiHeaderButton.tsx) and [history](../src/components/navigation/GlobalHistoryNavigation.tsx). These references identify the approved composition, not a blanket endorsement of all branches or older navigation metadata.

### Workspace titles, search and page actions

- The scoped workspace pages are Videos, To Do, People, Clients, Media Library, Expenses and Brand Kits. Use the shared app [WorkspacePageHeader](../src/components/layout/WorkspacePageHeader.tsx), DS `Headings/M-bold` (`headings-m-bold`, 32px/40px), with 24px vertical and 32px horizontal desktop padding.
- Use a white surface and primary bottom border. Allow actions to wrap when constrained; retain readable text and usable targets.
- Do not apply this workspace rule indiscriminately to project, profile, section, dialog or Client portal headings. The Freelancer Videos workspace retains its My jobs title and original workflow.
- Omit explanatory text directly below these workspace titles. To Do retains its date below its title. Elsewhere, explanatory text is appropriate when it clarifies scope or consequences; it is not mandatory decoration below every heading.
- People and Clients: search belongs at the right of the page header. Invite person and Add Client belong to the right of the filters/tabs row below. Preserve People view-specific invitation labels and role preselection. Keep sort and result count above the table, without a duplicate search field.
- Add Client creates a Client company; it is not renamed Invite Client. In People, Client contacts names the people filter. Preserve its existing stored `Clients` value, URL compatibility and filtering.
- Videos, Media Library, Expenses and Brand Kits retain their existing header search and scope. To Do retains its week/viewing controls. This does not standardise all search-field dimensions or certify their implementation as a shared DS Search primitive.
- Expenses is the top-level workspace heading replacing Invoices to pay and the WORKSPACE OWNER eyebrow. Preserve invoice-specific data, filters, routes and access checks.

Implementation/approval trace: `cc92544` (workspace headers), `61f3029` (People/Clients search and actions), [PeoplePage](../src/components/people/PeoplePage.tsx) and [ClientsPage](../src/components/clients/ClientsPage.tsx).

### Media Library search and bulk-action scope

- The global Media Library header contains Search media, not Download all. Remove the duplicate search from its media filter toolbar; keep the existing query/filter behaviour.
- No bulk download action is available for All clients / All projects. Selecting a Client or project exposes the local, explicitly scoped download action beside that location's media controls, subject to the existing download capability.
- Project Media retains its existing toolbar, Transcripts count, Upload workflow, scoped download, filters and search. The global library remains browse-only for uploads; moving search is not approval to add global uploads.
- Preserve per-file and explicitly selected-file actions, unavailable-original handling and all visibility/membership checks. A scoped bulk action must not silently expand into the whole Studio library.

Trace: `a5d54eb` and [MediaBrowser](../src/components/media/MediaBrowser.tsx). This remains a front-end mock workflow, not an implemented archive/download service.

### Global unread counts

Chat and Updates reuse the same compact app-level [CommentCountBadge](../src/components/CommentCountBadge.tsx), rather than combining a small Chat pill with a separate oversized purple Updates badge. Preserve independent count sources, permission scoping, accessible labels, zero-count hiding and existing display-cap behaviour. The approval standardises their shared presentation, not their numerical values.

Trace: `f4e92f4`. This adapter and its current CSS are not a newly confirmed DS Badge primitive. Exact token use, readability, animation and other badge consumers remain audit subjects; do not treat incidental implementation values as new DS tokens.

### Project progress and specialised workflows

Preserve the circular `StageChip` presentation, status colours, labels and pinned Media. Sidebar/history changes do not replace the progress row users rely on. Follow the current adaptable flow in AGENTS.md, including optional Storyboard, Animation replacing Edit where applicable and a single Shoot stage with its internal substages. Archived square Flow exports and fixed-stage lists are not the current baseline.

Existing approval safeguards, version destinations, Staff-only status editing, assignment/invitation differences and financial visibility remain in force. See the scoped [UX decision log](ux-decision-log.md) and component guidance. Presentation reconciliation does not authorise workflow or permission changes.

## What remains unresolved or unverified

- This reconciliation is documentation-only. It does not establish full app coverage, browser verification of every consumer, formal accessibility compliance or production readiness.
- Team-assignment hours fields, Staff/Freelancers selectors, selection rows, spacing and separated save/assign/destructive actions require the forthcoming audit. Use of a shared EditingDialog or Button does not certify the contents or justify merging their actions.
- Search controls are existing specialised implementations. Their visual and accessibility consistency requires review; no new universal Search primitive is approved here.
- Older navigation metadata, inactive components and review-log statements may differ from the approved hybrid shell. Classify live usage before recommending a migration.
- Screenshots can demonstrate canonical aspects only where they agree with the approvals above. Capture current reference evidence during the audit; do not present an older screenshot as proof of current behaviour.
- [Yura's review log](yura-review.md) records the design-source synchronisation questions. No Figma changes or newly supplied assets have been confirmed by this reconciliation. Missing components still follow the DS missing-asset protocol.

The next audit should identify and justify further improvements, with screenshots and explicit coverage. New variants, consequential workflow changes and unresolved design choices require Tom's approval before implementation.
