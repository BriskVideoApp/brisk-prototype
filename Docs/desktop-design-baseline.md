# Approved desktop design baseline

Current approval register, established on 20 October and updated with the scoped decisions recorded below through 30 October 2026. Use it for future work. It is not blanket screen sign-off, a new design proposal or confirmation that Yura's Figma source has been updated.

### Admin/Staff and Owner/Teammate access - 30 October 2026

Source: Tom's explicit request to implement the permission split and the supplied [Brisk User Roles ticket](https://app.notion.com/p/35dabf184ca980abaebee740b3abb5bf), including Deferred to V2. The five Test mode views are Studio Admin, Studio Staff, Studio Freelancer, Client Owner and Client Teammate. Reuse existing controls and layouts; this is front-end mock behaviour only. No production security, services or new granular permission screen is authorised.

| Capability | Studio Admin | Studio Staff | Freelancer | Client Owner | Client Teammate |
| --- | --- | --- | --- | --- | --- |
| Studio projects and project costs | All | All | Existing invited-project/commercial scope | Permitted projects; no Studio costs | Same Client project scope |
| Studio settings, subscription billing, People/access administration | Yes | No | No | No | No |
| Company details, team access and Client billing | Studio administration stays separate | No | No | Own company; billing still needs Studio setup | No |
| Existing review/approval and manual release actions | Retained | Retained | Existing assigned-work rules | Existing permitted-project actions | Existing permitted-project actions |
| Internal comments | Existing Studio access | Existing Studio access | Existing project scope | Never | Never |

Implementation defaults were stated during preflight: Staff retain commercial project work and can invite project collaborators, while adding Studio members and assigning elevated roles require Admin. Owners manage company details, invitations and billing. Both Client levels retain existing permitted-project approval behaviour. The source ticket explicitly leaves Teammate approval and the precise settings split open; these defaults need product review, and must not be presented as final permission policy. Staff project restrictions, named approvers and additional stage access controls remain deferred to V2. Job titles never add permissions.

Implementation: [access-level definitions](../src/data/prototype-permissions.ts), [role context](../src/components/navigation/PrototypeRoleContext.tsx), existing Test mode, People/invitation controls and settings boundaries. Legacy stored membership values remain compatible: Studio Owner = Admin, Team Member = Staff, Client Admin = Owner, Client Member = Teammate. The separate legacy Studio billing flag no longer grants access. Test mode previews a different level for the same fixture identity; it does not replace the shared dataset. Assigned Studio levels use the existing saved Studio membership state. Client roles use the existing Client contact records. The `client-role` query parameter no longer grants access. All pages remains a navigation preview, with administration boundaries enforced.

Verification on 30 October: TypeScript and diff checks passed. Desktop interaction checks covered all five Test mode levels; Admin settings allowed and Staff direct-route settings/People denied; Owner team access and Teammate team/invoice denial, including `client-role=admin`; Studio and Client role changes surviving reload, with fixture values restored; both invitation forms, cancelled without sending; Staff Expenses and the existing Freelancer My jobs scope. Client Script retained its existing review controls (the selected fixture was already approved). Browser network responses confirmed HTTP 200 for Studio settings, Client invoices and Expenses. Shell curl could not reach localhost, so those HTTP checks used the browser. No production build, tests, mobile pass, backend, staging or commit was performed. Evidence: [five access levels and Staff settings boundary](../audits/permissions-2026-10-30/access-levels.png). Tom's visual sign-off and final permission policy remain separate.

### Ask Brisk first prototype slice - approved 29 October 2026

Source: Tom's Ask Brisk ticket discussion, preference answers and explicit instruction to implement on 29 October. This is an app composition of existing controls, not a new DS Drawer, Card, composer primitive or production AI service. Scope is the desktop assistant, guided Brief connection and one simulated approval-reminder workflow. Preserve To Do's layout and surrounding screens.

