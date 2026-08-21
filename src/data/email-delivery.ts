import type { StageKey } from "@/components/active-videos/types";
import type { PrototypeRole } from "@/components/navigation/PrototypeRoleContext";
import type { NotificationEventKey } from "@/data/notification-registry";

export type EmailDeliveryFilter = "all" | "reviews" | "reminders" | "failures";
export type EmailDeliveryCaseState = "delivered" | "reminder-due" | "action-completed" | "failed";
export type EmailDeliveryRequestKind = "primary" | "reminder" | "escalation";
export type EmailDeliveryAttemptStatus = "requested" | "sent" | "delivered" | "bounced" | "failed";
export type EmailReminderState = "scheduled" | "sent" | "stopped-action-completed" | "not-required";

export type EmailDeliveryAttempt = {
  id: string;
  attemptNumber: number;
  status: EmailDeliveryAttemptStatus;
  requestedAt: string;
  resolvedAt: string | null;
  providerReference: string | null;
  failureReason: string | null;
};

export type EmailDeliveryRequest = {
  id: string;
  kind: EmailDeliveryRequestKind;
  templateKey: string;
  templateVersion: number;
  destination: string;
  idempotencyKey: string;
  attempts: readonly EmailDeliveryAttempt[];
};

export type EmailReminder = {
  id: string;
  label: string;
  offsetHours: 24 | 48;
  scheduledFor: string;
  state: EmailReminderState;
  stoppedAt: string | null;
  reason: string;
};

export type EmailDeliveryCase = {
  id: string;
  canonicalEventId: string;
  eventKey: NotificationEventKey;
  eventVersion: 1;
  state: EmailDeliveryCaseState;
  subject: string;
  recipient: {
    id: string;
    name: string;
    role: PrototypeRole;
    responsibility: string;
  };
  project: {
    id: string;
    code: string;
    name: string;
    stage: StageKey | null;
  } | null;
  occurredAt: string;
  inAppOutcome: "External system post + inbox item" | "Recipient inbox item" | "Internal system post + inbox item";
  privacy: "Customer-safe workflow" | "Workspace internal";
  safePayload: readonly { label: string; value: string }[];
  requests: readonly EmailDeliveryRequest[];
  reminders: readonly EmailReminder[];
  grouping: {
    label: string;
    windowMinutes: number;
    groupedCount: number;
    previews: readonly string[];
  } | null;
  quietHoursDecision: string;
  projectMuteDecision: string;
  completedAt: string | null;
  failureInboxItemId: string | null;
};

