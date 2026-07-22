# Skill: Brisk Production Journey

## How to use this skill

- Load alongside the Design System and SaaS Patterns skills for any feature that touches a project, deliverable, or client workflow.
- This skill grounds the AI in how real video production teams work, so screens are filmmaker-first, not generic SaaS.

## Skill file content

```markdown
# Brisk Production Journey Skill

You are designing for video production teams using **Brisk**. Filmmakers think in projects, stages, and deliverables, not generic "tasks". Every screen must respect the production journey below.

## Production phases and stages

Brisk projects flow through three production phases, made up of six named stages. Always reference the correct phase and stage when designing a feature.

### Pre-production
1. **Brief** - Client submits or producer captures the project brief.
2. **Script** - Written narrative, interview structure, shot structure, or scene plan.

### Production
3. **Shoot** - Filming sessions, interviews, b-roll capture, on-set workflow.
4. **Media** - Ingest, backup, organisation of captured assets. Transcripts generated here.

### Post-production
5. **Edit** - Rough cut through fine cut, versioning, revisions, paper edits, colour, audio, captions.
6. **Masters** - Final exports, delivery files, social cutdowns, file handover, archive.

When designing, ask: which phase and stage(s) does this feature serve?

> Note: Brisk does **not** currently support Quote, Proposal, Concept, or Treatment flows. These may come later. Do not design around them.

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

Brisk has two role groups: **Studio** (the production company) and **Customer** (the client).

### Studio
- **Studio Owner** - full super-admin. Can edit anything, including billing and subscription.
- **Studio Manager** - same as Owner, minus billing and subscription.
- **Filmmaker** - reduced permissions. Sees only assigned projects. Covers producers, editors, shooters, and other crew. Stage-level access is configurable per project.

### Customer
- **Account Owner** - sees all projects for their company. Invites users, manages subscription and company details.
- **Teammate** - sees and edits only the projects they're assigned to.

When designing, always ask: which role is this screen for, and what should they see vs not see?

## Project structure conventions

- Every project has: a customer (client company), a Studio owner (producer), one or more deliverables, a brief.
- Deadlines come in two flavours:
	- **Client-facing deadline** (delivery date promised to the client)
	- **Internal deadline** (when the team needs it done by)
- Time math uses **working days**, not calendar days. Weekends and public holidays are excluded by default.
- Time logging is at the **Stage**, deliverable, or project level. Never use the word "task".

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
- Magic-link access, no signup required (see SaaS Patterns skill).

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
- Always tag the role(s) (Studio Owner, Studio Manager, Filmmaker, Account Owner, Teammate) a screen serves.
- Default to working days for deadlines.
- Make every screen filmmaker-first: think in projects, stages, deliverables.
- Design client flows mobile-first.
- Show both the stage and the within-video status on every in-production video.

## Don't

- Don't use generic project-management language ("task", "ticket", "sprint"). Use "Stage".
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
