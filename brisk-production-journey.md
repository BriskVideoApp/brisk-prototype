# Skill: Brisk Production Journey

## How to use this skill

- Load alongside the Design System and SaaS Patterns skills for any feature that touches a project, deliverable, or client workflow.
- This skill grounds the AI in how real video production teams work, so screens are filmmaker-first, not generic SaaS.

## Skill file content

```markdown
# Brisk Production Journey Skill

You are designing for video production teams using **Brisk**. Filmmakers think in projects, stages, and deliverables, not generic "tasks". Every screen must respect the production journey below.

## Production phases and stages

Brisk projects use one adaptable production flow assembled from the completed Brief. Always reference the correct phase and Stage when designing a feature.

### Pre-production
1. **Brief** - Client submits or producer captures the project brief.
2. **Script** - Written narrative, scene plan, or a transcript-led paper edit created after filming for interview-led videos.
3. **Storyboard** - Optional approval Stage after Script for animation productions.

### Production
4. **Shoot** - A single Stage containing Pre-production and On Set substages. Pre-production contains Creative Plan and Plan the Day. On Set contains the Call Sheet and live shoot workflow.

**Media** is a permanent project area available throughout the flow. It supports ingest, backup, organisation and transcript generation, but it is not reordered with the production Stages.

Project transcripts live in Media, alongside their source video and audio. Send selected transcript passages into Script to build a paper edit; Script does not own a separate transcript copy or transcript version. Keep Media selected while reviewing transcripts. Do not add an Add from transcripts button to the Script header: Tom explicitly removed that shortcut.

### Post-production
5. **Edit or Animation** - Rough cut through fine cut, or animation production. The label and working language change with the production type while versions, comments and approvals remain consistent.
6. **Masters** - Final exports, delivery files, social cutdowns, file handover, archive.

### Recommended flow templates

- **Existing footage:** Brief → Script → Edit → Masters
- **Scripted shoot:** Brief → Script → Shoot → Edit → Masters
- **Interview-led shoot:** Brief → Shoot → Script → Edit → Masters
- **Animation:** Brief → Script → Storyboard → Animation → Masters
- **Mixed production:** Brief → Script → Shoot → Edit → Masters, with Script revisited after transcripts when required

Studios can reorder, hide and restore supported Stages. Brief remains first, Masters remains last, Storyboard follows Script, and Media remains pinned outside the reorderable flow. Hidden Stage work is preserved. Reset restores the flow recommended by the completed Brief.

When designing, ask: which phase and stage(s) does this feature serve?

> Note: Brisk does **not** currently support Quote, Proposal, Concept, or Treatment flows. These may come later. Do not design around them.

## Conflicting production references

Preserve the implemented flow described above while carrying out this instruction update. Some Notion tickets describe an Option B with separate Shoot Plan and Shoot stages, while this branch groups planning within Shoot. Media status rules also differ between scenarios and older references. If a ticket touches these differences, inspect its intended scenario and current code, surface any material conflict and ask Tom before changing the affected behaviour. Do not silently restore a fixed stage list or remove newer supported features.

## Core entities

- **Project** - one production engagement, from brief to archive.
- **Brief** - the source-of-truth for what's being made.
- **Script** - structured shot, scene, animation, or interview-based plan.
- **Shot list / Schedule** - production planning artefacts (optional per project).
- **Asset** - any file: footage, audio, image, document.
- **Version** - a numbered cut or deliverable iteration.
- **Deliverable** - the final output(s) handed to the client.
- **Approval** - explicit client sign-off on a version or deliverable.
- **Comment** - feedback tied to a frame, timestamp, or document section.

## User roles

The prototype has exactly three access roles, defined in `src/components/navigation/PrototypeRoleContext.tsx`:

- **Studio Staff** - internal Studio team view.
- **Studio Freelancer** - collaborator view scoped to relevant memberships and projects.
- **Customer** - Client-facing view of relevant projects, feedback and approvals.

The former five-role scheme is superseded for the current prototype. Do not add it as separate roles or permission screens. Use **Filmmaker** and **Client** in normal interface copy as defined in `AGENTS.md`; these professional labels do not rename the underlying access roles. The role switcher is a prototype demo control, not real authentication.

## Project structure conventions

- Every project has: a customer (client company), a Studio owner (producer), one or more deliverables, a brief.
- Deadlines come in two flavours:
	- **Client-facing deadline** (delivery date promised to the client)
	- **Internal deadline** (when the team needs it done by)
- Time math uses **working days**, not calendar days. Weekends and public holidays are excluded by default.
- Time logging is at the **Stage**, deliverable, or project level. Do not relabel these production units as generic tasks.

## Statuses

Brisk uses a **two-level status system**. Always design for both levels - they answer different questions.

### Video-level statuses (the queue view)
These describe where a video sits in the studio's workflow. Used for filtering Active Videos and the client portal queue.

- **All** (filter only)
- **Queued** - accepted but not yet started
- **In production** - actively being worked on
- **Completed** - delivered and signed off
- **Paused** - on hold
- **Archived** - closed out

### Within-video statuses (what's happening right now)
These describe the immediate state of an in-production video. Shown alongside the current stage.

- **Waiting on client** - the ball is in the customer's court (approval, feedback, asset upload)
- **Waiting on studio** - the ball is in the production company's court
- **Approved** - the current stage or version has been signed off

Design rule: every In-production video must show both a stage and a within-video status. The client portal should make "Waiting on client" unmissable.

## Versions and approvals (basics)

- Versions are numbered (V1, V2, V3...). Each one carries comments and an approval state.
- Clients see only versions the studio has released. Internal drafts stay internal.
- The latest released version is the default view for clients.
- Approval is explicit, never implied by silence. An approved stage flips the within-video status to **Approved**.

## Active Videos view

- The Studio's home screen. Shows all live videos.
- Each row surfaces: video name, customer, current stage, within-video status, next deadline, working-day countdown, hours logged vs budgeted, primary action.
- Sort by urgency (next deadline) by default.
- Filter by video-level status (Queued, In production, Completed, Paused, Archived), stage, customer, or assigned Filmmaker.

## Client portal

- One customer = one client portal view. They see their queue of videos: Queued, In production, Paused, Completed.
- For each video, they see: brief summary, current stage, latest version, pending approvals, messages, and within-video status (especially "Waiting on you" when it's their turn).
- White-label: shows the Studio's brand (see SaaS Patterns skill).
- Magic-link access is a product experience to demonstrate as UI only, not real authentication (see SaaS Patterns guidance).

## Production-specific terminology

Use the right words. Filmmakers notice when SaaS apps use the wrong language.

- "Shoot" not "event"
- "Talent" not "contact" (for on-camera people)
- "Crew" or "Team" - interchangeable, especially in shoot planning contexts
- "Cut" or "version" not "draft" (for edited video)
- "Paper edit" not "outline" (for transcript-based edit plans)
- "Masters" or "deliverables" not "final files"
- "Brief" not "requirements"
- "Pre-production" not "planning phase"
- "Stage" not "task" (a unit of work inside a video)

## Mobile considerations

- Mobile is a high priority. Brisk is designed **alongside** the desktop app, not after it.
- Every client-facing flow must work on mobile from day one.
- Internal Studio flows (Active Videos, project management) can stay desktop-first, but must remain usable on mobile.

## Do

- Use production terminology.
- Always tag the phase and stage(s) a feature serves.
- Identify which prototype access roles (Studio Staff, Studio Freelancer, Customer) a screen serves. Use Filmmaker and Client in normal interface copy where the exact access distinction is not needed.
- Default to working days for deadlines.
- Make every screen filmmaker-first: think in projects, stages, deliverables.
- Design client flows mobile-first.
- Show both the stage and the within-video status on every in-production video.

## Don't

- Use "Stage" for units inside the production journey. This does not ban development tickets or rename the existing Today to-do area.
- Don't design Quote, Proposal, or Concept flows - they're not in Brisk yet.
- Don't conflate Studio-facing and client-facing views.
- Don't assume calendar-day deadlines.
- Don't bury the latest version under older ones for clients.
- Don't design approval flows that allow approval by silence.
- Don't ship desktop-only client flows.

## British English

- organise, colour, centre, finalise, analyse, favour. Never American spellings.

## Punctuation

- Never em dashes (—). Use hyphens (-).
```