export const emailDeliveryCases = [
  {
    id: "delivery-review-loom-edit-v3",
    canonicalEventId: "event-review-loom-edit-v3",
    eventKey: "stage.review_requested",
    eventVersion: 1,
    state: "reminder-due",
    subject: "LOOM-24 Edit v3 is ready for review",
    recipient: { id: "user-jess", name: "Jess Taylor", role: "Customer", responsibility: "Reviewer" },
    project: { id: "loom-launch-film", code: "LOOM-24", name: "Launch Film - Sales Narrative", stage: "edit" },
    occurredAt: "2026-08-20T11:00:00+10:00",
    inAppOutcome: "External system post + inbox item",
    privacy: "Customer-safe workflow",
    safePayload: [
      { label: "Project", value: "LOOM-24 Launch Film - Sales Narrative" },
      { label: "Stage", value: "Edit" },
      { label: "Version", value: "Edit v3" },
      { label: "CTA", value: "Review Edit" },
    ],
    requests: [{
      id: "email-request-review-loom-edit-v3",
      kind: "primary",
      templateKey: "customer-stage-review-requested",
      templateVersion: 4,
      destination: "jess@loom.com",
      idempotencyKey: "event-review-loom-edit-v3:user-jess:email",
      attempts: [{
        id: "email-attempt-review-loom-edit-v3-1",
        attemptNumber: 1,
        status: "delivered",
        requestedAt: "2026-08-20T11:00:02+10:00",
        resolvedAt: "2026-08-20T11:00:11+10:00",
        providerReference: "em_01K34J9M7F",
        failureReason: null,
      }],
    }],
    reminders: [
      { id: "reminder-review-edit-24", label: "First Customer reminder", offsetHours: 24, scheduledFor: "2026-08-21T11:00:00+10:00", state: "scheduled", stoppedAt: null, reason: "Send only if Edit v3 still needs review." },
      { id: "reminder-review-edit-48", label: "Final Customer reminder", offsetHours: 48, scheduledFor: "2026-08-22T11:00:00+10:00", state: "scheduled", stoppedAt: null, reason: "Escalate to the assigned Studio Staff only after this reminder." },
    ],
    grouping: null,
    quietHoursDecision: "Requested during delivery hours.",
    projectMuteDecision: "Required review delivery takes precedence over routine project mute.",
    completedAt: null,
    failureInboxItemId: null,
  },
  {
    id: "delivery-review-loom-script-v4",
    canonicalEventId: "event-review-loom-script-v4",
    eventKey: "stage.review_requested",
    eventVersion: 1,
    state: "action-completed",
    subject: "LOOM-24 Script v4 is ready for review",
    recipient: { id: "user-jess", name: "Jess Taylor", role: "Customer", responsibility: "Reviewer" },
    project: { id: "loom-launch-film", code: "LOOM-24", name: "Launch Film - Sales Narrative", stage: "script" },
    occurredAt: "2026-08-19T09:30:00+10:00",
    inAppOutcome: "External system post + inbox item",
    privacy: "Customer-safe workflow",
    safePayload: [
      { label: "Project", value: "LOOM-24 Launch Film - Sales Narrative" },
      { label: "Stage", value: "Script" },
      { label: "Version", value: "Script v4" },
      { label: "CTA", value: "Review Script" },
    ],
    requests: [{
      id: "email-request-review-loom-script-v4",
      kind: "primary",
      templateKey: "customer-stage-review-requested",
      templateVersion: 4,
      destination: "jess@loom.com",
      idempotencyKey: "event-review-loom-script-v4:user-jess:email",
      attempts: [{
        id: "email-attempt-review-loom-script-v4-1",
        attemptNumber: 1,
        status: "delivered",
        requestedAt: "2026-08-19T09:30:02+10:00",
        resolvedAt: "2026-08-19T09:30:08+10:00",
        providerReference: "em_01K31J6W2A",
        failureReason: null,
      }],
    }],
    reminders: [
      { id: "reminder-review-script-24", label: "First Customer reminder", offsetHours: 24, scheduledFor: "2026-08-20T09:30:00+10:00", state: "stopped-action-completed", stoppedAt: "2026-08-19T12:35:00+10:00", reason: "Jess approved Script v4 before the reminder was due." },
      { id: "reminder-review-script-48", label: "Final Customer reminder", offsetHours: 48, scheduledFor: "2026-08-21T09:30:00+10:00", state: "stopped-action-completed", stoppedAt: "2026-08-19T12:35:00+10:00", reason: "Required action completed. No escalation was created." },
    ],
    grouping: null,
    quietHoursDecision: "Requested during delivery hours.",
    projectMuteDecision: "Transactional review request delivered once.",
    completedAt: "2026-08-19T12:35:00+10:00",
    failureInboxItemId: null,
  },
  {
    id: "delivery-mentions-hims-edit",
    canonicalEventId: "event-edit-mentions-group-1",
    eventKey: "chat.mention.created",
    eventVersion: 1,
    state: "delivered",
    subject: "You have 5 new mentions in HIMS-18 Edit",
    recipient: { id: "user-tom", name: "Tom Mitchell", role: "Studio Staff", responsibility: "Mentioned person" },
    project: { id: "hims-product-education", code: "HIMS-18", name: "Product Education - Sleep Series", stage: "edit" },
    occurredAt: "2026-08-20T15:42:00+10:00",
    inAppOutcome: "Recipient inbox item",
    privacy: "Workspace internal",
    safePayload: [
      { label: "Project", value: "HIMS-18 Product Education - Sleep Series" },
      { label: "Stage", value: "Edit" },
      { label: "Summary", value: "5 authorised mentions" },
      { label: "CTA", value: "Open mentions" },
    ],
    requests: [{
      id: "email-request-mentions-hims-edit",
      kind: "primary",
      templateKey: "grouped-chat-mentions",
      templateVersion: 2,
      destination: "tom@northstarfilms.com.au",
      idempotencyKey: "event-edit-mentions-group-1:user-tom:email",
      attempts: [{
        id: "email-attempt-mentions-hims-edit-1",
        attemptNumber: 1,
        status: "delivered",
        requestedAt: "2026-08-20T15:57:01+10:00",
        resolvedAt: "2026-08-20T15:57:08+10:00",
        providerReference: "em_01K35M4V8C",
        failureReason: null,
      }],
    }],
    reminders: [],
    grouping: {
      label: "Same project, Stage and recipient",
      windowMinutes: 15,
      groupedCount: 5,
      previews: ["Can you confirm the final product name?", "Please review the colour note on frame 184."],
    },
    quietHoursDecision: "Summary closed before quiet hours.",
    projectMuteDecision: "Explicit mentions are eligible for opted-in email.",
    completedAt: null,
    failureInboxItemId: null,
  },
  {
    id: "delivery-ready-to-edit-loom",
    canonicalEventId: "event-ready-to-edit-1",
    eventKey: "project.ready_to_edit",
    eventVersion: 1,
    state: "delivered",
    subject: "LOOM-24 is ready to edit",
    recipient: { id: "user-nina", name: "Nina Patel", role: "Studio Freelancer", responsibility: "Assigned editor" },
    project: { id: "loom-launch-film", code: "LOOM-24", name: "Launch Film - Sales Narrative", stage: "edit" },
    occurredAt: "2026-08-20T11:05:00+10:00",
    inAppOutcome: "Internal system post + inbox item",
    privacy: "Workspace internal",
    safePayload: [
      { label: "Project", value: "LOOM-24 Launch Film - Sales Narrative" },
      { label: "Transition", value: "Brief, Script, Shoot and Media completed together" },
      { label: "Next Stage", value: "Edit" },
      { label: "CTA", value: "Open Edit" },
    ],
    requests: [{
      id: "email-request-ready-to-edit-loom",
      kind: "primary",
      templateKey: "studio-ready-to-edit",
      templateVersion: 3,
      destination: "nina@northstarfilms.com.au",
      idempotencyKey: "event-ready-to-edit-1:user-nina:email",
      attempts: [{
        id: "email-attempt-ready-to-edit-loom-1",
        attemptNumber: 1,
        status: "delivered",
        requestedAt: "2026-08-20T11:05:02+10:00",
        resolvedAt: "2026-08-20T11:05:12+10:00",
        providerReference: "em_01K34JFX90",
        failureReason: null,
      }],
    }],
    reminders: [],
    grouping: { label: "One workflow transition", windowMinutes: 0, groupedCount: 4, previews: ["Brief, Script, Shoot and Media completed together."] },
    quietHoursDecision: "Requested during delivery hours.",
    projectMuteDecision: "Assigned-work outcome delivered according to personal preference.",
    completedAt: null,
    failureInboxItemId: null,
  },
  {
    id: "delivery-urgent-call-time-loom",
    canonicalEventId: "event-call-sheet-time-change-1",
    eventKey: "shoot.schedule.time_changed",
    eventVersion: 1,
    state: "delivered",
    subject: "Urgent: LOOM-24 crew call changed to 6:30 am",
    recipient: { id: "user-nina", name: "Nina Patel", role: "Studio Freelancer", responsibility: "Assigned crew" },
    project: { id: "loom-launch-film", code: "LOOM-24", name: "Launch Film - Sales Narrative", stage: "shoot" },
    occurredAt: "2026-08-20T22:15:00+10:00",
    inAppOutcome: "Internal system post + inbox item",
    privacy: "Customer-safe workflow",
    safePayload: [
      { label: "Project", value: "LOOM-24 Launch Film - Sales Narrative" },
      { label: "Published change", value: "Crew call changed from 7:00 am to 6:30 am" },
      { label: "Shoot day", value: "Shoot day 1" },
      { label: "CTA", value: "Open call sheet" },
    ],
    requests: [{
      id: "email-request-urgent-call-time-loom",
      kind: "primary",
      templateKey: "urgent-published-shoot-change",
      templateVersion: 2,
      destination: "nina@northstarfilms.com.au",
      idempotencyKey: "event-call-sheet-time-change-1:user-nina:email",
      attempts: [{
        id: "email-attempt-urgent-call-time-loom-1",
        attemptNumber: 1,
        status: "delivered",
        requestedAt: "2026-08-20T22:15:02+10:00",
        resolvedAt: "2026-08-20T22:15:09+10:00",
        providerReference: "em_01K36BYP7Q",
        failureReason: null,
      }],
    }],
    reminders: [],
    grouping: null,
    quietHoursDecision: "Urgent published shoot change bypassed quiet hours.",
    projectMuteDecision: "Urgent published shoot change bypassed project mute.",
    completedAt: null,
    failureInboxItemId: null,
  },
  {
    id: "delivery-failed-deel-review",
    canonicalEventId: "event-review-deel-masters-v2",
    eventKey: "stage.review_requested",
    eventVersion: 1,
    state: "failed",
    subject: "DEEL-18 Masters v2 is ready for review",
    recipient: { id: "user-alex", name: "Alex Morgan", role: "Customer", responsibility: "Reviewer" },
    project: { id: "deel-customer-story", code: "DEEL-18", name: "Customer Story - APAC Hiring", stage: "masters" },
    occurredAt: "2026-08-20T13:10:00+10:00",
    inAppOutcome: "External system post + inbox item",
    privacy: "Customer-safe workflow",
    safePayload: [
      { label: "Project", value: "DEEL-18 Customer Story - APAC Hiring" },
      { label: "Stage", value: "Masters" },
      { label: "Version", value: "Masters v2" },
      { label: "CTA", value: "Review Masters" },
    ],
    requests: [{
      id: "email-request-failed-deel-review",
      kind: "primary",
      templateKey: "customer-stage-review-requested",
      templateVersion: 4,
      destination: "alex@deel.com",
      idempotencyKey: "event-review-deel-masters-v2:user-alex:email",
      attempts: [
        { id: "email-attempt-failed-deel-review-1", attemptNumber: 1, status: "failed", requestedAt: "2026-08-20T13:10:02+10:00", resolvedAt: "2026-08-20T13:10:09+10:00", providerReference: "em_01K34V48RX", failureReason: "Temporary provider rejection" },
        { id: "email-attempt-failed-deel-review-2", attemptNumber: 2, status: "bounced", requestedAt: "2026-08-20T13:15:09+10:00", resolvedAt: "2026-08-20T13:15:17+10:00", providerReference: "em_01K34VGQ21", failureReason: "Recipient mailbox rejected the message" },
        { id: "email-attempt-failed-deel-review-3", attemptNumber: 3, status: "failed", requestedAt: "2026-08-20T13:30:17+10:00", resolvedAt: "2026-08-20T13:30:26+10:00", providerReference: "em_01K34WB91M", failureReason: "Retry limit reached" },
      ],
    }],
    reminders: [
      { id: "reminder-failed-deel-24", label: "First Customer reminder", offsetHours: 24, scheduledFor: "2026-08-21T13:10:00+10:00", state: "not-required", stoppedAt: "2026-08-20T13:30:26+10:00", reason: "Primary delivery failed. Resolve the destination before scheduling reminders." },
      { id: "reminder-failed-deel-48", label: "Final Customer reminder", offsetHours: 48, scheduledFor: "2026-08-22T13:10:00+10:00", state: "not-required", stoppedAt: "2026-08-20T13:30:26+10:00", reason: "No duplicate reminder request was created." },
    ],
    grouping: null,
    quietHoursDecision: "Retry limit was reached before quiet hours.",
    projectMuteDecision: "Delivery failure bypassed project mute for responsible Studio Staff.",
    completedAt: null,
    failureInboxItemId: "inbox-staff-email-failure",
  },
] as const satisfies readonly EmailDeliveryCase[];

export const emailSuppressionDecisions = [
  {
    id: "suppression-normal-chat",
    event: "Normal project Chat message",
    outcome: "Chat unread state only",
    reason: "No mention, assignment or opted-in important-message policy.",
  },
  {
    id: "suppression-action-completed",
    event: "Review reminder",
    outcome: "Email suppressed",
    reason: "The recipient completed the required review before the reminder was requested.",
  },
  {
    id: "suppression-active-recipient",
    event: "Non-urgent fallback",
    outcome: "Email suppressed",
    reason: "The recipient was active in Brisk within the configured product-policy window.",
  },
] as const;

export function getEmailDeliveryCase(caseId: string | null) {
  return emailDeliveryCases.find((deliveryCase) => deliveryCase.id === caseId) ?? emailDeliveryCases[0];
}
