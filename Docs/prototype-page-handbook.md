# Brisk prototype page handbook

Last reviewed: 17 August 2026

This is the operational index for the current Brisk prototype. It is intended for product review, design review, developer handoff and route QA.

It records:

- every implemented page and its route
- which prototype roles can see each page
- the canonical Launch Film journey
- direct links to empty and filtered states
- important in-page states that cannot be opened with a URL
- the primary source files for each product area

This document describes the running prototype. Visual truth remains in `brisk-design-system.md`, Brisk DS and `Docs/References/screen-inventory.md`.

## Using this handbook

Run the prototype at `http://localhost:3000`, then use the links below.

The persistent preview bar supports:

- Studio Staff
- Studio Freelancer
- Customer
- All pages

All pages is a review tool. It does not replace the selected role and is not part of the intended production experience.

Role selection and All pages use local React state. Both reset when the page is refreshed. Some page-specific preferences are deliberately stored in local or session storage, as noted later in this document.

## Recommended review path

For a complete end-to-end walkthrough, select **All pages** and use the canonical demonstration project:

**Loom - Launch Film - Sales Narrative** (`loom-launch-film`)

1. [Overview](http://localhost:3000/projects/loom-launch-film)
2. [Brief](http://localhost:3000/projects/loom-launch-film/stages/brief)
3. [Script](http://localhost:3000/projects/loom-launch-film/script)
4. [Transcripts](http://localhost:3000/projects/loom-launch-film/script?subtab=transcripts)
5. [Storyboard - animation example](http://localhost:3000/projects/notion-workflows/stages/storyboard)
6. [Shoot](http://localhost:3000/projects/loom-launch-film/stages/shoot)
7. [Shared call sheet](http://localhost:3000/share/call-sheet/loom-launch-film?preview=1)
8. [Media](http://localhost:3000/projects/loom-launch-film/stages/media)
9. [Edit](http://localhost:3000/projects/loom-launch-film/stages/edit)
10. [Masters](http://localhost:3000/projects/loom-launch-film/stages/masters)
11. [Files](http://localhost:3000/projects/loom-launch-film/files)

Other mock projects remain useful in Videos, Client Dashboard and Chat. They are not complete demonstration projects and should not be treated as substitutes for Launch Film.

## Role navigation

### Studio Staff

- Today
- Videos
- Chat
- People
- Clients
- Brand Kits
- Brief
- Script
- Transcripts
- Shoot
- Shared call sheet
- Edit
- Masters
- Studio onboarding

Studio Staff also has access to project settings, Media and Files through contextual project navigation.

### Studio Freelancer

- Videos
- Chat
- Brand Kits
- Brief
- Script
- Transcripts
- Shoot
- Shared call sheet
- Edit
- Masters
- Studio onboarding

The full People and Clients directories are intentionally unavailable to freelancers.

### Customer

- Dashboard
- Chat
- Brand Kit
- Brief
- Script
- Transcripts
- Shared call sheet
- Edit
- Masters

Shoot planning, project files and Studio setup are intentionally hidden from Customer navigation.

### All pages

All pages exposes all role navigation plus review-only screens:

- Production flow
- Shared Brand Kit
- Sub-brand Kit - Loom AI
- Shared call sheet
- Share controls
- normally hidden project utilities such as project settings, Media and Files remain accessible through their direct routes

The project group is labelled **Demo project - Launch Film**.

## Complete route inventory

### Workspace and directories

| Page | Route | Intended roles | State | Primary implementation |
| --- | --- | --- | --- | --- |
| Today | [`/today`](http://localhost:3000/today) | Studio Staff | Implemented | `src/components/today/TodayPage.tsx` |
| Home alias | [`/`](http://localhost:3000/) | Studio Staff | Compatibility alias for Today | `src/app/page.tsx` |
| Videos | [`/active-videos`](http://localhost:3000/active-videos) | Studio Staff, Studio Freelancer | Implemented | `src/components/active-videos/ActiveVideosPage.tsx` |
| Client Dashboard | [`/customer-dashboard`](http://localhost:3000/customer-dashboard) | Customer | Implemented | `src/components/customer-dashboard/CustomerDashboard.tsx` |
| Chat | [`/chat`](http://localhost:3000/chat) | Shared, with role-specific channels | Implemented | `src/components/chat/ChatPage.tsx` |
| Project Chat | [`/chat?project=loom-launch-film`](http://localhost:3000/chat?project=loom-launch-film) | Shared | Implemented | `src/components/chat/ChatPage.tsx` |
| People | [`/people`](http://localhost:3000/people) | Studio Staff | Implemented | `src/components/people/PeoplePage.tsx` |
| Person profile | [`/people/rb`](http://localhost:3000/people/rb) | Studio Staff | Implemented dynamic route | `src/components/people/PersonProfilePage.tsx` |
| Clients | [`/clients`](http://localhost:3000/clients) | Studio Staff | Implemented | `src/components/clients/ClientsPage.tsx` |
| Client profile | [`/clients/loom`](http://localhost:3000/clients/loom) | Studio Staff, restricted Customer view where applicable | Implemented dynamic route | `src/components/clients/ClientProfilePage.tsx` |
| Brand Kits | [`/brand-kits`](http://localhost:3000/brand-kits) | Studio Staff, Studio Freelancer | Implemented | `src/components/brand-kits/BrandKitPages.tsx` |
| Loom Brand Kit | [`/brand-kits/loom`](http://localhost:3000/brand-kits/loom) | Shared, with role-specific controls | Implemented dynamic route | `src/components/brand-kits/BrandKitPages.tsx` |
| Loom AI sub-brand | [`/brand-kits/loom/loom-ai`](http://localhost:3000/brand-kits/loom/loom-ai) | Studio roles, review-only navigation | Implemented | `src/components/brand-kits/BrandKitPages.tsx` |
| Studio onboarding | [`/studio-onboard`](http://localhost:3000/studio-onboard) | Studio Staff, Studio Freelancer | Implemented | `src/components/studio-onboard/StudioOnboardScreen.tsx` |

### Launch Film project journey

| Page | Route | Intended roles | State | Primary implementation |
| --- | --- | --- | --- | --- |
| Project Overview and settings | [`/projects/loom-launch-film`](http://localhost:3000/projects/loom-launch-film) | Studio Staff | Implemented | `src/components/project/ProjectOverviewPage.tsx` |
| Brief | [`/projects/loom-launch-film/stages/brief`](http://localhost:3000/projects/loom-launch-film/stages/brief) | Shared | Implemented | `src/components/brief/BriefPage.tsx` |
| Script | [`/projects/loom-launch-film/script`](http://localhost:3000/projects/loom-launch-film/script) | Shared | Implemented for the canonical demo project | `src/components/script/ScriptPage.tsx` |
| Transcripts | [`/projects/loom-launch-film/script?subtab=transcripts`](http://localhost:3000/projects/loom-launch-film/script?subtab=transcripts) | Shared | Implemented for the canonical demo project | `src/components/script-transcripts/TranscriptsPanel.tsx` |
| Storyboard | [`/projects/notion-workflows/stages/storyboard`](http://localhost:3000/projects/notion-workflows/stages/storyboard) | Shared | Implemented for an approved animation project | `src/components/storyboard/StoryboardPage.tsx` |
| Shoot | [`/projects/loom-launch-film/stages/shoot`](http://localhost:3000/projects/loom-launch-film/stages/shoot) | Studio Staff, Studio Freelancer | Implemented | `src/components/shoot/ShootStagePage.tsx` |
| Shared call sheet | [`/share/call-sheet/loom-launch-film?preview=1`](http://localhost:3000/share/call-sheet/loom-launch-film?preview=1) | Shared external preview | Implemented | `src/components/shoot/SharedCallSheetPage.tsx` |
| Media | [`/projects/loom-launch-film/stages/media`](http://localhost:3000/projects/loom-launch-film/stages/media) | Shared | Implemented | `src/components/media/MediaStagePage.tsx` |
| Edit | [`/projects/loom-launch-film/stages/edit`](http://localhost:3000/projects/loom-launch-film/stages/edit) | Shared | Implemented, with readiness gate | `src/components/video-review/VideoReviewScreen.tsx` |
| Masters | [`/projects/loom-launch-film/stages/masters`](http://localhost:3000/projects/loom-launch-film/stages/masters) | Shared | Implemented | `src/components/masters/MastersPage.tsx` |
| Files | [`/projects/loom-launch-film/files`](http://localhost:3000/projects/loom-launch-film/files) | Studio roles | Implemented | `src/components/project/ProjectFilesPage.tsx` |

### External, shared and prototype-only pages

| Page | Route | Intended use | State | Primary implementation |
| --- | --- | --- | --- | --- |
| Shared Brand Kit | [`/share/brand/loom-2026`](http://localhost:3000/share/brand/loom-2026) | Guest or external review | Implemented | `src/components/brand-kits/BrandKitPages.tsx` |
| Shared call sheet | [`/share/call-sheet/loom-launch-film?preview=1`](http://localhost:3000/share/call-sheet/loom-launch-film?preview=1) | External production preview | Implemented | `src/components/shoot/SharedCallSheetPage.tsx` |
| Printable call sheet | [`/share/call-sheet/loom-launch-film?print=1`](http://localhost:3000/share/call-sheet/loom-launch-film?print=1) | Print layout review | Implemented | `src/components/shoot/SharedCallSheetPage.tsx` |
| Share controls | [`/share`](http://localhost:3000/share) | Component and interaction review | Experimental review screen | `src/app/share/page.tsx` |
| Production flow | [`/prototype/production-flow`](http://localhost:3000/prototype/production-flow) | Adaptive production template and inline-adjuster review | Experimental review screen | `src/components/production-flow/ProductionFlow.tsx` |
| Review compatibility route | [`/review`](http://localhost:3000/review) | Older direct link to Video Review | Duplicate compatibility route | `src/app/review/page.tsx` |

## Directly addressable empty and alternate states

These links are stable QA shortcuts. They do not require deleting mock data.

| Product area | State | Direct link | Heading or result | Primary action |
| --- | --- | --- | --- | --- |
| Today | No assigned videos | [`/today?preview=empty`](http://localhost:3000/today?preview=empty) | No active videos assigned to you | Open Videos |
| Today | Nothing planned | [`/today?preview=no-results`](http://localhost:3000/today?preview=no-results) | Plan your day | Add time |
| Today | Day complete | [`/today?preview=complete`](http://localhost:3000/today?preview=complete) | You’re clear for today | Plan tomorrow |
| Videos | First-use empty | [`/active-videos?preview=empty`](http://localhost:3000/active-videos?preview=empty) | No videos yet, or No invited videos yet | Add Client, Open Chat or Back to dashboard by role |
| Videos | Filtered empty | [`/active-videos?preview=no-results`](http://localhost:3000/active-videos?preview=no-results) | No videos match these controls | Clear controls |
| Chat | No channels | [`/chat?preview=empty`](http://localhost:3000/chat?preview=empty) | No video conversations yet, or No conversations yet | Open Videos or Back to dashboard |
| People | First-use empty | [`/people?preview=empty`](http://localhost:3000/people?preview=empty) | No people yet | Add person |
| People | Filtered empty | [`/people?preview=no-results`](http://localhost:3000/people?preview=no-results) | No people match these controls | Clear controls |
| Clients | First-use empty | [`/clients?preview=empty`](http://localhost:3000/clients?preview=empty) | Add your first Client | Add Client |
| Clients | Filtered empty | [`/clients?preview=no-results`](http://localhost:3000/clients?preview=no-results) | No Clients match these controls | Clear controls |
| Brand Kits | First-use empty | [`/brand-kits?preview=empty`](http://localhost:3000/brand-kits?preview=empty) | Add a Client to create their Brand Kit | Add Client |
| Brand Kits | Search empty | [`/brand-kits?preview=no-results`](http://localhost:3000/brand-kits?preview=no-results) | No Brand Kits match your search | Clear search |
| Client Dashboard | No projects or activity | [`/customer-dashboard?preview=empty`](http://localhost:3000/customer-dashboard?preview=empty) | Plan your next video and No activity yet | Start Video |
| Client Dashboard | Filtered queue | [`/customer-dashboard?preview=no-results`](http://localhost:3000/customer-dashboard?preview=no-results) | No videos in this view | Show all videos |
| Script | Empty script | [`/projects/loom-launch-film/script?preview=empty`](http://localhost:3000/projects/loom-launch-film/script?preview=empty) | Empty writing canvas | Write the opening line |
| Transcripts | No transcripts | [`/projects/loom-launch-film/script?subtab=transcripts&preview=empty`](http://localhost:3000/projects/loom-launch-film/script?subtab=transcripts&preview=empty) | No dialogue transcripts yet | Open Media |
| Storyboard | Script approval required | [`/projects/hims-product-education/stages/storyboard`](http://localhost:3000/projects/hims-product-education/stages/storyboard) | Approve the Script before creating a Storyboard | Open Script |
| Shoot | Unconfigured production plan | [`/projects/loom-launch-film/stages/shoot?preview=empty`](http://localhost:3000/projects/loom-launch-film/stages/shoot?preview=empty) | Empty schedule, people, locations and shots | Contextual Add actions |
| Shared call sheet | Not ready | [`/share/call-sheet/loom-launch-film?preview=empty`](http://localhost:3000/share/call-sheet/loom-launch-film?preview=empty) | This call sheet isn’t ready yet, or Customer preparation copy | Open Shoot, Back to project or Message production |
| Media | No media | [`/projects/loom-launch-film/stages/media?preview=empty`](http://localhost:3000/projects/loom-launch-film/stages/media?preview=empty) | No media yet | Upload media |
| Media | Filtered empty | [`/projects/loom-launch-film/stages/media?preview=no-results`](http://localhost:3000/projects/loom-launch-film/stages/media?preview=no-results) | No media matches these controls | Clear controls |
| Edit | Prerequisites outstanding | [`/projects/loom-launch-film/stages/edit`](http://localhost:3000/projects/loom-launch-film/stages/edit) | Edit isn’t ready yet | Mark ready to edit, Studio Staff only |
| Masters | No deliverables | [`/projects/loom-launch-film/stages/masters?preview=empty`](http://localhost:3000/projects/loom-launch-film/stages/masters?preview=empty) | No deliverables yet, or No Masters are ready yet | Add deliverable or Message the Studio by role |
| Files | No file locations | [`/projects/loom-launch-film/files?preview=empty`](http://localhost:3000/projects/loom-launch-film/files?preview=empty) | No file location set yet | Save location for Studio Staff |

## In-page empty states and conditional states

These states are implemented but are reached through interaction or data conditions rather than a dedicated URL.

### Chat

- No Client messages yet
- No team messages yet
- No internal messages yet
- Empty channel message list

The channel-list empty state is directly addressable with `?preview=empty`. Individual message-list states depend on the selected channel.

### Client profiles

- No projects yet
  - Copy: Use Start project above and the Client’s private portal will update automatically.
- No Client contacts yet
  - Copy: The Client and portal can exist without a contact. Use Invite contact when ready to share work.
- No Brand Kit yet
  - Action: Add Brand Kit
- No projects shared in the Customer-facing profile

### Brand Kits

- No logos yet
- No fonts yet
- No guidelines yet
- No photo assets yet
- No footage assets yet
- No icons or graphics yet
- No audio assets yet

These are category-level states inside a Brand Kit. They are not currently exposed as separate preview URLs.

### Brief

- No extra versions yet
- No comments yet
- Empty or incomplete brief sections are editable in place
- Approve changes the Brief Stage to Approved; Unapprove returns it to Waiting on client

There is no page-level Brief empty-state preview at present.

### Script and Transcripts

- Empty script writing canvas
- No dialogue transcripts yet
- No highlighted lines yet
- No edits in this session yet
- No comments yet
- Script approval is reversible from the existing approval control

### Shoot

- No schedule entries yet - Add schedule entry
- No shots yet - Add shot
- No people yet - Add person
- No location yet - Add location
- No entries match current filters - Clear filters
- No image references available from the selected source
- Shared call sheet not ready

The Shoot `?preview=empty` shortcut exposes the main first-use states together.

### Media

- No media yet - Upload media
- Empty folder - Upload to this folder
- No media matches controls - Clear controls
- No comments on a file
- Transcript processing
- No transcript available
- Send to Brisk Studios changes the Media Stage to Waiting on Brisk
- Approve changes the Media Stage to Approved
- The complete Media control uses the Stage colour: grey for Not started, pink for Waiting on Brisk, yellow for Waiting on client and green for Approved
- Approved controls use one interactive green status pill, for example `Media approved ▾`
- Opening the pill shows the approval date, approver and the Stage-specific Unapprove action without shifting the surrounding layout
- Customer unapproval returns the Stage to Waiting on client
- Studio Staff unapproval returns the Stage to Waiting on Brisk
- Studio Freelancers cannot approve or unapprove

### Edit

- Edit prerequisites outstanding
- Confirmation of outstanding stages
- No edit versions yet - Upload V1
- Customer waiting state - Message the studio
- Empty comments for a review version
- Version approval is reversible; unapproving returns Edit to Waiting on client

Edit readiness is intentionally local prototype state. Confirming **Mark ready to edit** approves outstanding prerequisites, changes Edit to Waiting on Brisk and reveals Upload V1. The readiness override resets on refresh.

### Masters

- No deliverables yet - Add deliverable
- No Masters ready yet - Message the Studio
- Nothing delivered in a deliverable - Upload V1
- No versions yet - Upload V1
- Deliverable and version approvals can be unapproved from their existing controls

### Files

- No file location set yet
- No file structure notes yet

### People

- No people yet
- No freelancers
- No Client contacts
- No archived people
- No people matching controls
- No projects available when assigning Client access
- No skills, styles, invoices, assessment or portfolio on a Person profile

## Permission and unavailable states

The prototype also includes deliberate permission states. These are not errors or empty data states.

- People directory is private for Customers and restricted for freelancers.
- Clients directory and private Client profiles are restricted outside Studio Staff.
- Project files are hidden from Customers.
- Shoot planning is hidden from Customers, while the shared call sheet remains available.
- Edit’s **Mark ready to edit** action is available only to Studio Staff, representing producers and workspace owners in the simplified prototype role model.
- Customer and freelancer views show reduced project and directory information rather than exposing Studio-only controls.

## Prototype state and persistence

### Resets on refresh

- selected prototype role
- All pages mode
- Media and Edit readiness overrides
- most modal, filter and temporary interaction state

### Stored locally by design

- recent pages in the sidebar
- Videos column order
- Customer Dashboard preferences and shared queue state
- Brand Kit banner dismissal
- project completion records
- project file locations
- shared time entries
- Shoot preferences, call-sheet content and shot-list column widths

### Stored for the current browser tab or session

- Script AI panel position
- Masters-to-Edit recut handoff
- transient Studio notification handoff

When reproducing a first-use state, use the documented `preview` query where possible. Do not clear browser storage unless the behaviour under test specifically requires a clean stored state.

## Source-of-truth files

| Concern | Source |
| --- | --- |
| App routes | `src/app/` |
| Product navigation and role visibility | `src/components/navigation/navigationConfig.ts` |
| Prototype role state | `src/components/navigation/PrototypeRoleContext.tsx` |
| Canonical demo-project registry | `src/data/projects.ts` |
| Project mock records | `src/data/active-videos/mockData.ts` |
| Shared project stage readiness | `src/components/project/ProjectStageStatusContext.tsx` |
| Brisk visual rules | `brisk-design-system.md` |
| Production terminology and stages | `brisk-production-journey.md` |
| Roles and SaaS patterns | `brisk-saas-patterns.md` |
| Visual screen references | `Docs/References/screen-inventory.md` |
| Design review notes | `Docs/yura-review.md` |

## Maintenance rule

Update this handbook whenever any of the following changes:

- a route is added, removed or redirected
- role visibility changes
- a new preview query is introduced
- empty-state copy or action changes
- the canonical demo project changes
- an experimental screen becomes part of the main product navigation

The route registry in code remains authoritative if this document and the running application disagree.