- Keep the quiet top-bar entry. Reuse `CommentCountBadge` for new insights, with an independent permission-scoped count and accessible name. A click opens a compact insight preview; Open conversation opens the taller right-side assistant using its existing surface and source-chip treatment, with a smaller composer. No automatic pop-up or external notification is introduced.
- Show the project/Stage or workload scope, source links and relevant suggested questions. Broader scope uses existing project membership checks. Respect optional Storyboard and the Animation label. The initial briefing uses current Stage records and explicit producer priorities; it does not claim to monitor meetings, email or every comment, forecast delivery, or calculate a complete workload.
- Viewing an insight clears its unread state. Dismiss hides that insight until its recorded status or priority changes. Briefings, private conversations and instructions are separated by workspace, scenario, access role and user. Their in-memory state survives in-app navigation and role changes; a full reload resets it.
- Keep the guided Brief on its page. Both surfaces share one Brief conversation, source attachments and clarification progress. Read-only project questions in that conversation do not count as Brief answers. Drafting uses the existing editable Brief workflow and does not approve it. Avoid a second independent Brief assistant panel.
- Use Ask Brisk for Filmmakers and Ask plus the Studio name for Clients. This scoped assistant naming decision does not restore broader white-label colour controls or change the approved portal theme.
- Staff can set or clear their priority instruction. Keep that instruction distinct from the linked Stage status; edit the actual source to correct project facts. Do not introduce a new producer/admin access role or a team-wide briefing publication workflow.
- Staff can prepare an approval reminder for a review Stage waiting on the Client. Review shows the project, Stage/version when recorded, active assigned Client contacts, Client-visible Project Chat destination and editable copy. Posting requires an explicit Post reminder (demo) click, rechecks the pending review and recipients, and adds one clearly labelled simulated Chat message. Cancel sends nothing. Clients and Freelancers do not receive this action. No email, calendar or other external service is contacted.

