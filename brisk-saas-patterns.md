# Skill: Brisk SaaS Patterns

## How to use this skill

- Load alongside the Design System skill whenever you're generating onboarding, settings, Studio, role, or client-portal screens.
- This skill governs *behaviour and structure*, not visual styling.

## Skill file content

```markdown
# Brisk SaaS Patterns Skill

You are designing for Brisk, a SaaS platform used by many production companies. Every screen must respect the rules below. They override generic SaaS templates.

## How Brisk is shaped

- Many production companies share one Brisk platform.
- Each production company is a **Studio**. Studios are isolated from each other.
- Clients only ever see one Studio at a time.

## User roles

Brisk has two role groups: **Studio** (the production company) and **Customer** (the client). See the Production Journey skill for full role definitions.

### Studio roles
1. **Studio Owner** - founder/director of the production company. Full super-admin including billing and subscription.
2. **Studio Manager** - same as Owner, minus billing and subscription.
3. **Filmmaker** - reduced permissions. Sees only assigned projects. Covers producers, editors, shooters, and other crew. Stage-level access is configurable per project.

### Customer roles
4. **Account Owner** - sees all projects for their company. Invites users, manages subscription and company details.
5. **Teammate** - sees and edits only the projects they're assigned to.

Every feature must answer: which roles can see it, and which can act on it. Customers never see Studio-only data, and never see another customer's projects.

## Studio isolation

- Each Studio has its own data, files, members, and branding.
- Never reference another Studio's data in a screen.
- If a user belongs to multiple Studios, show a Studio switcher in the top-left.

## Onboarding

- A new Studio must be useful within 10 minutes of signup.
- Onboarding ends with a **real project**, not just a configured account.
- Suggested flow:
	1. Name the Studio + upload logo (white-label from day one)
	2. Invite first team member (skippable)
	3. Create first project (template-seeded)
	4. Preview the client portal ("This is what your client sees")
- Never gate onboarding behind a billing wall.

## White-label

- Clients see the production company's brand, not Brisk's.
- Studio Owner uploads logo, sets primary colour (within neo-brutalism constraints from the kit).
- Brisk branding is hidden in client-facing views by default.
- Lower-tier plans may include a small "Powered by Brisk" footer.
- Internal team views may show Brisk branding lightly; client views never.

## Client experience

- Magic-link access only. No password required for clients.
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
- Good: "Only Studio Owners can change billing. Ask Tom (Studio Owner) for access."
- Always name the role that *can* do the action.

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

## Do

- Design for the right role first, then check the others.
- Show locked features with a clear path to upgrade.
- Use magic links for clients.
- Make every empty state lead to action.
- Apply white-label by default.
- Design every client-facing flow to work on mobile from day one.

## Don't

- Don't hide unavailable features.
- Don't require clients to create accounts.
- Don't gate onboarding behind billing.
- Don't leak Brisk branding into client views (above free tier).
- Don't mix personal, Studio, and project settings.
- Don't write "insufficient permissions" as user-facing copy.

## British English

- organise, colour, centre, finalise, analyse, favour. Never American spellings.

## Punctuation

- Never em dashes (—). Use hyphens (-).
```