# Notification event registry

## Status

Foundation product and schema contract for the Brisk prototype. This document does not define backend infrastructure and does not add a notification surface.

The typed source of truth is [`src/data/notification-registry.ts`](../src/data/notification-registry.ts).

## Product model

One canonical domain event can produce:

- One immutable activity entry
- Zero or more audience-specific Internal or External Chat system posts
- Zero or more recipient inbox items with independent read state
- Zero or more external delivery requests and provider attempts

Activity-only events create an audit entry but no inbox item or external delivery. Chat unread state is independent from inbox read state.

## V1 roles and routing attributes

The only permission roles are:

- Studio Staff
- Studio Freelancer
- Customer

Project owner, project lead, reviewer, assigned editor, invoice approver, billing contact and escalation contact are routing responsibilities. They do not create new permission roles.

The typed recipient matrix records which V1 roles are eligible for each responsibility. Eligibility does not guarantee delivery. A person must also pass Studio, project, audience and object-access checks when the event is resolved.

## Registered event structure

Every registry entry defines:

- Versioned stable key
- Actor requirement
- Workspace, project and Stage applicability
- Entity type
- Audience, visibility and recipient responsibilities
- Severity and publication state
- Safe external copy
- Deep-link policy
- Activity, system-post, inbox and email outcomes
- Idempotency and grouping policy
- Quiet-hours and project-mute behaviour
- Retention and privacy classification
- Actor-suppression behaviour

A runtime `CanonicalNotificationEvent` adds the event ID, occurrence time, source-operation ID, actor, entity, optional project and Stage, publication state and safe scalar metadata.

## Stage policy

The Stage type is reused from the active-video model and contains only:

1. Brief
2. Script
3. Shoot
4. Media
5. Edit
6. Masters

Generic Stage events cover submitted, review requested, approved, approval removed, changed after approval, blocked and unblocked. Shoot, Media and Masters add only events that are specific to those Stages.

`project.ready_to_edit` is the canonical cross-Stage event. It represents Brief, Script, Shoot and Media completing together and produces one grouped recipient outcome.

## Publication policy

Call-sheet notification events require a published or withdrawn call sheet.

- Draft creation and editing use `activity.shoot_draft.changed`.
- Previewing, downloading or copying a call-sheet link does not publish it.
- `shoot.call_sheet.published` requires an explicit Publish/Send action.
- Urgent date, time, location and cancellation changes apply only to published details.
- The latest urgent change replaces older unread summaries for the same recipient and call sheet. Audit entries are never replaced.

## Surface policy

| Surface | Contract |
| --- | --- |
| Activity | Always records the authorised canonical event. It has no unread state. |
| System post | Fixed workflow copy in the resolved Internal or External Chat audience. |
| Inbox | Independent recipient item with personal read state. It is not Chat unread state. |
| Delivery | Email only in V1. Retries add provider attempts rather than duplicate events or inbox items. |

Normal project-channel messages stay in Chat and affect Chat unread state only. DMs, mentions and assigned replies are registered because they target a person directly.

## Privacy contract

Privacy rules are evaluated before creating each surface outcome and again when a recipient opens a destination.

- Customer-visible copy cannot contain Internal Chat content, rates, costs, contractor invoices or internal notes.
- Commercial outcomes are restricted to authorised Studio Staff and the affected contractor.
- Security outcomes cannot expose access tokens, credentials, magic links or restricted object details.
- Message content cannot cross its authorised Internal, External or direct-message audience.
- Access-removal outcomes use a safe status or fallback destination rather than the removed object.
- A recipient losing access after delivery must be redirected to an authorised fallback.

## Deep links

The deep-link map distinguishes:

- `existing` - the exact route exists in the prototype
- `base-existing` - the page exists, but exact object selection still needs to be added by the relevant surface ticket
- `planned` - the destination belongs to a later notification, offer, invoice, access or security surface

An event can override its destination by audience. This prevents a Customer from receiving a Studio-only route and prevents a removed recipient from being linked back to restricted content.

The Stage resolver must use the current route patterns:

| Stage | Path within a project |
| --- | --- |
| Brief | `stages/brief` |
| Script | `script` |
| Shoot | `stages/shoot` |
| Media | `stages/media` |
| Edit | `stages/edit` |
| Masters | `stages/masters` |

Customer access is checked separately. A Customer without access to a Studio Stage receives the Customer dashboard or another authorised released surface.

## Precedence

Rules are applied in this order:

1. Security and access-revocation safety
2. Urgent published shoot changes
3. Recipient permissions
4. Required transactional delivery
5. Project mute
6. Quiet hours
7. User preferences
8. Digest and grouping rules

Mute, quiet hours and grouping never grant access. Urgent shoot changes and access or security events may bypass mute or quiet hours only where the registry explicitly declares it.

## Actor suppression

Synchronous success outcomes are suppressed for the actor. The actor remains eligible for:

- Asynchronous completion
- Asynchronous failure
- Delivery failure
- Security events
- Explicitly requested confirmation

Recipient resolution applies suppression after responsibility and permission checks.

## Idempotency

Canonical event identity uses:

`event key + version + workspace + source operation`

Additional identity rules are:

- One inbox item per canonical event and recipient
- One external delivery per canonical event, recipient and channel
- Multiple numbered provider attempts may belong to one external delivery
- Entity-transition events include the entity and source operation
- Provider retries never create another canonical event

## Grouping

Grouping changes presentation only. It never removes activity history or combines recipients before authorisation.

- `collapse` combines repeated outcomes for the same event key and entity.
- `summarise` groups related project outcomes inside a short window.
- `replace` keeps the latest unread state-changing outcome prominent.
- `none` presents the event independently.

## Event catalogue decisions

The typed registry contains the agreed event families for:

- Invitations, Studio access, Customer access and billing access
- Customer video requests and project state
- Generic lifecycle actions across all six Stages
- Published call sheets and affected crew responses
- Media handover, requested media, transcripts and processing failures
- Masters deliverables, recut requests and finalisation
- DMs, mentions, assigned replies, scheduled messages and calls
- Freelancer offers and contractor invoices
- Plan, Stripe and connector action requirements
- Sharing, exports and security
- Explicit activity-only examples

`access.invitation.sent` is the notification event. Creating an unsent draft is not. `masters.recut_brief.sent` routes to the assigned editor, who may be Studio Staff or a Studio Freelancer.

## Seed scenarios

Typed fixtures demonstrate:

- An urgent published call-time change
- A grouped Ready to edit transition
- Safe Customer project-access removal
- Asynchronous transcript completion
- Activity-only foreground upload completion

These fixtures reuse the Loom project, people, Client contacts and Media assets already present in the prototype.

## Boundaries for later tickets

This contract does not implement:

- Notification centre UI or read state
- Activity or Chat system-post rendering
- Recipient resolution
- Email sending or provider transport
- Reminder scheduling
- Settings inheritance
- Connector authentication or inbound messaging

Those features consume this registry rather than creating their own event names, routing rules or privacy policy.