Implementation sources: [assistant](../src/components/ai/BriskAiAssistant.tsx), [shared state](../src/components/ai/BriskAiContext.tsx), [briefing](../src/components/ai/AskBriskInsights.tsx), [reminder review](../src/components/ai/ApprovalReminderReview.tsx) and [guided Brief](../src/components/brief/BriefPage.tsx). Reference evidence: [Asana suggested questions and side panel](https://mobbin.com/screens/f2b651ef-bce1-464c-9c47-52f2fb187238), [Fireflies contextual panel](https://mobbin.com/screens/2047129f-d283-45ef-81bb-09aa79a32ffe), [Plane suggested questions](https://mobbin.com/screens/1d95ef0c-69df-49e5-a2af-45ba7bb5d456) and [Voicenotes visible source context](https://mobbin.com/screens/bdba68b3-995c-425b-99a9-82fdccbfad62). These references informed structure; Brisk's tokens and controls retain their own appearance. Implementation and desktop behaviour checks do not constitute Tom's final visual sign-off or Figma parity.

Desktop verification on 29 October: TypeScript and diff checks passed. Browser interaction checks covered all three roles, separate private conversations, broader Client scope, priority editing, the shared Brief clarification/draft/review path and an edited Hims reminder appearing in external Project Chat. Missing recipients blocked posting. Brief, To Do and Chat returned HTTP 200 in browser network observations; shell curl was unavailable because sandbox networking denied localhost connections. Captures: [workload briefing](../audits/ask-brisk-2026-10-29/workload.png) and [Client Brief connection](../audits/ask-brisk-2026-10-29/client-brief.png). No production build, tests, mobile design pass, staging or commit was performed.

## Authority and approval boundaries

1. Latest explicit user-approved decisions take precedence within their stated scope.
2. Follow [AGENTS.md](../AGENTS.md), the [Brisk visual guidance](../brisk-design-system.md) and the approved component-specific React guidance linked below.
3. Use original-kit descriptions and screenshots where they do not conflict with a later scoped approval.
4. Existing code, repeated use, commit messages and historical review notes are evidence of implementation, not independent product approval. Check the original audit against its [later implementation register](../audits/desktop-2026-10-20/data/implementation-register.json) and subsequent scoped approvals before treating a finding as open or authorising a repair.

Record a conflict rather than silently choosing a new standard. Approval of a component does not certify all its consumers. Approval of a layout does not approve every element inside it. Consistency permits meaningful contextual differences in content, permissions and workflows.

### Maintaining this register

- Record a newly approved reusable pattern here with its decision date, scope/exclusions, actual source component and reference evidence. Update the corresponding component guide if the reusable contract changes; do not duplicate the full specification across documents.
- Label an unapproved current implementation as current evidence, not a standard. Label a genuinely unresolved choice as pending and ask only when the requested work depends on it.
- Track implementation, browser verification and visual sign-off separately in the existing implementation register when audit work is involved. An implemented fix need not be visually signed off, and a multi-occurrence finding may be only partly fixed.
- Preserve the original audit's evidence and findings. Its initial Unfixed/Needs decision labels are historical; later fixes and explicit Keep decisions take precedence within their scope. A full audit reconciliation is not required before every feature.
- Preserve existing approved appearances during feature work. Token cleanup, unrelated audit repairs and new reusable variants require their own authorised scope. Guidance checks do not certify accessibility or Figma parity.

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
- Tom explicitly renamed the global popover to Updates on 29 October 2026. Its heading, View all updates footer, empty-state text and accessible labels use Updates. Keep notification routes, record identifiers, settings terminology and behaviour unchanged.
- Keep Back, Forward and Recent pages together at the top left of the content bar. Recent pages uses the approved history icon and text-first native-link menu. It is separate from project breadcrumbs and progress.
- Put the account/avatar control above Studio settings where permitted. Place the inconspicuous Test mode control below it and Studio settings. Preserve the existing narrow-screen/clean-entry fallback, rather than moving the desktop role control back into the top bar.
- Sidebar background: `--brisk-bg-block-secondary` in expanded, collapsed and settings views. Keep the top bar and content surfaces white. Preserve lavender selection and keyboard focus.
- Staff workspace order: Videos, To Do, People, Clients, Media Library, Expenses, Brand Kits, subject to existing access checks. Clients use the approved `buildings` icon, Expenses `currency-dollar-simple` and Brand Kits `palette` through `DsIcon`.
- Tom approved a home icon for the Videos sidebar entry on 28 October 2026, then requested a clean outline without the filled patch on the left. Use the existing `house-line` asset through `DsIcon`. Keep the Videos label and role-appropriate destination.
- Tom approved the single-person `User` icon for the People sidebar entry on 29 October 2026. Use the unmodified DS export through `DsIcon` as `user`; keep the People label, destination and access checks.
- Tom approved the simple dollar icon for the Expenses sidebar entry on 29 October 2026. Use the unmodified DS `CurrencyDollarSimple` export; keep the Expenses label, destination and access checks.
- Tom requested tooltips for the collapsed sidebar on 29 October 2026. Use the existing app tooltip treatment on hover and keyboard focus, positioned beside the rail so scrolling does not clip the label. Cover workspace and settings destinations, the expand control, the account menu and the clickable Studio brand. Expanded navigation keeps its visible labels.
- Freelancer and Client views retain only their permitted destinations. The Client Brand Kit is singular and scoped to their company; Videos retains the role-appropriate destination. Do not grant destinations or capabilities to make the sidebars identical.
- Brand Kits belongs below Expenses in the Staff sidebar. The old desktop All Brand Kits link beneath the Clients title is not the primary entry point; preserve any existing narrow-screen fallback.

Implementation references: [HybridSidebar](../src/components/navigation/HybridSidebar.tsx), [AppShell](../src/components/navigation/AppShell.tsx), [global actions](../src/components/navigation/GlobalHeaderActions.tsx), [Ask Brisk](../src/components/ai/BriskAiHeaderButton.tsx) and [history](../src/components/navigation/GlobalHistoryNavigation.tsx). These references identify the approved composition, not a blanket endorsement of all branches or older navigation metadata.

### Workspace titles, search and page actions

- The scoped workspace pages are Videos, To Do, People, Clients, Media Library, Expenses and Brand Kits. Use the shared app [WorkspacePageHeader](../src/components/layout/WorkspacePageHeader.tsx), DS `Headings/M-bold` (`headings-m-bold`, 32px/40px), with 24px vertical and 32px horizontal desktop padding.
- Use a white surface and primary bottom border. Allow actions to wrap when constrained; retain readable text and usable targets.
- Do not apply this workspace rule indiscriminately to project, profile, section, dialog or Client portal headings. The Freelancer Videos workspace retains its My jobs title and original workflow.
- Omit explanatory text directly below these workspace titles. To Do retains its date below its title. Elsewhere, explanatory text is appropriate when it clarifies scope or consequences; it is not mandatory decoration below every heading.
- People and Clients: Invite person and Add Client belong to the right of the filters/tabs row below. Preserve People view-specific invitation labels and role preselection. Keep sort and result count above the table. The former right-hand header search placement is superseded by the approved single top-bar Search below.
- Add Client creates a Client company; it is not renamed Invite Client. In People, Client contacts names the people filter. Preserve its existing stored `Clients` value, URL compatibility and filtering.
- To Do retains its week/viewing controls. Former separate workspace search fields are superseded by the approved single top-bar Search below.
- Expenses is the top-level workspace heading replacing Invoices to pay and the WORKSPACE OWNER eyebrow. Preserve invoice-specific data, filters, routes and access checks.

Implementation/approval trace: `cc92544` (workspace headers), `61f3029` (People/Clients search and actions), [PeoplePage](../src/components/people/PeoplePage.tsx) and [ClientsPage](../src/components/clients/ClientsPage.tsx).

### Single top-bar Search - approved 29 October 2026

- One Search control immediately before Chat opens a composition of the existing DS EditingDialog, Input and Select. Use the existing search icon through DsIcon. Keep an accessible name and tooltip when the visible label is hidden at narrower desktop widths.
- Default to the current page, document or Chat conversation. Show that scope in the selector and offer Everywhere without changing the query. Each opening returns to the current scope. Cmd/Ctrl+K has one owner across the app.
- Remove the duplicate main-list fields from Videos/My jobs, Media Library/project Media, People, Clients, Brand Kits and Expenses. Preserve their local list filtering, existing status/location/type controls and clear actions. Show active list-search text in the top-bar control's visible label where space permits and accessible name.
- Search results retain source labels, matching text and native destinations. Document matches reveal the relevant Brief step/field or Script row. Chat matches reveal the message and reply thread. Keep picker-specific searches, such as selecting a person or asset, because they select within a workflow.
- Reuse existing project membership, Client/Filmmaker role visibility, conversation membership and administration checks. Everywhere does not grant access to Internal Chat, other Clients or restricted directories/finance.
- Search is a read-only, front-end prototype composition. No search history, migrations, record writes, external search service, AI service or new dependency is introduced. This approval does not authorise a production backend.

### Media Library search and bulk-action scope

- The global Media Library has no Download all action in its page header. Its former Search media field is superseded by the single top-bar Search; preserve its existing list filtering behaviour.
- No bulk download action is available for All clients / All projects. Selecting a Client or project exposes the local, explicitly scoped download action beside that location's media controls, subject to the existing download capability.
- Project Media retains its existing toolbar, Transcripts count, Upload workflow, scoped download and filters. Search is accessed through the single top-bar control, defaulting to the current Media scope. The global library remains browse-only for uploads; moving search is not approval to add global uploads.
- Preserve per-file and explicitly selected-file actions, unavailable-original handling and all visibility/membership checks. A scoped bulk action must not silently expand into the whole Studio library.

Trace: `a5d54eb` and [MediaBrowser](../src/components/media/MediaBrowser.tsx). This remains a front-end mock workflow, not an implemented archive/download service.

### Global unread counts

Chat and Updates reuse the same compact app-level [CommentCountBadge](../src/components/CommentCountBadge.tsx), rather than combining a small Chat pill with a separate oversized purple Updates badge. Preserve independent count sources, permission scoping, accessible labels, zero-count hiding and existing display-cap behaviour. The approval standardises their shared presentation, not their numerical values.

Trace: `f4e92f4`. Tom confirmed keeping the current pink unread-badge appearance, including its existing pulse, during the visual style review on 29 October 2026. Preserve the shared adapter and current presentation; this is a scoped app pattern, not a new general-purpose DS Badge primitive or formal accessibility sign-off. The original A03 recommendation is historical evidence, not permission to restyle this approved pattern. Do not generalise its compact typography or animation to unrelated controls.

### Visual style confirmations - 29 October 2026

Tom reviewed three existing screenshot crops against the treatments still present in the current code and answered Keep for all three:

- **Quiet toolbar sorting:** retain the borderless Media sort dropdown, including its visible value, chevron and existing keyboard focus. This is a contextual toolbar treatment; ordinary form selection fields retain their approved DS appearance. Reuse the existing implementation rather than inventing another selector. The earlier DEC05 / DES-R04 choice is resolved for this shown treatment.
- **Brand Kit category tints:** retain the existing Client-derived tinted Fonts, Voice and Guidelines cards as a scoped Brand Kit exception to the general white-panel rule. Do not extend this exception to unrelated panels. The earlier A06 recommendation does not authorise removing these approved tints.
- **Unread badges:** retain the current pink compact badge treatment and existing pulse described above. Preserve count sources, labels, zero hiding and caps.

Visual references: [Media sort](../audits/desktop-2026-10-20/reviewers/a-comparisons/A04-current-media-sort.png), [Brand Kit Fonts card](../audits/desktop-2026-10-20/reviewers/a-comparisons/A06-current-fonts-panel.png) and [unread badge](../audits/desktop-2026-10-20/reviewers/a-comparisons/A03-current-row-badge.png). These historical crops identify the specific styles reviewed; approval does not certify entire screens, unrelated behaviour or Figma parity. No application styling was changed to record these decisions.

### Notification and timing state presentation

Tom reaffirmed on 29 October 2026 that notification urgency uses colour and clear text, without emergency/status icons. Project Chat system updates follow the existing Notifications row fills: neutral grey, pale yellow for attention, pale pink for failure and pale green for success. Do not add a separate severity pill to these posts. Keep meaningful titles, actions, audience labels and screen-reader status text. Notification message previews use the same colour treatment without a severity header. Shared dense status labels retain their text and colour without an icon. Brief suggestions and timing warnings likewise omit status symbols; preserve all review, sharing, read-state and agreement behaviour.

Tom approved the pending Project Chat timing-card layout on 29 October 2026: Requested delivery and Suggested delivery have separate labelled values, followed by the audience-appropriate reason and the existing Review date action. Retain the Internal/External label, timestamp and colour treatment. Keep the suggested date distinct from an agreed change. This is a timing-card variant; other system posts and resolved historical summaries retain their existing presentation.

### Project progress and specialised workflows

Preserve the circular `StageChip` presentation, status colours, labels and pinned Media. Sidebar/history changes do not replace the progress row users rely on. Follow the current adaptable flow in AGENTS.md, including optional Storyboard, Animation replacing Edit where applicable and a single Shoot stage with its internal substages. Archived square Flow exports and fixed-stage lists are not the current baseline.

Existing approval safeguards, version destinations, Staff-only status editing, assignment/invitation differences and financial visibility remain in force. See the scoped [UX decision log](ux-decision-log.md) and component guidance. Presentation reconciliation does not authorise workflow or permission changes.

## What remains unresolved or unverified

- This reconciliation is documentation-only. It does not establish full app coverage, browser verification of every consumer, formal accessibility compliance or production readiness.
- The original Team inspection is superseded where the later Team implementation records apply. Check their scoped status and outstanding visual sign-off; using a shared EditingDialog or Button does not certify unrelated consumers or justify merging distinct actions.
- The single top-bar Search composition is approved above. Picker-specific searches remain contextual; this does not establish a universal DS Search primitive or certify every search consumer.
- Older navigation metadata, inactive components and review-log statements may differ from the approved hybrid shell. Classify live usage before recommending a migration.
- Screenshots can demonstrate canonical aspects only where they agree with the approvals above. Check the current consumer before reuse; do not present an older screenshot as proof of current behaviour.
- [Yura's review log](yura-review.md) records the design-source synchronisation questions. No Figma changes or newly supplied assets have been confirmed by this reconciliation. Missing components still follow the DS missing-asset protocol.

Future reviews should identify and justify further improvements with current evidence. Historical recommendations alone do not authorise them. New variants, consequential workflow changes and unresolved design choices require Tom's approval before implementation.

### Final delivery agreement - 29 October 2026

Tom approved rollout of the supplied Final delivery proposal. The scoped project utility shows the current agreed date, producer-reviewed Client message, proposed new date, Discuss date and authorised Client agreement, with collapsed delivery history. Keep the agreed date until the Client agrees; retain the original date and superseded proposals. Staff propose, scoped Customers agree, Freelancers read only. Compose the existing DS Buttons, EditingDialog, Textarea and approved date/time pickers. Proposal-only navigation and scenario switches do not enter the app. This approval does not implement automatic turnaround calculations or Studio timing settings. [Implemented review](../audits/desktop-2026-10-20/review-rounds/08-delivery-agreement/result.html).

### Videos empty Team action - approved 29 October 2026

Place Assign team in the Team column, replacing No team assigned for Studio Staff. Show it only when the existing team summary has no active assigned or invited people. Remove the repeated action from the Project column. Populated team summaries retain their existing team-panel entry; permissions, assignment dialog, required hours and working records are unchanged.

### Videos column defaults - approved 29 October 2026

Show every permitted Videos column by default, ordered Project, Progress, Latest action, Status, Deadline, Team, Hours, Project costs, Actions. The Columns checklist follows the same order. Preserve existing role restrictions, locked Project/fixed Actions, hiding, dragging, saved view preferences and Reset columns. Apply the revised initial view under the next column-preference version without deleting the prior preference or changing project records. Users can personalise the new view afterwards.

### Sidebar toggle - approved 29 October 2026

Use the existing DS SidebarSimple rectangle/divider asset through DsIcon for the shared hybrid desktop sidebar toggle. Keep the control beside the sidebar it affects, with the DS M IconButton, its 44px native target, keyboard activation and expanded/control semantics. Its accessible name and existing app tooltip are Collapse sidebar when expanded and Expand sidebar when collapsed. The icon remains the same left-sidebar symbol in both states. Narrow-screen fallback navigation and route/role behaviour are unchanged.

### Expanded sidebar / top-bar alignment - approved 29 October 2026

Vertically centre the expanded Studio logo, Studio name and sidebar toggle with the top-bar controls. Derive both rows from the same desktop header-height token, using DS spacing. Retain the collapsed rail's stacked arrangement, toggle labels, focus/tooltip treatment and narrow-screen fallback.

### Stage turnaround defaults and active deadlines - 29 October 2026

Tom authorised completion of the approved timing flow. Studio settings use the read-first shared summary and DS EditingDialog, with prefilled exceptions only for stages that differ. Internal WIP1 and Client WIP1 are working-day durations; included Client revision rounds remain a separate optional count. Revisions have their own turnaround duration. Timers start when a stage becomes Waiting on Studio, exclude weekends, and use the Studio timezone. The length allowance applies to Edit/Animation's first WIP only: up to 1:10 uses the one-minute allowance, 1:11-2:10 adds one increment, and so on. Existing active dates are retained until an explicit override or a new cycle. An existing untimestamped stage may be explicitly started now; do not invent a historical start.

The Deadline panel names each Studio-owned stage, with automatic/specific-date editing for Studio Staff. The Videos column shows the earliest active stage deadline and a count of other active stages, plus final delivery separately. Client views omit internal WIP targets and editing. Forecasts are provisional, include explicit readiness/review assumptions, and retain the approved Internal-first production review and Client agreement boundary. Implementation and verification evidence: [turnaround result](../audits/desktop-2026-10-20/review-rounds/22-turnaround-implementation/result.html). Visual sign-off remains with Tom. This is a front-end reference, not a background scheduler or real notification service.


### Brief usability refinements - approved 30 October 2026

Tom instructed fixing A12, A13 and B13. Preserve the approved Brief field order and table hierarchy. Give production controls readable minimum room, retain matching Main Video/Additional Versions tracks, and provide scoped keyboard-accessible horizontal scrolling with a conditional explanatory hint. Keep short Format words intact. Row commands use the existing DS action menu so table scrolling does not clip them; commands and conditions are unchanged. Explicit question navigation reveals the new step introduction and focuses its heading without adding a Tab stop or resetting ordinary answer changes. Search field targeting remains separate. Summary approval guidance uses the same existing role/minimum-content checks as the action; no new required fields or approval permissions. [Implementation and verification](../audits/desktop-2026-10-20/review-rounds/23-brief-usability/result.html). Visual sign-off remains with Tom.


### Ask Brisk question-first entry - approved 30 October 2026

Tom rejected the compact insight preview as confusing and approved restoring direct question entry. This supersedes the 29 October opening-preview requirement within Ask Brisk. The top-bar entry opens the existing assistant composer immediately, with the prompt "What would you like to know?", two or three optional suggested questions and one quiet project/Stage context row. The context control retains the existing permitted scope choices. Answers appear in the same panel; remove the extra Open conversation step and unsolicited status report. Do not show Worth a look or Prototype briefing on entry.

Keep automatic source selection behind the context row; show deliberately added source chips and cite sources with answers. Preserve the shared guided Brief conversation, draft/review boundary, private role-scoped history, drafts, priority instructions and reminder review. Your briefing remains available from the assistant header menu; its unread state clears only when the briefing is viewed. A compact empty panel grows into the existing taller conversation surface when needed. Reuse the existing assistant composition and DS Button, IconButton and BriskSelect, without a new primitive or AI integration. [Result and evidence](../audits/desktop-2026-10-20/review-rounds/25-ask-brisk-simplicity/result.html). Implementation verification and Tom's visual sign-off remain distinct.


### Ask Brisk single composer - approved 30 October 2026

Tom approved further simplifying the opening to its header and one specialised message composer. This supersedes the suggested-question opening and separate context row from the earlier same-day change. Keep the question only as the input placeholder. Put Add source, the compact context selector and Send inside the composer's enclosing edge. The scoped rich-composer treatment moves the textarea's border and visible focus outline to that enclosing edge; it does not change a DS Input, Textarea or Button primitive. Preserve token-based surface, border, radius, spacing and text treatment.

Use This Brief (or the matching current Stage/project label) only when it identifies the page currently being viewed. Keep the explicit project/Stage name for other or historical contexts, and the full context in the trigger's accessible name/tooltip. Retain the existing permitted scope choices and current-page shortcut when applicable. Start compact, reveal and expand the thread when there is conversation content, and keep history/briefing in the header menu. Preserve deliberate source chips, answer citations, shared Brief drafting, role boundaries and private drafts. No new backend or AI service. Structural reference inspected: [Voicenotes composer](https://mobbin.com/screens/46334d20-f49c-4588-ae7f-518d85873e12). [Implemented result](../audits/desktop-2026-10-20/review-rounds/26-ask-brisk-composer/result.html). Awaiting Tom's visual sign-off.

30 October icon refinement: Tom requested that the assistant header match the top-bar Ask Brisk icon. Use the same unframed, inherited-colour star-four DsIcon at 16px; remove the header's purple sparkle badge. [Verified screenshot](../audits/desktop-2026-10-20/review-rounds/26-ask-brisk-composer/matching-icon.png).


### Brief intake chat or draft choice - approved 30 October 2026

Tom requested that OK, draft my brief always sit beside Continue so a user can keep chatting or request the draft. In BriefLandingScreen, always render separate DS S Buttons: secondary Continue sends a non-empty message/attachments; primary OK, draft my brief uses context supplied so far, including unsent text/attachments, without requiring all clarification questions. Keep the draft action disabled when there is no context and both actions disabled while drafting. Preserve Fill manually on the initial intake, existing already-drafted guard, generated-field review and approval rules. This is the guided Brief intake action row only; no new AI integration or other screen redesign. [Implemented result](../audits/desktop-2026-10-20/review-rounds/27-brief-chat-or-draft/result.html). Awaiting visual sign-off.


### Unified Ask Brisk Add source - approved 30 October 2026

Tom approved one Add source control for source search/suggestions, uploads, links and broader scope selection. This supersedes the separate context dropdown and Mention a source intermediate step. Show the active scope as quiet, non-interactive composer text. Inside the combined panel, separate source selection from mutually exclusive Ask across choices; retain This project/Stage, Your workload (Your projects for Clients), All permitted projects and the applicable current-page shortcut. The optional @ typing shortcut opens this same picker.

The approved app composition uses DS Popover for its anchored surface/focus/viewport behaviour, DS Radio for scope choices, DS Input for link entry and DS Button for actions. Existing specialised source rows and selected marks remain. No DS primitive contract changes. Permitted sources retain role/project filtering; manually added file/link metadata is private to the assistant session and context. Attach files via the browser chooser without processing their content; links are not fetched. This is a front-end prototype, with no real AI ingestion, backend upload or record changes. [Implementation and evidence](../audits/desktop-2026-10-20/review-rounds/28-unified-add-source/result.html). Awaiting Tom's visual sign-off.

30 October source-search refinement: Tom requested removal of the extra inner line. The unified source search has one enclosing edge/focus treatment; suppress the inner native input's inherited global hard focus shadow and place the existing blue focus outline on the enclosing search label. Scoped to this specialised picker; global focus and DS Input contracts are unchanged. [Verified screenshot](../audits/desktop-2026-10-20/review-rounds/28-unified-add-source/search-single-edge.png).

30 October scope-control removal: Tom explicitly requested removal of the entire Ask across fieldset from Add source. Remove its options, props and unused Radio/import/layout code; do not relocate or recreate the group. Preserve source search/suggestions, upload/link actions, quiet context text, current conversation scope values and permission filtering. This supersedes the earlier same-day Ask across menu approval. [Verified screenshot](../audits/desktop-2026-10-20/review-rounds/28-unified-add-source/without-ask-across.png).
