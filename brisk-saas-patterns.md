# Skill: Brisk SaaS Patterns

## How to use this skill

- Load alongside the Design System skill whenever you're generating onboarding, settings, Studio, role, or client-portal screens.
- This skill governs *behaviour and structure*, not visual styling.

## Skill file content

```markdown
# Brisk SaaS Patterns Skill

You are designing for Brisk, a SaaS platform used by many production companies. Every screen must respect the rules below. They override generic SaaS templates.

This is reusable project guidance, not an installed skill. Latest explicit decisions and the [desktop baseline](Docs/desktop-design-baseline.md) take precedence over historical product suggestions. Reuse the current approved UI and component contracts; this document does not authorise new visual patterns or production services.

## How Brisk is shaped

- Many production companies share one Brisk platform.
- Each production company is a **Studio**. Studios are isolated from each other.
- Clients only ever see one Studio at a time.

## User roles

Brisk has two access-role groups: **Studio** (the production company) and **Customer** (the client side). The only prototype access roles are **Studio Staff**, **Studio Freelancer** and **Customer**. See the Production Journey guidance for role definitions. These are mock-data visibility rules, not production authentication.

### User-facing terminology

- **Filmmaker** means anyone working for or with a Studio, including Studio Staff and Studio Freelancers.
- **Client** means someone on the Customer side.
- Use **Filmmaker** and **Client** in normal interface copy.
- The underlying access roles remain **Studio Staff**, **Studio Freelancer** and **Customer**.
- Show an exact access role only when the distinction affects access, invitations, project visibility, rates, costs, invoices, time tracking or responsibilities.
- **Filmmaker** is a shared professional identity, not an access role.
- Do not rename code types, stored values or permission identifiers purely for this language change.

Every feature must answer: which roles can see it, and which can act on it. Clients never see Studio-only data, and never see another Client's projects.

Studio Staff can open Client-facing screens for any Client in their own Studio. The Client portal opens as a Studio preview, without changing the Staff member's identity or recording Client-authored actions. Client and Studio Freelancer access remains scoped to their own memberships.

## Studio isolation

- Each Studio is intended to have its own data, files, members and branding. Represent this with mock data only in the current front-end prototype.
- Never reference another Studio's data in a screen.
- If a user belongs to multiple Studios, show a Studio switcher in the top-left.

## Onboarding

- A new Studio must be useful within 10 minutes of signup.
- Onboarding ends with a **real project**, not just a configured account.
- Historical suggested flow, not an instruction to replace the approved current V1 onboarding:
	1. Name the Studio + upload logo (white-label from day one)
	2. Invite first team member (skippable)
	3. Create first project (template-seeded)
	4. Preview the client portal ("This is what your client sees")
- Never gate onboarding behind a billing wall.

## White-label

- Follow the recorded 30 September 2026 V1 Studio branding decision in `Docs/ux-decision-log.md`: retain Studio logo upload and Client portal preview; Client portals use Brisk's standard purple accent.
- Studio colour customisation and paid white-label branding controls were removed from the V1 appearance scope. Do not reintroduce them from older screenshots or plan-benefit copy. Preserve existing saved colour data.
- The longer-term white-label ambition and plan catalogue do not authorise changing current portal appearance, footers, prices or entitlements. Resolve a material conflict with Tom when a ticket depends on it.
- Studio identity does not create an additional Studio Owner access role. Preserve the three access roles and the approved Staff preview behaviour.

## Client experience

- Demonstrate the intended password-free magic-link experience as UI only. Do not add real authentication, email delivery or backend services.
- First-time access prompts name + email only, not a full signup.
- Returning clients are remembered by email.
- Client portal shows only relevant items: deliverables, approvals, messages.
- Expired link copy: "This link has expired. Contact your producer." (Plain English, no jargon.)
- Multi-stakeholder clients: clarify who can approve. Approval roles must be explicit.

## Plan-aware UI

- Show locked features, don't hide them.
- Locked treatment: kit's lock badge + tooltip naming the required plan.
- Upgrade flow: one click from the locked feature to the plan comparison.
- Never show features that don't exist on any plan.

## Permissions copy

- If a user can't do something, explain why in plain English.
- Bad: "Insufficient permissions."
- Good: "Only Studio Staff can manage Studio settings in this prototype."
- Name the relevant prototype role when access matters without suggesting production access controls are implemented.

## Empty states (SaaS-specific)

- First-time Studio: "Your first project is one click away."
- Empty team: "Invite your first collaborator."
- Empty client list: "Add a client to start a project."
- Empty state always shows the primary CTA in the kit's primary button.

## Settings scopes

Three settings scopes, never mixed:
1. **Personal** (your profile, your notifications)
2. **Studio** (company name, branding, members, billing)
3. **Project** (project-level settings, client access, deliverables)

Each scope has its own settings entry point.

## Project naming

Show a unique project code before the editable project name when a Client starts a video. Follow [the project naming conventions](Docs/project-naming-conventions.md) for Client codes, edit versions, email subjects and invoices.

## Do

- Design for the right role first, then check the others.
- Show locked features with a clear path to upgrade.
- Use magic links for clients.
- Make every empty state lead to action.
- Preserve the approved V1 Studio logo and standard-purple portal treatment; do not restore older custom-branding controls.
- Follow Tom's desktop-first design sequence in `AGENTS.md`, including Client-facing flows. Fix and sign off the full desktop UI before the mobile pass; defer mobile-only work and routine mobile verification unless explicitly requested. Preserve existing responsive behaviour.

## Don't

- Don't hide unavailable features.
- Don't require clients to create accounts.
- Don't gate onboarding behind billing.
- Don't change Client portal branding or plan-related appearance based on superseded white-label suggestions.
- Don't mix personal, Studio, and project settings.
- Don't write "insufficient permissions" as user-facing copy.

## British English

- organise, colour, centre, finalise, analyse, favour. Never American spellings.

## Punctuation

- Never em dashes (—). Use hyphens (-).
```
