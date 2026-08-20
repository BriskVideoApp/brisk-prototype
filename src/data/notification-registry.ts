import type { StageKey } from "@/components/active-videos/types";
import type { PersonAccessRole } from "@/data/people";

export const notificationStages = [
  "brief",
  "script",
  "shoot",
  "media",
  "edit",
  "masters",
] as const satisfies readonly StageKey[];

export type NotificationRole = PersonAccessRole;
export type NotificationAudience = "studio" | "customer" | "affected-person";
export type NotificationVisibility = "internal" | "external" | "recipient-private";
export type NotificationSeverity = "info" | "success" | "warning" | "urgent";
export type NotificationPublicationState = "draft" | "published" | "withdrawn";
export type NotificationFamily =
  | "access"
  | "project"
  | "stage"
  | "shoot"
  | "media"
  | "masters"
  | "chat"
  | "freelancer"
  | "costs"
  | "billing"
  | "integration"
  | "sharing"
  | "export"
  | "security"
  | "activity";

export type NotificationResponsibility =
  | "affected-person"
  | "assigned-crew"
  | "assigned-editor"
  | "assigned-replier"
  | "billing-contact"
  | "customer-project-member"
  | "escalation-contact"
  | "integration-contact"
  | "invoice-approver"
  | "invoice-submitter"
  | "mentioned-person"
  | "message-recipient"
  | "offer-recipient"
  | "project-lead"
  | "project-member"
  | "project-owner"
  | "requester"
  | "reviewer"
  | "security-contact";

export type NotificationEntityType =
  | "invitation"
  | "person-access"
  | "client"
  | "client-contact"
  | "project"
  | "stage"
  | "call-sheet"
  | "call-sheet-recipient"
  | "media-asset"
  | "transcript"
  | "deliverable"
  | "deliverable-version"
  | "message"
  | "call"
  | "offer"
  | "invoice"
  | "subscription"
  | "integration"
  | "share"
  | "export"
  | "security-event"
  | "brand-kit"
  | "file-location"
  | "time-entry"
  | "settings";

export type NotificationPrivacyClassification =
  | "customer-safe-workflow"
  | "workspace-internal"
  | "commercial-confidential"
  | "personal-message"
  | "security-sensitive";

export type NotificationRetention =
  | "project-history"
  | "workspace-audit"
  | "billing-record"
  | "security-audit";

export type NotificationStageApplicability =
  | StageKey
  | "event-stage"
  | readonly StageKey[]
  | null;

export type NotificationDeepLinkTarget =
  | "access-status"
  | "person-access"
  | "client-access"
  | "customer-dashboard"
  | "project-overview"
  | "project-stage"
  | "call-sheet"
  | "media-asset"
  | "masters-deliverable"
  | "chat-message"
  | "chat-call"
  | "project-costs"
  | "outstanding-invoice"
  | "contractor-invoice"
  | "freelancer-offer"
  | "plan-billing"
  | "client-billing"
  | "notification-settings"
  | "personal-security"
  | "brand-kit"
  | "shared-content"
  | "project-files"
  | "today"
  | null;

export type NotificationDeepLinkPolicy = {
  default: NotificationDeepLinkTarget;
  audienceOverrides: Partial<Record<NotificationAudience, NotificationDeepLinkTarget>>;
};

export type NotificationExternalCopy = {
  title: string;
  body: string;
  ctaLabel: string;
};

export type NotificationOutcomeContract = {
  activity: "always";
  systemPost: "none" | "internal" | "external" | "internal-and-external" | "resolved-audience";
  inbox: "none" | "resolved-recipients";
  delivery: "none" | "email-immediate" | "email-if-unread" | "email-reminder";
};

export const notificationSurfaceContract = {
  activity: {
    readState: false,
    rule: "One immutable audit entry records each canonical event in its authorised scope.",
  },
  systemPost: {
    readState: false,
    rule: "A fixed workflow post may be written to an authorised Internal or External Chat audience.",
  },
  inbox: {
    readState: true,
    rule: "Each resolved recipient receives an independent item. Chat unread state remains separate.",
  },
  delivery: {
    readState: false,
    v1Channels: ["email"],
    rule: "A delivery request may have multiple provider attempts without creating another inbox item.",
  },
} as const;

export const notificationActorSuppressionContract = {
  default: "Suppress synchronous success outcomes for the actor.",
  exceptions: [
    "asynchronous completion",
    "asynchronous failure",
    "delivery failure",
    "security event",
    "explicitly requested confirmation",
  ],
} as const;

export const notificationChannelContract = {
  v1: ["in-app", "email"],
  v1_5: ["whatsapp", "browser-push"],
  later: ["slack", "teams"],
  rule: "Only email is selectable as an external V1 delivery channel. Unavailable channels remain visibly phase-gated.",
} as const;

export type NotificationGroupingRule = {
  strategy: "none" | "collapse" | "summarise" | "replace";
  keyParts: readonly ("event-key" | "workspace" | "project" | "stage" | "entity" | "recipient")[];
  windowMinutes: number;
};

export type NotificationIdempotencyRule = {
  scope: "source-operation" | "entity-transition" | "provider-attempt";
  keyParts: readonly ("event-key" | "version" | "workspace" | "source-operation" | "entity" | "recipient" | "channel")[];
};

export type NotificationEventDefinition = {
  version: 1;
  family: NotificationFamily;
  actor: "person-required" | "person-or-system";
  workspace: "required";
  project: "required" | "optional" | "none";
  stage: NotificationStageApplicability;
  entityType: NotificationEntityType;
  audiences: readonly NotificationAudience[];
  recipientResponsibilities: readonly NotificationResponsibility[];
  visibility: readonly NotificationVisibility[];
  severity: NotificationSeverity;
  publicationStates: readonly NotificationPublicationState[] | null;
  safeExternalCopy: NotificationExternalCopy | null;
  deepLink: NotificationDeepLinkTarget | NotificationDeepLinkPolicy;
  activityOnly: boolean;
  outcomes: NotificationOutcomeContract;
  idempotency: NotificationIdempotencyRule;
  grouping: NotificationGroupingRule;
  quietHours: "respect" | "queue-until-end" | "bypass";
  projectMute: "respect" | "bypass";
  retention: NotificationRetention;
  privacy: NotificationPrivacyClassification;
  actorSuppression: "suppress-synchronous-success" | "include";
};

type RegisteredEventInput = Omit<
  NotificationEventDefinition,
  "version" | "actor" | "workspace" | "idempotency"
> & {
  actor?: NotificationEventDefinition["actor"];
  idempotency?: NotificationIdempotencyRule;
};

const sourceOperationIdempotency: NotificationIdempotencyRule = {
  scope: "source-operation",
  keyParts: ["event-key", "version", "workspace", "source-operation"],
};

const transitionIdempotency: NotificationIdempotencyRule = {
  scope: "entity-transition",
  keyParts: ["event-key", "version", "workspace", "entity", "source-operation"],
};

const noGrouping: NotificationGroupingRule = {
  strategy: "none",
  keyParts: [],
  windowMinutes: 0,
};

const projectGrouping: NotificationGroupingRule = {
  strategy: "summarise",
  keyParts: ["event-key", "workspace", "project", "recipient"],
  windowMinutes: 15,
};

const entityGrouping: NotificationGroupingRule = {
  strategy: "collapse",
  keyParts: ["event-key", "workspace", "project", "entity", "recipient"],
  windowMinutes: 10,
};

const replacementGrouping: NotificationGroupingRule = {
  strategy: "replace",
  keyParts: ["event-key", "workspace", "project", "entity", "recipient"],
  windowMinutes: 60,
};

const activityOnlyOutcomes: NotificationOutcomeContract = {
  activity: "always",
  systemPost: "none",
  inbox: "none",
  delivery: "none",
};

const internalActionOutcomes: NotificationOutcomeContract = {
  activity: "always",
  systemPost: "internal",
  inbox: "resolved-recipients",
  delivery: "email-if-unread",
};

const audienceActionOutcomes: NotificationOutcomeContract = {
  activity: "always",
  systemPost: "resolved-audience",
  inbox: "resolved-recipients",
  delivery: "email-immediate",
};

const privateActionOutcomes: NotificationOutcomeContract = {
  activity: "always",
  systemPost: "none",
  inbox: "resolved-recipients",
  delivery: "email-immediate",
};

const inboxFirstOutcomes: NotificationOutcomeContract = {
  activity: "always",
  systemPost: "none",
  inbox: "resolved-recipients",
  delivery: "email-if-unread",
};

function registerEvent(input: RegisteredEventInput): NotificationEventDefinition {
  return {
    version: 1,
    actor: input.actor ?? "person-or-system",
    workspace: "required",
    idempotency: input.idempotency ?? sourceOperationIdempotency,
    ...input,
  };
}

function externalCopy(title: string, body: string, ctaLabel: string): NotificationExternalCopy {
  return { title, body, ctaLabel };
}

function audienceLink(
  defaultTarget: NotificationDeepLinkTarget,
  audienceOverrides: NotificationDeepLinkPolicy["audienceOverrides"],
): NotificationDeepLinkPolicy {
  return { default: defaultTarget, audienceOverrides };
}

export const notificationEventRegistry = {
  "access.invitation.sent": registerEvent({
    family: "access", project: "optional", stage: null, entityType: "invitation",
    audiences: ["affected-person", "studio"], recipientResponsibilities: ["affected-person", "project-lead"],
    visibility: ["recipient-private", "internal"], severity: "info", publicationStates: null,
    safeExternalCopy: externalCopy("You’re invited to Brisk", "Open your invitation to join the Studio or project.", "Open invitation"),
    deepLink: "access-status", activityOnly: false, outcomes: privateActionOutcomes,
    grouping: replacementGrouping, quietHours: "respect", projectMute: "bypass", retention: "workspace-audit",
    privacy: "security-sensitive", actorSuppression: "suppress-synchronous-success",
  }),
  "access.invitation.resent": registerEvent({
    family: "access", project: "optional", stage: null, entityType: "invitation",
    audiences: ["affected-person"], recipientResponsibilities: ["affected-person"], visibility: ["recipient-private"],
    severity: "info", publicationStates: null,
    safeExternalCopy: externalCopy("Your Brisk invitation", "Your invitation has been sent again.", "Open invitation"),
    deepLink: "access-status", activityOnly: false, outcomes: privateActionOutcomes,
    grouping: replacementGrouping, quietHours: "respect", projectMute: "bypass", retention: "workspace-audit",
    privacy: "security-sensitive", actorSuppression: "suppress-synchronous-success",
  }),
  "access.invitation.cancelled": registerEvent({
    family: "access", project: "optional", stage: null, entityType: "invitation",
    audiences: ["affected-person", "studio"], recipientResponsibilities: ["affected-person", "project-lead"],
    visibility: ["recipient-private", "internal"], severity: "warning", publicationStates: null,
    safeExternalCopy: externalCopy("Invitation cancelled", "This Brisk invitation is no longer active.", "View access status"),
    deepLink: "access-status", activityOnly: false, outcomes: privateActionOutcomes,
    grouping: replacementGrouping, quietHours: "respect", projectMute: "bypass", retention: "workspace-audit",
    privacy: "security-sensitive", actorSuppression: "suppress-synchronous-success",
  }),
  "access.invitation.accepted": registerEvent({
    family: "access", project: "optional", stage: null, entityType: "invitation",
    audiences: ["studio"], recipientResponsibilities: ["project-lead"], visibility: ["internal"], severity: "success",
    publicationStates: null, safeExternalCopy: null, deepLink: "person-access", activityOnly: false,
    outcomes: internalActionOutcomes, grouping: entityGrouping, quietHours: "respect", projectMute: "bypass",
    retention: "workspace-audit", privacy: "workspace-internal", actorSuppression: "suppress-synchronous-success",
  }),
  "access.invitation.expired": registerEvent({
    family: "access", project: "optional", stage: null, entityType: "invitation",
    audiences: ["affected-person", "studio"], recipientResponsibilities: ["affected-person", "project-lead"],
    visibility: ["recipient-private", "internal"], severity: "warning", publicationStates: null,
    safeExternalCopy: externalCopy("Invitation expired", "Ask your Studio contact to send a new invitation.", "View access status"),
    deepLink: "access-status", activityOnly: false, outcomes: privateActionOutcomes,
    grouping: replacementGrouping, quietHours: "respect", projectMute: "bypass", retention: "workspace-audit",
    privacy: "security-sensitive", actorSuppression: "include",
  }),
  "access.studio.paused": registerEvent({
    family: "access", project: "none", stage: null, entityType: "person-access",
    audiences: ["affected-person", "studio"], recipientResponsibilities: ["affected-person", "security-contact"],
    visibility: ["recipient-private", "internal"], severity: "warning", publicationStates: null,
    safeExternalCopy: externalCopy("Studio access paused", "Your Studio access has been paused. Contact the Studio if you need help.", "View access status"),
    deepLink: "access-status", activityOnly: false, outcomes: privateActionOutcomes,
    grouping: replacementGrouping, quietHours: "bypass", projectMute: "bypass", retention: "security-audit",
    privacy: "security-sensitive", actorSuppression: "include", idempotency: transitionIdempotency,
  }),
  "access.studio.removed": registerEvent({
    family: "access", project: "none", stage: null, entityType: "person-access",
    audiences: ["affected-person", "studio"], recipientResponsibilities: ["affected-person", "security-contact"],
    visibility: ["recipient-private", "internal"], severity: "urgent", publicationStates: null,
    safeExternalCopy: externalCopy("Studio access removed", "You no longer have access to this Studio. Contact the Studio if this is unexpected.", "View access status"),
    deepLink: "access-status", activityOnly: false, outcomes: privateActionOutcomes,
    grouping: replacementGrouping, quietHours: "bypass", projectMute: "bypass", retention: "security-audit",
    privacy: "security-sensitive", actorSuppression: "include", idempotency: transitionIdempotency,
  }),
  "access.studio.restored": registerEvent({
    family: "access", project: "none", stage: null, entityType: "person-access",
    audiences: ["affected-person", "studio"], recipientResponsibilities: ["affected-person", "security-contact"],
    visibility: ["recipient-private", "internal"], severity: "success", publicationStates: null,
    safeExternalCopy: externalCopy("Studio access restored", "Your access to the Studio has been restored.", "Open Studio"),
    deepLink: audienceLink("person-access", { "affected-person": "access-status" }), activityOnly: false, outcomes: privateActionOutcomes,
    grouping: replacementGrouping, quietHours: "respect", projectMute: "bypass", retention: "security-audit",
    privacy: "security-sensitive", actorSuppression: "suppress-synchronous-success", idempotency: transitionIdempotency,
  }),
  "access.customer_portal.changed": registerEvent({
    family: "access", project: "none", stage: null, entityType: "client-contact",
    audiences: ["affected-person", "studio"], recipientResponsibilities: ["affected-person", "project-owner"],
    visibility: ["recipient-private", "internal"], severity: "warning", publicationStates: null,
    safeExternalCopy: externalCopy("Portal access changed", "Your access to the Customer portal has changed.", "View access status"),
    deepLink: "access-status", activityOnly: false, outcomes: privateActionOutcomes,
    grouping: replacementGrouping, quietHours: "bypass", projectMute: "bypass", retention: "security-audit",
    privacy: "security-sensitive", actorSuppression: "include", idempotency: transitionIdempotency,
  }),
  "access.customer_project.added": registerEvent({
    family: "access", project: "required", stage: null, entityType: "client-contact",
    audiences: ["affected-person", "studio"], recipientResponsibilities: ["affected-person", "project-owner"],
    visibility: ["recipient-private", "internal"], severity: "success", publicationStates: null,
    safeExternalCopy: externalCopy("Project access added", "You can now access this video in the Customer portal.", "Open video"),
    deepLink: "project-overview", activityOnly: false, outcomes: privateActionOutcomes,
    grouping: entityGrouping, quietHours: "respect", projectMute: "bypass", retention: "security-audit",
    privacy: "security-sensitive", actorSuppression: "suppress-synchronous-success", idempotency: transitionIdempotency,
  }),
  "access.customer_project.changed": registerEvent({
    family: "access", project: "required", stage: null, entityType: "client-contact",
    audiences: ["affected-person", "studio"], recipientResponsibilities: ["affected-person", "project-owner"],
    visibility: ["recipient-private", "internal"], severity: "info", publicationStates: null,
    safeExternalCopy: externalCopy("Project access changed", "The videos available to you have changed.", "Open Customer portal"),
    deepLink: "customer-dashboard", activityOnly: false, outcomes: privateActionOutcomes,
    grouping: entityGrouping, quietHours: "respect", projectMute: "bypass", retention: "security-audit",
    privacy: "security-sensitive", actorSuppression: "suppress-synchronous-success", idempotency: transitionIdempotency,
  }),
  "access.customer_project.removed": registerEvent({
    family: "access", project: "required", stage: null, entityType: "client-contact",
    audiences: ["affected-person", "studio"], recipientResponsibilities: ["affected-person", "project-owner"],
    visibility: ["recipient-private", "internal"], severity: "warning", publicationStates: null,
    safeExternalCopy: externalCopy("Project access removed", "You no longer have access to this video.", "Open Customer portal"),
    deepLink: "customer-dashboard", activityOnly: false, outcomes: privateActionOutcomes,
    grouping: entityGrouping, quietHours: "bypass", projectMute: "bypass", retention: "security-audit",
    privacy: "security-sensitive", actorSuppression: "include", idempotency: transitionIdempotency,
  }),
  "access.client.archived": registerEvent({
    family: "access", project: "none", stage: null, entityType: "client",
    audiences: ["customer", "studio"], recipientResponsibilities: ["customer-project-member", "project-owner"],
    visibility: ["recipient-private", "internal"], severity: "warning", publicationStates: null,
    safeExternalCopy: externalCopy("Customer portal paused", "Portal access has been paused because this Client was archived.", "View access status"),
    deepLink: "access-status", activityOnly: false, outcomes: privateActionOutcomes,
    grouping: projectGrouping, quietHours: "bypass", projectMute: "bypass", retention: "security-audit",
    privacy: "security-sensitive", actorSuppression: "include", idempotency: transitionIdempotency,
  }),
  "access.client.restored": registerEvent({
    family: "access", project: "none", stage: null, entityType: "client",
    audiences: ["customer", "studio"], recipientResponsibilities: ["customer-project-member", "project-owner"],
    visibility: ["recipient-private", "internal"], severity: "success", publicationStates: null,
    safeExternalCopy: externalCopy("Customer portal restored", "Portal access has been restored.", "Open Customer portal"),
    deepLink: audienceLink("client-access", { customer: "customer-dashboard" }), activityOnly: false, outcomes: privateActionOutcomes,
    grouping: projectGrouping, quietHours: "respect", projectMute: "bypass", retention: "security-audit",
    privacy: "security-sensitive", actorSuppression: "suppress-synchronous-success", idempotency: transitionIdempotency,
  }),
  "access.billing.granted": registerEvent({
    family: "access", project: "none", stage: null, entityType: "person-access",
    audiences: ["affected-person", "studio"], recipientResponsibilities: ["affected-person", "billing-contact"],
    visibility: ["recipient-private", "internal"], severity: "info", publicationStates: null,
    safeExternalCopy: externalCopy("Billing access granted", "You can now manage Studio billing.", "Open billing"),
    deepLink: "plan-billing", activityOnly: false, outcomes: privateActionOutcomes,
    grouping: entityGrouping, quietHours: "respect", projectMute: "bypass", retention: "security-audit",
    privacy: "security-sensitive", actorSuppression: "suppress-synchronous-success", idempotency: transitionIdempotency,
  }),
  "access.billing.revoked": registerEvent({
    family: "access", project: "none", stage: null, entityType: "person-access",
    audiences: ["affected-person", "studio"], recipientResponsibilities: ["affected-person", "billing-contact"],
    visibility: ["recipient-private", "internal"], severity: "warning", publicationStates: null,
    safeExternalCopy: externalCopy("Billing access removed", "You no longer have access to Studio billing.", "View access status"),
    deepLink: "access-status", activityOnly: false, outcomes: privateActionOutcomes,
    grouping: entityGrouping, quietHours: "bypass", projectMute: "bypass", retention: "security-audit",
    privacy: "security-sensitive", actorSuppression: "include", idempotency: transitionIdempotency,
  }),

  "project.video_request.submitted": registerEvent({
    family: "project", actor: "person-required", project: "optional", stage: "brief", entityType: "project",
    audiences: ["studio"], recipientResponsibilities: ["project-owner", "project-lead"], visibility: ["internal"],
    severity: "info", publicationStates: null, safeExternalCopy: null, deepLink: "project-overview",
    activityOnly: false, outcomes: internalActionOutcomes, grouping: entityGrouping, quietHours: "respect",
    projectMute: "respect", retention: "project-history", privacy: "workspace-internal",
    actorSuppression: "suppress-synchronous-success",
  }),
  "project.pause.requested": registerEvent({
    family: "project", actor: "person-required", project: "required", stage: null, entityType: "project",
    audiences: ["studio"], recipientResponsibilities: ["project-owner", "project-lead"], visibility: ["internal"],
    severity: "warning", publicationStates: null, safeExternalCopy: null, deepLink: "project-overview",
    activityOnly: false, outcomes: internalActionOutcomes, grouping: replacementGrouping, quietHours: "respect",
    projectMute: "respect", retention: "project-history", privacy: "workspace-internal",
    actorSuppression: "suppress-synchronous-success",
  }),
  "project.resume.requested": registerEvent({
    family: "project", actor: "person-required", project: "required", stage: null, entityType: "project",
    audiences: ["studio"], recipientResponsibilities: ["project-owner", "project-lead"], visibility: ["internal"],
    severity: "info", publicationStates: null, safeExternalCopy: null, deepLink: "project-overview",
    activityOnly: false, outcomes: internalActionOutcomes, grouping: replacementGrouping, quietHours: "respect",
    projectMute: "respect", retention: "project-history", privacy: "workspace-internal",
    actorSuppression: "suppress-synchronous-success",
  }),
  "project.request.accepted": registerEvent({
    family: "project", project: "required", stage: "brief", entityType: "project",
    audiences: ["customer", "studio"], recipientResponsibilities: ["requester", "project-lead"],
    visibility: ["external", "internal"], severity: "success", publicationStates: null,
    safeExternalCopy: externalCopy("Video request accepted", "Your video request has been accepted by the Studio.", "Open video"),
    deepLink: audienceLink("project-overview", { customer: "customer-dashboard" }), activityOnly: false, outcomes: audienceActionOutcomes,
    grouping: entityGrouping, quietHours: "respect", projectMute: "respect", retention: "project-history",
    privacy: "customer-safe-workflow", actorSuppression: "suppress-synchronous-success", idempotency: transitionIdempotency,
  }),
  "project.request.returned_to_queue": registerEvent({
    family: "project", project: "required", stage: null, entityType: "project",
    audiences: ["customer", "studio"], recipientResponsibilities: ["requester", "project-lead"],
    visibility: ["external", "internal"], severity: "info", publicationStates: null,
    safeExternalCopy: externalCopy("Video returned to the queue", "Your video is queued until the Studio is ready to continue.", "Open video"),
    deepLink: audienceLink("project-overview", { customer: "customer-dashboard" }), activityOnly: false, outcomes: audienceActionOutcomes,
    grouping: entityGrouping, quietHours: "respect", projectMute: "respect", retention: "project-history",
    privacy: "customer-safe-workflow", actorSuppression: "suppress-synchronous-success", idempotency: transitionIdempotency,
  }),
  "project.reopened": registerEvent({
    family: "project", project: "required", stage: "masters", entityType: "project",
    audiences: ["customer", "studio"], recipientResponsibilities: ["project-owner", "project-lead", "customer-project-member"],
    visibility: ["external", "internal"], severity: "warning", publicationStates: null,
    safeExternalCopy: externalCopy("Video reopened", "This completed video has been reopened for further work.", "Open video"),
    deepLink: audienceLink("project-overview", { customer: "customer-dashboard" }), activityOnly: false, outcomes: audienceActionOutcomes,
    grouping: replacementGrouping, quietHours: "respect", projectMute: "respect", retention: "project-history",
    privacy: "customer-safe-workflow", actorSuppression: "suppress-synchronous-success", idempotency: transitionIdempotency,
  }),
  "project.responsibility.assigned": registerEvent({
    family: "project", project: "required", stage: null, entityType: "project",
    audiences: ["affected-person", "studio"], recipientResponsibilities: ["affected-person", "project-owner"],
    visibility: ["recipient-private", "internal"], severity: "info", publicationStates: null,
    safeExternalCopy: externalCopy("Project responsibility assigned", "You have been assigned responsibility on this video.", "Open video"),
    deepLink: "project-overview", activityOnly: false, outcomes: privateActionOutcomes,
    grouping: entityGrouping, quietHours: "respect", projectMute: "bypass", retention: "project-history",
    privacy: "workspace-internal", actorSuppression: "suppress-synchronous-success", idempotency: transitionIdempotency,
  }),
  "project.responsibility.changed": registerEvent({
    family: "project", project: "required", stage: null, entityType: "project",
    audiences: ["affected-person", "studio"], recipientResponsibilities: ["affected-person", "project-owner"],
    visibility: ["recipient-private", "internal"], severity: "warning", publicationStates: null,
    safeExternalCopy: externalCopy("Project responsibility changed", "Your responsibility on this video has changed.", "Open video"),
    deepLink: "project-overview", activityOnly: false, outcomes: privateActionOutcomes,
    grouping: entityGrouping, quietHours: "respect", projectMute: "bypass", retention: "project-history",
    privacy: "workspace-internal", actorSuppression: "include", idempotency: transitionIdempotency,
  }),
  "project.blocked": registerEvent({
    family: "project", project: "required", stage: null, entityType: "project",
    audiences: ["studio"], recipientResponsibilities: ["project-owner", "project-lead", "escalation-contact"],
    visibility: ["internal"], severity: "urgent", publicationStates: null, safeExternalCopy: null,
    deepLink: "project-overview", activityOnly: false, outcomes: internalActionOutcomes,
    grouping: replacementGrouping, quietHours: "bypass", projectMute: "bypass", retention: "project-history",
    privacy: "workspace-internal", actorSuppression: "include", idempotency: transitionIdempotency,
  }),
  "project.unblocked": registerEvent({
    family: "project", project: "required", stage: null, entityType: "project",
    audiences: ["studio"], recipientResponsibilities: ["project-owner", "project-lead"], visibility: ["internal"],
    severity: "success", publicationStates: null, safeExternalCopy: null, deepLink: "project-overview",
    activityOnly: false, outcomes: internalActionOutcomes, grouping: replacementGrouping, quietHours: "respect",
    projectMute: "respect", retention: "project-history", privacy: "workspace-internal",
    actorSuppression: "suppress-synchronous-success", idempotency: transitionIdempotency,
  }),
  "project.created": registerEvent({
    family: "activity", actor: "person-required", project: "required", stage: "brief", entityType: "project",
    audiences: ["studio"], recipientResponsibilities: [], visibility: ["internal"], severity: "info",
    publicationStates: null, safeExternalCopy: null, deepLink: null, activityOnly: true,
    outcomes: activityOnlyOutcomes, grouping: noGrouping, quietHours: "respect", projectMute: "respect",
    retention: "project-history", privacy: "workspace-internal", actorSuppression: "suppress-synchronous-success",
  }),

  "stage.submitted": registerEvent({
    family: "stage", actor: "person-required", project: "required", stage: "event-stage", entityType: "stage",
    audiences: ["studio"], recipientResponsibilities: ["project-lead", "reviewer"], visibility: ["internal"],
    severity: "info", publicationStates: ["published"], safeExternalCopy: null, deepLink: "project-stage",
    activityOnly: false, outcomes: internalActionOutcomes, grouping: entityGrouping, quietHours: "respect",
    projectMute: "respect", retention: "project-history", privacy: "workspace-internal",
    actorSuppression: "suppress-synchronous-success",
  }),
  "stage.review_requested": registerEvent({
    family: "stage", actor: "person-required", project: "required", stage: "event-stage", entityType: "stage",
    audiences: ["customer", "studio"], recipientResponsibilities: ["reviewer"],
    visibility: ["external", "internal", "recipient-private"], severity: "info", publicationStates: ["published"],
    safeExternalCopy: externalCopy("Review requested", "A production Stage is ready for your review.", "Review Stage"),
    deepLink: "project-stage", activityOnly: false, outcomes: audienceActionOutcomes,
    grouping: entityGrouping, quietHours: "respect", projectMute: "respect", retention: "project-history",
    privacy: "customer-safe-workflow", actorSuppression: "suppress-synchronous-success",
  }),
  "stage.approved": registerEvent({
    family: "stage", actor: "person-required", project: "required", stage: "event-stage", entityType: "stage",
    audiences: ["customer", "studio"], recipientResponsibilities: ["project-lead", "reviewer", "assigned-editor"],
    visibility: ["external", "internal"], severity: "success", publicationStates: ["published"],
    safeExternalCopy: externalCopy("Stage approved", "The production Stage has been approved.", "Open Stage"),
    deepLink: "project-stage", activityOnly: false, outcomes: audienceActionOutcomes,
    grouping: entityGrouping, quietHours: "respect", projectMute: "respect", retention: "project-history",
    privacy: "customer-safe-workflow", actorSuppression: "suppress-synchronous-success", idempotency: transitionIdempotency,
  }),
  "stage.approval_removed": registerEvent({
    family: "stage", actor: "person-required", project: "required", stage: "event-stage", entityType: "stage",
    audiences: ["customer", "studio"], recipientResponsibilities: ["project-lead", "reviewer", "assigned-editor"],
    visibility: ["external", "internal"], severity: "warning", publicationStates: ["published"],
    safeExternalCopy: externalCopy("Stage approval removed", "This Stage is ready for review again.", "Review Stage"),
    deepLink: "project-stage", activityOnly: false, outcomes: audienceActionOutcomes,
    grouping: replacementGrouping, quietHours: "respect", projectMute: "respect", retention: "project-history",
    privacy: "customer-safe-workflow", actorSuppression: "include", idempotency: transitionIdempotency,
  }),
  "stage.changed_after_approval": registerEvent({
    family: "stage", project: "required", stage: "event-stage", entityType: "stage",
    audiences: ["customer", "studio"], recipientResponsibilities: ["project-lead", "reviewer", "assigned-editor"],
    visibility: ["external", "internal"], severity: "warning", publicationStates: ["published"],
    safeExternalCopy: externalCopy("Approved Stage changed", "A previously approved Stage has changed and may need another review.", "Review changes"),
    deepLink: "project-stage", activityOnly: false, outcomes: audienceActionOutcomes,
    grouping: replacementGrouping, quietHours: "respect", projectMute: "respect", retention: "project-history",
    privacy: "customer-safe-workflow", actorSuppression: "include", idempotency: transitionIdempotency,
  }),
  "stage.blocked": registerEvent({
    family: "stage", project: "required", stage: "event-stage", entityType: "stage",
    audiences: ["studio"], recipientResponsibilities: ["project-owner", "project-lead", "escalation-contact"],
    visibility: ["internal"], severity: "urgent", publicationStates: null, safeExternalCopy: null,
    deepLink: "project-stage", activityOnly: false, outcomes: internalActionOutcomes,
    grouping: replacementGrouping, quietHours: "bypass", projectMute: "bypass", retention: "project-history",
    privacy: "workspace-internal", actorSuppression: "include", idempotency: transitionIdempotency,
  }),
  "stage.unblocked": registerEvent({
    family: "stage", project: "required", stage: "event-stage", entityType: "stage",
    audiences: ["studio"], recipientResponsibilities: ["project-owner", "project-lead"], visibility: ["internal"],
    severity: "success", publicationStates: null, safeExternalCopy: null, deepLink: "project-stage",
    activityOnly: false, outcomes: internalActionOutcomes, grouping: replacementGrouping, quietHours: "respect",
    projectMute: "respect", retention: "project-history", privacy: "workspace-internal",
    actorSuppression: "suppress-synchronous-success", idempotency: transitionIdempotency,
  }),
  "project.ready_to_edit": registerEvent({
    family: "stage", actor: "person-required", project: "required",
    stage: ["brief", "script", "shoot", "media"], entityType: "project", audiences: ["studio"],
    recipientResponsibilities: ["project-lead", "assigned-editor"], visibility: ["internal"], severity: "success",
    publicationStates: ["published"], safeExternalCopy: null, deepLink: "project-stage", activityOnly: false,
    outcomes: internalActionOutcomes, grouping: replacementGrouping, quietHours: "respect", projectMute: "respect",
    retention: "project-history", privacy: "workspace-internal", actorSuppression: "suppress-synchronous-success",
    idempotency: transitionIdempotency,
  }),

  "shoot.call_sheet.published": registerEvent({
    family: "shoot", actor: "person-required", project: "required", stage: "shoot", entityType: "call-sheet",
    audiences: ["customer", "studio", "affected-person"], recipientResponsibilities: ["assigned-crew", "customer-project-member", "project-lead"],
    visibility: ["external", "internal", "recipient-private"], severity: "info", publicationStates: ["published"],
    safeExternalCopy: externalCopy("Call sheet published", "The call sheet is ready with the latest shoot details.", "Open call sheet"),
    deepLink: "call-sheet", activityOnly: false, outcomes: audienceActionOutcomes,
    grouping: entityGrouping, quietHours: "respect", projectMute: "respect", retention: "project-history",
    privacy: "customer-safe-workflow", actorSuppression: "suppress-synchronous-success", idempotency: transitionIdempotency,
  }),
  "shoot.call_sheet.materially_changed": registerEvent({
    family: "shoot", actor: "person-required", project: "required", stage: "shoot", entityType: "call-sheet",
    audiences: ["customer", "studio", "affected-person"], recipientResponsibilities: ["assigned-crew", "customer-project-member", "project-lead"],
    visibility: ["external", "internal", "recipient-private"], severity: "warning", publicationStates: ["published"],
    safeExternalCopy: externalCopy("Call sheet updated", "Important shoot details have changed. Review the latest call sheet.", "Review changes"),
    deepLink: "call-sheet", activityOnly: false, outcomes: audienceActionOutcomes,
    grouping: replacementGrouping, quietHours: "bypass", projectMute: "bypass", retention: "project-history",
    privacy: "customer-safe-workflow", actorSuppression: "include", idempotency: transitionIdempotency,
  }),
  "shoot.call_sheet.withdrawn": registerEvent({
    family: "shoot", actor: "person-required", project: "required", stage: "shoot", entityType: "call-sheet",
    audiences: ["customer", "studio", "affected-person"], recipientResponsibilities: ["assigned-crew", "customer-project-member", "project-lead"],
    visibility: ["external", "internal", "recipient-private"], severity: "urgent", publicationStates: ["withdrawn"],
    safeExternalCopy: externalCopy("Call sheet withdrawn", "The published call sheet has been withdrawn. Wait for updated shoot details.", "View shoot status"),
    deepLink: audienceLink("project-stage", { customer: "customer-dashboard" }), activityOnly: false, outcomes: audienceActionOutcomes,
    grouping: replacementGrouping, quietHours: "bypass", projectMute: "bypass", retention: "project-history",
    privacy: "customer-safe-workflow", actorSuppression: "include", idempotency: transitionIdempotency,
  }),
  "shoot.call_sheet.recipient_added": registerEvent({
    family: "shoot", actor: "person-required", project: "required", stage: "shoot", entityType: "call-sheet-recipient",
    audiences: ["affected-person", "studio"], recipientResponsibilities: ["affected-person", "project-lead"],
    visibility: ["recipient-private", "internal"], severity: "info", publicationStates: ["published"],
    safeExternalCopy: externalCopy("Added to a call sheet", "You have been added to a published call sheet.", "Open call sheet"),
    deepLink: "call-sheet", activityOnly: false, outcomes: privateActionOutcomes,
    grouping: entityGrouping, quietHours: "respect", projectMute: "respect", retention: "project-history",
    privacy: "customer-safe-workflow", actorSuppression: "suppress-synchronous-success", idempotency: transitionIdempotency,
  }),
  "shoot.call_sheet.recipient_removed": registerEvent({
    family: "shoot", actor: "person-required", project: "required", stage: "shoot", entityType: "call-sheet-recipient",
    audiences: ["affected-person", "studio"], recipientResponsibilities: ["affected-person", "project-lead"],
    visibility: ["recipient-private", "internal"], severity: "warning", publicationStates: ["published"],
    safeExternalCopy: externalCopy("Removed from a call sheet", "You are no longer included on this published call sheet.", "View shoot status"),
    deepLink: "project-stage", activityOnly: false, outcomes: privateActionOutcomes,
    grouping: entityGrouping, quietHours: "respect", projectMute: "bypass", retention: "project-history",
    privacy: "customer-safe-workflow", actorSuppression: "include", idempotency: transitionIdempotency,
  }),
  "shoot.crew.accepted": registerEvent({
    family: "shoot", actor: "person-required", project: "required", stage: "shoot", entityType: "call-sheet-recipient",
    audiences: ["studio"], recipientResponsibilities: ["project-lead"], visibility: ["internal"], severity: "success",
    publicationStates: ["published"], safeExternalCopy: null, deepLink: "call-sheet", activityOnly: false,
    outcomes: internalActionOutcomes, grouping: entityGrouping, quietHours: "respect", projectMute: "respect",
    retention: "project-history", privacy: "workspace-internal", actorSuppression: "suppress-synchronous-success",
  }),
  "shoot.crew.declined": registerEvent({
    family: "shoot", actor: "person-required", project: "required", stage: "shoot", entityType: "call-sheet-recipient",
    audiences: ["studio"], recipientResponsibilities: ["project-lead", "escalation-contact"], visibility: ["internal"],
    severity: "urgent", publicationStates: ["published"], safeExternalCopy: null, deepLink: "call-sheet",
    activityOnly: false, outcomes: internalActionOutcomes, grouping: entityGrouping, quietHours: "bypass",
    projectMute: "bypass", retention: "project-history", privacy: "workspace-internal", actorSuppression: "include",
  }),
  "shoot.schedule.date_changed": registerEvent({
    family: "shoot", actor: "person-required", project: "required", stage: "shoot", entityType: "call-sheet",
    audiences: ["customer", "studio", "affected-person"], recipientResponsibilities: ["assigned-crew", "customer-project-member", "project-lead"],
    visibility: ["external", "internal", "recipient-private"], severity: "urgent", publicationStates: ["published"],
    safeExternalCopy: externalCopy("Shoot date changed", "The published shoot date has changed. Review the latest call sheet.", "Open call sheet"),
    deepLink: "call-sheet", activityOnly: false, outcomes: audienceActionOutcomes,
    grouping: replacementGrouping, quietHours: "bypass", projectMute: "bypass", retention: "project-history",
    privacy: "customer-safe-workflow", actorSuppression: "include", idempotency: transitionIdempotency,
  }),
  "shoot.schedule.time_changed": registerEvent({
    family: "shoot", actor: "person-required", project: "required", stage: "shoot", entityType: "call-sheet",
    audiences: ["customer", "studio", "affected-person"], recipientResponsibilities: ["assigned-crew", "customer-project-member", "project-lead"],
    visibility: ["external", "internal", "recipient-private"], severity: "urgent", publicationStates: ["published"],
    safeExternalCopy: externalCopy("Shoot time changed", "A published call time has changed. Review the latest call sheet.", "Open call sheet"),
    deepLink: "call-sheet", activityOnly: false, outcomes: audienceActionOutcomes,
    grouping: replacementGrouping, quietHours: "bypass", projectMute: "bypass", retention: "project-history",
    privacy: "customer-safe-workflow", actorSuppression: "include", idempotency: transitionIdempotency,
  }),
  "shoot.schedule.location_changed": registerEvent({
    family: "shoot", actor: "person-required", project: "required", stage: "shoot", entityType: "call-sheet",
    audiences: ["customer", "studio", "affected-person"], recipientResponsibilities: ["assigned-crew", "customer-project-member", "project-lead"],
    visibility: ["external", "internal", "recipient-private"], severity: "urgent", publicationStates: ["published"],
    safeExternalCopy: externalCopy("Shoot location changed", "A published shoot location has changed. Review the latest call sheet.", "Open call sheet"),
    deepLink: "call-sheet", activityOnly: false, outcomes: audienceActionOutcomes,
    grouping: replacementGrouping, quietHours: "bypass", projectMute: "bypass", retention: "project-history",
    privacy: "customer-safe-workflow", actorSuppression: "include", idempotency: transitionIdempotency,
  }),
  "shoot.schedule.cancelled": registerEvent({
    family: "shoot", actor: "person-required", project: "required", stage: "shoot", entityType: "call-sheet",
    audiences: ["customer", "studio", "affected-person"], recipientResponsibilities: ["assigned-crew", "customer-project-member", "project-lead"],
    visibility: ["external", "internal", "recipient-private"], severity: "urgent", publicationStates: ["published"],
    safeExternalCopy: externalCopy("Shoot cancelled", "The published shoot has been cancelled.", "View shoot status"),
    deepLink: audienceLink("project-stage", { customer: "customer-dashboard" }), activityOnly: false, outcomes: audienceActionOutcomes,
    grouping: replacementGrouping, quietHours: "bypass", projectMute: "bypass", retention: "project-history",
    privacy: "customer-safe-workflow", actorSuppression: "include", idempotency: transitionIdempotency,
  }),

  "media.sent_to_studio": registerEvent({
    family: "media", actor: "person-required", project: "required", stage: "media", entityType: "media-asset",
    audiences: ["studio"], recipientResponsibilities: ["project-lead", "assigned-editor"], visibility: ["internal"],
    severity: "info", publicationStates: ["published"], safeExternalCopy: null, deepLink: "media-asset",
    activityOnly: false, outcomes: internalActionOutcomes, grouping: projectGrouping, quietHours: "respect",
    projectMute: "respect", retention: "project-history", privacy: "workspace-internal",
    actorSuppression: "suppress-synchronous-success",
  }),
  "media.request.fulfilled": registerEvent({
    family: "media", project: "required", stage: "media", entityType: "media-asset",
    audiences: ["customer", "studio"], recipientResponsibilities: ["requester", "project-lead", "assigned-editor"],
    visibility: ["external", "internal"], severity: "success", publicationStates: ["published"],
    safeExternalCopy: externalCopy("Requested media uploaded", "Requested media is now available for this video.", "Open media"),
    deepLink: "media-asset", activityOnly: false, outcomes: audienceActionOutcomes,
    grouping: projectGrouping, quietHours: "respect", projectMute: "respect", retention: "project-history",
    privacy: "customer-safe-workflow", actorSuppression: "include",
  }),
  "media.transcript.ready": registerEvent({
    family: "media", project: "required", stage: "media", entityType: "transcript",
    audiences: ["affected-person", "studio"], recipientResponsibilities: ["requester", "assigned-editor"],
    visibility: ["recipient-private", "internal"], severity: "success", publicationStates: null,
    safeExternalCopy: externalCopy("Transcript ready", "The requested transcript is ready to review.", "Open transcript"),
    deepLink: "media-asset", activityOnly: false, outcomes: inboxFirstOutcomes,
    grouping: projectGrouping, quietHours: "respect", projectMute: "respect", retention: "project-history",
    privacy: "workspace-internal", actorSuppression: "include",
  }),
  "media.transcript.failed": registerEvent({
    family: "media", project: "required", stage: "media", entityType: "transcript",
    audiences: ["affected-person", "studio"], recipientResponsibilities: ["requester", "assigned-editor", "project-lead"],
    visibility: ["recipient-private", "internal"], severity: "warning", publicationStates: null,
    safeExternalCopy: externalCopy("Transcript failed", "Brisk could not create the requested transcript.", "Review media"),
    deepLink: "media-asset", activityOnly: false, outcomes: inboxFirstOutcomes,
    grouping: replacementGrouping, quietHours: "respect", projectMute: "bypass", retention: "project-history",
    privacy: "workspace-internal", actorSuppression: "include",
  }),
  "media.storage_import.failed": registerEvent({
    family: "media", project: "required", stage: "media", entityType: "media-asset",
    audiences: ["affected-person", "studio"], recipientResponsibilities: ["requester", "integration-contact", "project-lead"],
    visibility: ["recipient-private", "internal"], severity: "warning", publicationStates: null,
    safeExternalCopy: null, deepLink: "media-asset", activityOnly: false, outcomes: inboxFirstOutcomes,
    grouping: replacementGrouping, quietHours: "respect", projectMute: "bypass", retention: "project-history",
    privacy: "workspace-internal", actorSuppression: "include",
  }),
  "media.processing.failed": registerEvent({
    family: "media", project: "required", stage: "media", entityType: "media-asset",
    audiences: ["affected-person", "studio"], recipientResponsibilities: ["requester", "assigned-editor", "project-lead"],
    visibility: ["recipient-private", "internal"], severity: "warning", publicationStates: null,
    safeExternalCopy: externalCopy("Media processing failed", "Brisk could not finish processing an uploaded file.", "Review media"),
    deepLink: "media-asset", activityOnly: false, outcomes: inboxFirstOutcomes,
    grouping: replacementGrouping, quietHours: "respect", projectMute: "bypass", retention: "project-history",
    privacy: "workspace-internal", actorSuppression: "include",
  }),

  "masters.version.ready": registerEvent({
    family: "masters", project: "required", stage: "masters", entityType: "deliverable-version",
    audiences: ["customer", "studio"], recipientResponsibilities: ["reviewer", "project-lead"],
    visibility: ["external", "internal"], severity: "info", publicationStates: ["published"],
    safeExternalCopy: externalCopy("Deliverable ready", "A deliverable version is ready for your review.", "Review deliverable"),
    deepLink: "masters-deliverable", activityOnly: false, outcomes: audienceActionOutcomes,
    grouping: projectGrouping, quietHours: "respect", projectMute: "respect", retention: "project-history",
    privacy: "customer-safe-workflow", actorSuppression: "suppress-synchronous-success",
  }),
  "masters.deliverable.approved": registerEvent({
    family: "masters", actor: "person-required", project: "required", stage: "masters", entityType: "deliverable",
    audiences: ["customer", "studio"], recipientResponsibilities: ["project-lead", "assigned-editor", "reviewer"],
    visibility: ["external", "internal"], severity: "success", publicationStates: ["published"],
    safeExternalCopy: externalCopy("Deliverable approved", "A deliverable has been approved.", "Open deliverable"),
    deepLink: "masters-deliverable", activityOnly: false, outcomes: audienceActionOutcomes,
    grouping: entityGrouping, quietHours: "respect", projectMute: "respect", retention: "project-history",
    privacy: "customer-safe-workflow", actorSuppression: "suppress-synchronous-success", idempotency: transitionIdempotency,
  }),
  "masters.deliverable.approval_removed": registerEvent({
    family: "masters", actor: "person-required", project: "required", stage: "masters", entityType: "deliverable",
    audiences: ["customer", "studio"], recipientResponsibilities: ["project-lead", "assigned-editor", "reviewer"],
    visibility: ["external", "internal"], severity: "warning", publicationStates: ["published"],
    safeExternalCopy: externalCopy("Deliverable approval removed", "This deliverable is ready for review again.", "Review deliverable"),
    deepLink: "masters-deliverable", activityOnly: false, outcomes: audienceActionOutcomes,
    grouping: replacementGrouping, quietHours: "respect", projectMute: "respect", retention: "project-history",
    privacy: "customer-safe-workflow", actorSuppression: "include", idempotency: transitionIdempotency,
  }),
  "masters.bulk_approved": registerEvent({
    family: "masters", actor: "person-required", project: "required", stage: "masters", entityType: "project",
    audiences: ["customer", "studio"], recipientResponsibilities: ["project-lead", "assigned-editor", "reviewer"],
    visibility: ["external", "internal"], severity: "success", publicationStates: ["published"],
    safeExternalCopy: externalCopy("Deliverables approved", "The selected deliverables have been approved together.", "Open Masters"),
    deepLink: "masters-deliverable", activityOnly: false, outcomes: audienceActionOutcomes,
    grouping: replacementGrouping, quietHours: "respect", projectMute: "respect", retention: "project-history",
    privacy: "customer-safe-workflow", actorSuppression: "suppress-synchronous-success", idempotency: transitionIdempotency,
  }),
  "masters.cutdown.requested": registerEvent({
    family: "masters", actor: "person-required", project: "required", stage: "masters", entityType: "deliverable",
    audiences: ["studio"], recipientResponsibilities: ["project-lead", "assigned-editor"], visibility: ["internal"],
    severity: "info", publicationStates: ["published"], safeExternalCopy: null, deepLink: "masters-deliverable",
    activityOnly: false, outcomes: internalActionOutcomes, grouping: projectGrouping, quietHours: "respect",
    projectMute: "respect", retention: "project-history", privacy: "workspace-internal",
    actorSuppression: "suppress-synchronous-success",
  }),
  "masters.reformat.requested": registerEvent({
    family: "masters", actor: "person-required", project: "required", stage: "masters", entityType: "deliverable",
    audiences: ["studio"], recipientResponsibilities: ["project-lead", "assigned-editor"], visibility: ["internal"],
    severity: "info", publicationStates: ["published"], safeExternalCopy: null, deepLink: "masters-deliverable",
    activityOnly: false, outcomes: internalActionOutcomes, grouping: projectGrouping, quietHours: "respect",
    projectMute: "respect", retention: "project-history", privacy: "workspace-internal",
    actorSuppression: "suppress-synchronous-success",
  }),
  "masters.recut_brief.sent": registerEvent({
    family: "masters", actor: "person-required", project: "required", stage: "masters", entityType: "deliverable",
    audiences: ["studio", "affected-person"], recipientResponsibilities: ["assigned-editor", "project-lead"],
    visibility: ["internal", "recipient-private"], severity: "info", publicationStates: ["published"],
    safeExternalCopy: externalCopy("New recut brief", "A recut brief has been assigned to you.", "Open recut brief"),
    deepLink: "masters-deliverable", activityOnly: false, outcomes: internalActionOutcomes,
    grouping: entityGrouping, quietHours: "respect", projectMute: "respect", retention: "project-history",
    privacy: "workspace-internal", actorSuppression: "suppress-synchronous-success",
  }),
  "project.finalised": registerEvent({
    family: "masters", actor: "person-required", project: "required", stage: "masters", entityType: "project",
    audiences: ["customer", "studio"], recipientResponsibilities: ["customer-project-member", "project-owner", "project-lead"],
    visibility: ["external", "internal"], severity: "success", publicationStates: ["published"],
    safeExternalCopy: externalCopy("Video finalised", "Your approved deliverables are ready.", "Open Masters"),
    deepLink: "masters-deliverable", activityOnly: false, outcomes: audienceActionOutcomes,
    grouping: replacementGrouping, quietHours: "respect", projectMute: "respect", retention: "project-history",
    privacy: "customer-safe-workflow", actorSuppression: "suppress-synchronous-success", idempotency: transitionIdempotency,
  }),
  "project.completion_undone": registerEvent({
    family: "masters", actor: "person-required", project: "required", stage: "masters", entityType: "project",
    audiences: ["customer", "studio"], recipientResponsibilities: ["customer-project-member", "project-owner", "project-lead"],
    visibility: ["external", "internal"], severity: "warning", publicationStates: ["published"],
    safeExternalCopy: externalCopy("Video completion undone", "This video has returned to production.", "Open video"),
    deepLink: audienceLink("project-overview", { customer: "customer-dashboard" }), activityOnly: false, outcomes: audienceActionOutcomes,
    grouping: replacementGrouping, quietHours: "respect", projectMute: "respect", retention: "project-history",
    privacy: "customer-safe-workflow", actorSuppression: "include", idempotency: transitionIdempotency,
  }),

  "chat.dm.received": registerEvent({
    family: "chat", actor: "person-required", project: "optional", stage: null, entityType: "message",
    audiences: ["affected-person"], recipientResponsibilities: ["message-recipient"], visibility: ["recipient-private"],
    severity: "info", publicationStates: ["published"],
    safeExternalCopy: externalCopy("New direct message", "You have a new direct message in Brisk.", "Open message"),
    deepLink: "chat-message", activityOnly: false, outcomes: inboxFirstOutcomes,
    grouping: projectGrouping, quietHours: "respect", projectMute: "respect", retention: "project-history",
    privacy: "personal-message", actorSuppression: "suppress-synchronous-success",
  }),
  "chat.mention.created": registerEvent({
    family: "chat", actor: "person-required", project: "optional", stage: null, entityType: "message",
    audiences: ["affected-person"], recipientResponsibilities: ["mentioned-person"], visibility: ["recipient-private"],
    severity: "info", publicationStates: ["published"],
    safeExternalCopy: externalCopy("You were mentioned", "Someone mentioned you in Brisk Chat.", "Open mention"),
    deepLink: "chat-message", activityOnly: false, outcomes: inboxFirstOutcomes,
    grouping: entityGrouping, quietHours: "respect", projectMute: "respect", retention: "project-history",
    privacy: "personal-message", actorSuppression: "suppress-synchronous-success",
  }),
  "chat.reply.assigned": registerEvent({
    family: "chat", actor: "person-required", project: "optional", stage: null, entityType: "message",
    audiences: ["affected-person"], recipientResponsibilities: ["assigned-replier"], visibility: ["recipient-private"],
    severity: "info", publicationStates: ["published"],
    safeExternalCopy: externalCopy("Reply assigned", "A message reply has been assigned to you.", "Open message"),
    deepLink: "chat-message", activityOnly: false, outcomes: inboxFirstOutcomes,
    grouping: entityGrouping, quietHours: "respect", projectMute: "bypass", retention: "project-history",
    privacy: "personal-message", actorSuppression: "suppress-synchronous-success",
  }),
  "chat.scheduled_message.sent": registerEvent({
    family: "chat", project: "optional", stage: null, entityType: "message",
    audiences: ["affected-person"], recipientResponsibilities: ["affected-person"], visibility: ["recipient-private"],
    severity: "success", publicationStates: ["published"],
    safeExternalCopy: externalCopy("Scheduled message sent", "Your scheduled message was sent.", "Open message"),
    deepLink: "chat-message", activityOnly: false, outcomes: inboxFirstOutcomes,
    grouping: entityGrouping, quietHours: "respect", projectMute: "respect", retention: "project-history",
    privacy: "personal-message", actorSuppression: "include",
  }),
  "chat.scheduled_message.failed": registerEvent({
    family: "chat", project: "optional", stage: null, entityType: "message",
    audiences: ["affected-person"], recipientResponsibilities: ["affected-person"], visibility: ["recipient-private"],
    severity: "warning", publicationStates: null,
    safeExternalCopy: externalCopy("Scheduled message failed", "Brisk could not send your scheduled message.", "Review message"),
    deepLink: "chat-message", activityOnly: false, outcomes: inboxFirstOutcomes,
    grouping: replacementGrouping, quietHours: "respect", projectMute: "bypass", retention: "project-history",
    privacy: "personal-message", actorSuppression: "include",
  }),
  "chat.scheduled_message.cancelled": registerEvent({
    family: "chat", project: "optional", stage: null, entityType: "message",
    audiences: ["affected-person"], recipientResponsibilities: ["affected-person"], visibility: ["recipient-private"],
    severity: "info", publicationStates: ["withdrawn"],
    safeExternalCopy: externalCopy("Scheduled message cancelled", "Your scheduled message was cancelled.", "Open Chat"),
    deepLink: "chat-message", activityOnly: false, outcomes: inboxFirstOutcomes,
    grouping: replacementGrouping, quietHours: "respect", projectMute: "respect", retention: "project-history",
    privacy: "personal-message", actorSuppression: "include",
  }),
  "chat.call.incoming": registerEvent({
    family: "chat", actor: "person-required", project: "optional", stage: null, entityType: "call",
    audiences: ["affected-person"], recipientResponsibilities: ["message-recipient"], visibility: ["recipient-private"],
    severity: "urgent", publicationStates: ["published"], safeExternalCopy: null, deepLink: "chat-call",
    activityOnly: false, outcomes: { activity: "always", systemPost: "none", inbox: "resolved-recipients", delivery: "none" },
    grouping: replacementGrouping, quietHours: "bypass", projectMute: "bypass", retention: "project-history",
    privacy: "personal-message", actorSuppression: "suppress-synchronous-success",
  }),
  "chat.call.missed": registerEvent({
    family: "chat", actor: "person-required", project: "optional", stage: null, entityType: "call",
    audiences: ["affected-person"], recipientResponsibilities: ["message-recipient"], visibility: ["recipient-private"],
    severity: "warning", publicationStates: ["published"],
    safeExternalCopy: externalCopy("Missed call", "You missed a Brisk call.", "View call"),
    deepLink: "chat-call", activityOnly: false, outcomes: inboxFirstOutcomes,
    grouping: entityGrouping, quietHours: "respect", projectMute: "respect", retention: "project-history",
    privacy: "personal-message", actorSuppression: "suppress-synchronous-success",
  }),
  "chat.call.recording_ready": registerEvent({
    family: "chat", project: "optional", stage: null, entityType: "call",
    audiences: ["affected-person"], recipientResponsibilities: ["message-recipient", "requester"], visibility: ["recipient-private"],
    severity: "success", publicationStates: ["published"],
    safeExternalCopy: externalCopy("Call recording ready", "The call recording is ready to review.", "Open recording"),
    deepLink: "chat-call", activityOnly: false, outcomes: inboxFirstOutcomes,
    grouping: entityGrouping, quietHours: "respect", projectMute: "respect", retention: "project-history",
    privacy: "personal-message", actorSuppression: "include",
  }),
  "chat.call.transcript_ready": registerEvent({
    family: "chat", project: "optional", stage: null, entityType: "call",
    audiences: ["affected-person"], recipientResponsibilities: ["message-recipient", "requester"], visibility: ["recipient-private"],
    severity: "success", publicationStates: ["published"],
    safeExternalCopy: externalCopy("Call transcript ready", "The call transcript is ready to review.", "Open transcript"),
    deepLink: "chat-call", activityOnly: false, outcomes: inboxFirstOutcomes,
    grouping: entityGrouping, quietHours: "respect", projectMute: "respect", retention: "project-history",
    privacy: "personal-message", actorSuppression: "include",
  }),

  "freelancer.offer.sent": registerEvent({
    family: "freelancer", actor: "person-required", project: "required", stage: null, entityType: "offer",
    audiences: ["affected-person", "studio"], recipientResponsibilities: ["offer-recipient", "project-lead"],
    visibility: ["recipient-private", "internal"], severity: "info", publicationStates: ["published"],
    safeExternalCopy: externalCopy("New project offer", "You have a new project offer from the Studio.", "Review offer"),
    deepLink: "freelancer-offer", activityOnly: false, outcomes: privateActionOutcomes,
    grouping: entityGrouping, quietHours: "respect", projectMute: "bypass", retention: "billing-record",
    privacy: "commercial-confidential", actorSuppression: "suppress-synchronous-success",
  }),
  "freelancer.offer.revoked": registerEvent({
    family: "freelancer", actor: "person-required", project: "required", stage: null, entityType: "offer",
    audiences: ["affected-person", "studio"], recipientResponsibilities: ["offer-recipient", "project-lead"],
    visibility: ["recipient-private", "internal"], severity: "warning", publicationStates: ["withdrawn"],
    safeExternalCopy: externalCopy("Project offer withdrawn", "This project offer is no longer available.", "View offers"),
    deepLink: "freelancer-offer", activityOnly: false, outcomes: privateActionOutcomes,
    grouping: replacementGrouping, quietHours: "respect", projectMute: "bypass", retention: "billing-record",
    privacy: "commercial-confidential", actorSuppression: "include", idempotency: transitionIdempotency,
  }),
  "freelancer.offer.expired": registerEvent({
    family: "freelancer", project: "required", stage: null, entityType: "offer",
    audiences: ["affected-person", "studio"], recipientResponsibilities: ["offer-recipient", "project-lead"],
    visibility: ["recipient-private", "internal"], severity: "warning", publicationStates: null,
    safeExternalCopy: externalCopy("Project offer expired", "The response window for this project offer has closed.", "View offers"),
    deepLink: "freelancer-offer", activityOnly: false, outcomes: privateActionOutcomes,
    grouping: replacementGrouping, quietHours: "respect", projectMute: "bypass", retention: "billing-record",
    privacy: "commercial-confidential", actorSuppression: "include", idempotency: transitionIdempotency,
  }),
  "freelancer.offer.accepted": registerEvent({
    family: "freelancer", actor: "person-required", project: "required", stage: null, entityType: "offer",
    audiences: ["studio"], recipientResponsibilities: ["project-lead"], visibility: ["internal"], severity: "success",
    publicationStates: ["published"], safeExternalCopy: null, deepLink: "project-overview", activityOnly: false,
    outcomes: internalActionOutcomes, grouping: entityGrouping, quietHours: "respect", projectMute: "bypass",
    retention: "billing-record", privacy: "commercial-confidential", actorSuppression: "suppress-synchronous-success",
    idempotency: transitionIdempotency,
  }),
  "freelancer.offer.declined": registerEvent({
    family: "freelancer", actor: "person-required", project: "required", stage: null, entityType: "offer",
    audiences: ["studio"], recipientResponsibilities: ["project-lead", "escalation-contact"], visibility: ["internal"],
    severity: "warning", publicationStates: ["published"], safeExternalCopy: null, deepLink: "project-overview",
    activityOnly: false, outcomes: internalActionOutcomes, grouping: entityGrouping, quietHours: "respect",
    projectMute: "bypass", retention: "billing-record", privacy: "commercial-confidential", actorSuppression: "include",
    idempotency: transitionIdempotency,
  }),
  "cost.invoice.uploaded": registerEvent({
    family: "costs", actor: "person-required", project: "required", stage: null, entityType: "invoice",
    audiences: ["studio"], recipientResponsibilities: ["invoice-approver", "billing-contact"], visibility: ["internal"],
    severity: "info", publicationStates: ["published"], safeExternalCopy: null, deepLink: "outstanding-invoice",
    activityOnly: false, outcomes: internalActionOutcomes, grouping: projectGrouping, quietHours: "respect",
    projectMute: "bypass", retention: "billing-record", privacy: "commercial-confidential",
    actorSuppression: "suppress-synchronous-success",
  }),
  "cost.invoice.forwarded": registerEvent({
    family: "costs", actor: "person-required", project: "required", stage: null, entityType: "invoice",
    audiences: ["studio"], recipientResponsibilities: ["invoice-approver", "billing-contact"], visibility: ["internal"],
    severity: "success", publicationStates: ["published"], safeExternalCopy: null, deepLink: "outstanding-invoice",
    activityOnly: false, outcomes: internalActionOutcomes, grouping: entityGrouping, quietHours: "respect",
    projectMute: "bypass", retention: "billing-record", privacy: "commercial-confidential",
    actorSuppression: "suppress-synchronous-success",
  }),
  "cost.invoice.approved": registerEvent({
    family: "costs", actor: "person-required", project: "required", stage: null, entityType: "invoice",
    audiences: ["affected-person", "studio"], recipientResponsibilities: ["invoice-submitter", "invoice-approver"],
    visibility: ["recipient-private", "internal"], severity: "success", publicationStates: ["published"],
    safeExternalCopy: externalCopy("Invoice approved", "Your contractor invoice has been approved.", "View invoice"),
    deepLink: audienceLink("outstanding-invoice", { "affected-person": "contractor-invoice" }), activityOnly: false, outcomes: privateActionOutcomes,
    grouping: entityGrouping, quietHours: "respect", projectMute: "bypass", retention: "billing-record",
    privacy: "commercial-confidential", actorSuppression: "suppress-synchronous-success", idempotency: transitionIdempotency,
  }),
  "cost.invoice.approval_reset": registerEvent({
    family: "costs", actor: "person-required", project: "required", stage: null, entityType: "invoice",
    audiences: ["affected-person", "studio"], recipientResponsibilities: ["invoice-submitter", "invoice-approver"],
    visibility: ["recipient-private", "internal"], severity: "warning", publicationStates: ["published"],
    safeExternalCopy: externalCopy("Invoice approval reset", "This invoice has returned to review.", "View invoice"),
    deepLink: audienceLink("outstanding-invoice", { "affected-person": "contractor-invoice" }), activityOnly: false, outcomes: privateActionOutcomes,
    grouping: replacementGrouping, quietHours: "respect", projectMute: "bypass", retention: "billing-record",
    privacy: "commercial-confidential", actorSuppression: "include", idempotency: transitionIdempotency,
  }),
  "cost.invoice.reopened": registerEvent({
    family: "costs", actor: "person-required", project: "required", stage: null, entityType: "invoice",
    audiences: ["affected-person", "studio"], recipientResponsibilities: ["invoice-submitter", "invoice-approver"],
    visibility: ["recipient-private", "internal"], severity: "warning", publicationStates: ["published"],
    safeExternalCopy: externalCopy("Invoice reopened", "This invoice needs another review.", "View invoice"),
    deepLink: audienceLink("outstanding-invoice", { "affected-person": "contractor-invoice" }), activityOnly: false, outcomes: privateActionOutcomes,
    grouping: replacementGrouping, quietHours: "respect", projectMute: "bypass", retention: "billing-record",
    privacy: "commercial-confidential", actorSuppression: "include", idempotency: transitionIdempotency,
  }),
  "cost.invoice.paid": registerEvent({
    family: "costs", actor: "person-required", project: "required", stage: null, entityType: "invoice",
    audiences: ["affected-person", "studio"], recipientResponsibilities: ["invoice-submitter", "billing-contact"],
    visibility: ["recipient-private", "internal"], severity: "success", publicationStates: ["published"],
    safeExternalCopy: externalCopy("Invoice marked paid", "Your contractor invoice has been marked as paid.", "View invoice"),
    deepLink: audienceLink("outstanding-invoice", { "affected-person": "contractor-invoice" }), activityOnly: false, outcomes: privateActionOutcomes,
    grouping: entityGrouping, quietHours: "respect", projectMute: "bypass", retention: "billing-record",
    privacy: "commercial-confidential", actorSuppression: "suppress-synchronous-success", idempotency: transitionIdempotency,
  }),
  "cost.threshold.exceeded": registerEvent({
    family: "costs", project: "required", stage: null, entityType: "project",
    audiences: ["studio"], recipientResponsibilities: ["project-owner", "invoice-approver", "billing-contact"],
    visibility: ["internal"], severity: "urgent", publicationStates: null, safeExternalCopy: null,
    deepLink: "project-costs", activityOnly: false, outcomes: internalActionOutcomes,
    grouping: replacementGrouping, quietHours: "bypass", projectMute: "bypass", retention: "billing-record",
    privacy: "commercial-confidential", actorSuppression: "include", idempotency: transitionIdempotency,
  }),

  "billing.trial.ending": registerEvent({
    family: "billing", project: "none", stage: null, entityType: "subscription",
    audiences: ["studio"], recipientResponsibilities: ["billing-contact"], visibility: ["recipient-private"],
    severity: "warning", publicationStates: null, safeExternalCopy: null, deepLink: "plan-billing",
    activityOnly: false, outcomes: privateActionOutcomes, grouping: replacementGrouping, quietHours: "respect",
    projectMute: "bypass", retention: "billing-record", privacy: "commercial-confidential", actorSuppression: "include",
  }),
  "billing.subscription.cancelled": registerEvent({
    family: "billing", project: "none", stage: null, entityType: "subscription",
    audiences: ["studio"], recipientResponsibilities: ["billing-contact"], visibility: ["recipient-private"],
    severity: "warning", publicationStates: ["withdrawn"], safeExternalCopy: null, deepLink: "plan-billing",
    activityOnly: false, outcomes: privateActionOutcomes, grouping: replacementGrouping, quietHours: "bypass",
    projectMute: "bypass", retention: "billing-record", privacy: "commercial-confidential", actorSuppression: "include",
    idempotency: transitionIdempotency,
  }),
  "billing.subscription.reactivated": registerEvent({
    family: "billing", project: "none", stage: null, entityType: "subscription",
    audiences: ["studio"], recipientResponsibilities: ["billing-contact"], visibility: ["recipient-private"],
    severity: "success", publicationStates: ["published"], safeExternalCopy: null, deepLink: "plan-billing",
    activityOnly: false, outcomes: privateActionOutcomes, grouping: replacementGrouping, quietHours: "respect",
    projectMute: "bypass", retention: "billing-record", privacy: "commercial-confidential",
    actorSuppression: "suppress-synchronous-success", idempotency: transitionIdempotency,
  }),
  "billing.plan.changed": registerEvent({
    family: "billing", actor: "person-required", project: "none", stage: null, entityType: "subscription",
    audiences: ["studio"], recipientResponsibilities: ["billing-contact"], visibility: ["recipient-private"],
    severity: "info", publicationStates: null, safeExternalCopy: null, deepLink: "plan-billing",
    activityOnly: false, outcomes: privateActionOutcomes, grouping: replacementGrouping, quietHours: "respect",
    projectMute: "bypass", retention: "billing-record", privacy: "commercial-confidential",
    actorSuppression: "suppress-synchronous-success", idempotency: transitionIdempotency,
  }),
  "integration.stripe.action_required": registerEvent({
    family: "integration", project: "none", stage: null, entityType: "integration",
    audiences: ["studio"], recipientResponsibilities: ["billing-contact", "integration-contact"],
    visibility: ["recipient-private"], severity: "urgent", publicationStates: null, safeExternalCopy: null,
    deepLink: "client-billing", activityOnly: false, outcomes: privateActionOutcomes,
    grouping: replacementGrouping, quietHours: "bypass", projectMute: "bypass", retention: "billing-record",
    privacy: "commercial-confidential", actorSuppression: "include",
  }),
  "integration.connector.credentials_expiring": registerEvent({
    family: "integration", project: "optional", stage: null, entityType: "integration",
    audiences: ["studio"], recipientResponsibilities: ["integration-contact", "project-owner"],
    visibility: ["recipient-private"], severity: "warning", publicationStates: null, safeExternalCopy: null,
    deepLink: "notification-settings", activityOnly: false, outcomes: privateActionOutcomes,
    grouping: replacementGrouping, quietHours: "respect", projectMute: "bypass", retention: "workspace-audit",
    privacy: "workspace-internal", actorSuppression: "include",
  }),
  "delivery.retries_exhausted": registerEvent({
    family: "integration", project: "optional", stage: null, entityType: "integration",
    audiences: ["studio", "affected-person"], recipientResponsibilities: ["affected-person", "integration-contact", "project-owner"],
    visibility: ["recipient-private", "internal"], severity: "urgent", publicationStates: null, safeExternalCopy: null,
    deepLink: "notification-settings", activityOnly: false, outcomes: inboxFirstOutcomes,
    grouping: replacementGrouping, quietHours: "bypass", projectMute: "bypass", retention: "workspace-audit",
    privacy: "workspace-internal", actorSuppression: "include",
    idempotency: { scope: "provider-attempt", keyParts: ["event-key", "version", "workspace", "entity", "recipient", "channel"] },
  }),

  "sharing.access.changed": registerEvent({
    family: "sharing", actor: "person-required", project: "optional", stage: null, entityType: "share",
    audiences: ["affected-person", "studio"], recipientResponsibilities: ["affected-person", "project-owner"],
    visibility: ["recipient-private", "internal"], severity: "info", publicationStates: ["published"],
    safeExternalCopy: externalCopy("Shared access changed", "Your access to shared Brisk content has changed.", "Open shared content"),
    deepLink: "shared-content", activityOnly: false, outcomes: privateActionOutcomes,
    grouping: entityGrouping, quietHours: "respect", projectMute: "bypass", retention: "security-audit",
    privacy: "security-sensitive", actorSuppression: "suppress-synchronous-success", idempotency: transitionIdempotency,
  }),
  "sharing.access.revoked": registerEvent({
    family: "sharing", actor: "person-required", project: "optional", stage: null, entityType: "share",
    audiences: ["affected-person", "studio"], recipientResponsibilities: ["affected-person", "project-owner"],
    visibility: ["recipient-private", "internal"], severity: "warning", publicationStates: ["withdrawn"],
    safeExternalCopy: externalCopy("Shared access removed", "You no longer have access to this shared content.", "View access status"),
    deepLink: "access-status", activityOnly: false, outcomes: privateActionOutcomes,
    grouping: replacementGrouping, quietHours: "bypass", projectMute: "bypass", retention: "security-audit",
    privacy: "security-sensitive", actorSuppression: "include", idempotency: transitionIdempotency,
  }),
  "sharing.access.expired": registerEvent({
    family: "sharing", project: "optional", stage: null, entityType: "share",
    audiences: ["affected-person", "studio"], recipientResponsibilities: ["affected-person", "project-owner"],
    visibility: ["recipient-private", "internal"], severity: "warning", publicationStates: ["withdrawn"],
    safeExternalCopy: externalCopy("Shared access expired", "This shared link is no longer active.", "View access status"),
    deepLink: "access-status", activityOnly: false, outcomes: privateActionOutcomes,
    grouping: replacementGrouping, quietHours: "respect", projectMute: "bypass", retention: "security-audit",
    privacy: "security-sensitive", actorSuppression: "include", idempotency: transitionIdempotency,
  }),
  "export.requested": registerEvent({
    family: "export", actor: "person-required", project: "optional", stage: null, entityType: "export",
    audiences: ["affected-person"], recipientResponsibilities: ["requester"], visibility: ["recipient-private"],
    severity: "info", publicationStates: null, safeExternalCopy: null, deepLink: null, activityOnly: true,
    outcomes: activityOnlyOutcomes, grouping: entityGrouping, quietHours: "respect", projectMute: "respect",
    retention: "workspace-audit", privacy: "security-sensitive", actorSuppression: "suppress-synchronous-success",
  }),
  "export.completed": registerEvent({
    family: "export", project: "optional", stage: null, entityType: "export",
    audiences: ["affected-person"], recipientResponsibilities: ["requester"], visibility: ["recipient-private"],
    severity: "success", publicationStates: ["published"],
    safeExternalCopy: externalCopy("Export ready", "Your requested export is ready to download.", "Download export"),
    deepLink: "notification-settings", activityOnly: false, outcomes: privateActionOutcomes,
    grouping: entityGrouping, quietHours: "respect", projectMute: "bypass", retention: "security-audit",
    privacy: "security-sensitive", actorSuppression: "include",
  }),
  "export.failed": registerEvent({
    family: "export", project: "optional", stage: null, entityType: "export",
    audiences: ["affected-person"], recipientResponsibilities: ["requester"], visibility: ["recipient-private"],
    severity: "warning", publicationStates: null,
    safeExternalCopy: externalCopy("Export failed", "Brisk could not complete your requested export.", "Review export"),
    deepLink: "notification-settings", activityOnly: false, outcomes: privateActionOutcomes,
    grouping: replacementGrouping, quietHours: "respect", projectMute: "bypass", retention: "security-audit",
    privacy: "security-sensitive", actorSuppression: "include",
  }),
  "security.login.new": registerEvent({
    family: "security", project: "none", stage: null, entityType: "security-event",
    audiences: ["affected-person"], recipientResponsibilities: ["affected-person"], visibility: ["recipient-private"],
    severity: "warning", publicationStates: null,
    safeExternalCopy: externalCopy("New Brisk login", "A new login was detected for your Brisk access.", "Review security"),
    deepLink: "personal-security", activityOnly: false, outcomes: privateActionOutcomes,
    grouping: entityGrouping, quietHours: "bypass", projectMute: "bypass", retention: "security-audit",
    privacy: "security-sensitive", actorSuppression: "include",
  }),
  "security.identity.changed": registerEvent({
    family: "security", actor: "person-required", project: "none", stage: null, entityType: "security-event",
    audiences: ["affected-person"], recipientResponsibilities: ["affected-person", "security-contact"],
    visibility: ["recipient-private"], severity: "urgent", publicationStates: null,
    safeExternalCopy: externalCopy("Brisk identity changed", "Your Brisk identity or security details changed.", "Review security"),
    deepLink: "personal-security", activityOnly: false, outcomes: privateActionOutcomes,
    grouping: replacementGrouping, quietHours: "bypass", projectMute: "bypass", retention: "security-audit",
    privacy: "security-sensitive", actorSuppression: "include", idempotency: transitionIdempotency,
  }),

  "activity.shoot_draft.changed": registerEvent({
    family: "activity", actor: "person-required", project: "required", stage: "shoot", entityType: "call-sheet",
    audiences: ["studio"], recipientResponsibilities: [], visibility: ["internal"], severity: "info",
    publicationStates: ["draft"], safeExternalCopy: null, deepLink: null, activityOnly: true,
    outcomes: activityOnlyOutcomes, grouping: projectGrouping, quietHours: "respect", projectMute: "respect",
    retention: "project-history", privacy: "workspace-internal", actorSuppression: "suppress-synchronous-success",
  }),
  "activity.foreground_upload.completed": registerEvent({
    family: "activity", actor: "person-required", project: "required", stage: "media", entityType: "media-asset",
    audiences: ["studio"], recipientResponsibilities: [], visibility: ["internal"], severity: "success",
    publicationStates: ["draft"], safeExternalCopy: null, deepLink: null, activityOnly: true,
    outcomes: activityOnlyOutcomes, grouping: projectGrouping, quietHours: "respect", projectMute: "respect",
    retention: "project-history", privacy: "workspace-internal", actorSuppression: "suppress-synchronous-success",
  }),
  "activity.masters.downloaded": registerEvent({
    family: "activity", actor: "person-required", project: "required", stage: "masters", entityType: "deliverable-version",
    audiences: ["studio"], recipientResponsibilities: [], visibility: ["internal"], severity: "info",
    publicationStates: ["published"], safeExternalCopy: null, deepLink: null, activityOnly: true,
    outcomes: activityOnlyOutcomes, grouping: projectGrouping, quietHours: "respect", projectMute: "respect",
    retention: "project-history", privacy: "workspace-internal", actorSuppression: "suppress-synchronous-success",
  }),
  "activity.chat_reaction.changed": registerEvent({
    family: "activity", actor: "person-required", project: "optional", stage: null, entityType: "message",
    audiences: ["studio", "customer"], recipientResponsibilities: [], visibility: ["internal", "external"],
    severity: "info", publicationStates: ["published"], safeExternalCopy: null, deepLink: null, activityOnly: true,
    outcomes: activityOnlyOutcomes, grouping: projectGrouping, quietHours: "respect", projectMute: "respect",
    retention: "project-history", privacy: "personal-message", actorSuppression: "suppress-synchronous-success",
  }),
  "activity.brand_kit.changed": registerEvent({
    family: "activity", actor: "person-required", project: "optional", stage: null, entityType: "brand-kit",
    audiences: ["studio"], recipientResponsibilities: [], visibility: ["internal"], severity: "info",
    publicationStates: ["draft"], safeExternalCopy: null, deepLink: null, activityOnly: true,
    outcomes: activityOnlyOutcomes, grouping: projectGrouping, quietHours: "respect", projectMute: "respect",
    retention: "workspace-audit", privacy: "workspace-internal", actorSuppression: "suppress-synchronous-success",
  }),
  "activity.file_location.changed": registerEvent({
    family: "activity", actor: "person-required", project: "required", stage: null, entityType: "file-location",
    audiences: ["studio"], recipientResponsibilities: [], visibility: ["internal"], severity: "info",
    publicationStates: ["draft"], safeExternalCopy: null, deepLink: null, activityOnly: true,
    outcomes: activityOnlyOutcomes, grouping: entityGrouping, quietHours: "respect", projectMute: "respect",
    retention: "project-history", privacy: "workspace-internal", actorSuppression: "suppress-synchronous-success",
  }),
  "activity.time_entry.changed": registerEvent({
    family: "activity", actor: "person-required", project: "required", stage: "event-stage", entityType: "time-entry",
    audiences: ["studio"], recipientResponsibilities: [], visibility: ["internal"], severity: "info",
    publicationStates: null, safeExternalCopy: null, deepLink: null, activityOnly: true,
    outcomes: activityOnlyOutcomes, grouping: projectGrouping, quietHours: "respect", projectMute: "respect",
    retention: "project-history", privacy: "commercial-confidential", actorSuppression: "suppress-synchronous-success",
  }),
  "activity.settings.saved": registerEvent({
    family: "activity", actor: "person-required", project: "optional", stage: null, entityType: "settings",
    audiences: ["studio"], recipientResponsibilities: [], visibility: ["internal"], severity: "info",
    publicationStates: null, safeExternalCopy: null, deepLink: null, activityOnly: true,
    outcomes: activityOnlyOutcomes, grouping: entityGrouping, quietHours: "respect", projectMute: "respect",
    retention: "workspace-audit", privacy: "workspace-internal", actorSuppression: "suppress-synchronous-success",
  }),
  "activity.share_link.copied": registerEvent({
    family: "activity", actor: "person-required", project: "optional", stage: null, entityType: "share",
    audiences: ["studio"], recipientResponsibilities: [], visibility: ["internal"], severity: "info",
    publicationStates: ["published"], safeExternalCopy: null, deepLink: null, activityOnly: true,
    outcomes: activityOnlyOutcomes, grouping: projectGrouping, quietHours: "respect", projectMute: "respect",
    retention: "workspace-audit", privacy: "workspace-internal", actorSuppression: "suppress-synchronous-success",
  }),
} as const satisfies Record<string, NotificationEventDefinition>;

export type NotificationEventKey = keyof typeof notificationEventRegistry;

export type NotificationActor = {
  kind: "person";
  personId: string;
  role: NotificationRole;
} | {
  kind: "system";
  service: string;
};

export type CanonicalNotificationEvent = {
  id: string;
  key: NotificationEventKey;
  version: 1;
  occurredAt: string;
  sourceOperationId: string;
  actor: NotificationActor;
  workspaceId: string;
  projectId?: string;
  stage?: StageKey;
  entity: {
    type: NotificationEntityType;
    id: string;
  };
  publicationState?: NotificationPublicationState;
  metadata: Readonly<Record<string, string | number | boolean | null>>;
};

export const notificationRecipientMatrix = {
  "affected-person": { roles: ["Studio Staff", "Studio Freelancer", "Customer"], description: "The person whose access, delivery or asynchronous request changed." },
  "assigned-crew": { roles: ["Studio Staff", "Studio Freelancer"], description: "Cast or crew assigned to the affected published shoot day." },
  "assigned-editor": { roles: ["Studio Staff", "Studio Freelancer"], description: "The person assigned to edit or finish the relevant deliverable." },
  "assigned-replier": { roles: ["Studio Staff", "Studio Freelancer", "Customer"], description: "The person explicitly assigned to respond to a message." },
  "billing-contact": { roles: ["Studio Staff"], description: "Studio Staff designated to receive subscription and billing outcomes." },
  "customer-project-member": { roles: ["Customer"], description: "A Customer with current access to the affected project." },
  "escalation-contact": { roles: ["Studio Staff"], description: "Studio Staff designated to receive urgent unresolved outcomes." },
  "integration-contact": { roles: ["Studio Staff"], description: "Studio Staff responsible for the affected connector." },
  "invoice-approver": { roles: ["Studio Staff"], description: "Studio Staff responsible for reviewing contractor invoices." },
  "invoice-submitter": { roles: ["Studio Freelancer"], description: "The contractor who submitted the invoice." },
  "mentioned-person": { roles: ["Studio Staff", "Studio Freelancer", "Customer"], description: "A person explicitly mentioned in an authorised Chat audience." },
  "message-recipient": { roles: ["Studio Staff", "Studio Freelancer", "Customer"], description: "The direct recipient or call participant." },
  "offer-recipient": { roles: ["Studio Freelancer"], description: "The freelancer who received the project offer." },
  "project-lead": { roles: ["Studio Staff", "Studio Freelancer"], description: "The person assigned operational responsibility for the project." },
  "project-member": { roles: ["Studio Staff", "Studio Freelancer", "Customer"], description: "A person with current access to the project and relevant audience." },
  "project-owner": { roles: ["Studio Staff"], description: "Studio Staff accountable for the project relationship and delivery." },
  requester: { roles: ["Studio Staff", "Studio Freelancer", "Customer"], description: "The person who requested the asynchronous work or workflow action." },
  reviewer: { roles: ["Studio Staff", "Studio Freelancer", "Customer"], description: "The person assigned to review or approve the released object." },
  "security-contact": { roles: ["Studio Staff"], description: "Studio Staff responsible for workspace access and security." },
} as const satisfies Record<NotificationResponsibility, {
  roles: readonly NotificationRole[];
  description: string;
}>;

export const notificationPrivacyContract = {
  "customer-safe-workflow": {
    allowedVisibility: ["external", "recipient-private"],
    prohibitedContent: ["Internal Chat", "rates", "costs", "contractor invoices", "internal notes"],
    recheckAccessOnOpen: true,
  },
  "workspace-internal": {
    allowedVisibility: ["internal", "recipient-private"],
    prohibitedContent: ["content from another Studio", "Customer-private direct messages"],
    recheckAccessOnOpen: true,
  },
  "commercial-confidential": {
    allowedVisibility: ["internal", "recipient-private"],
    prohibitedContent: ["Customer channels", "people without billing or invoice responsibility"],
    recheckAccessOnOpen: true,
  },
  "personal-message": {
    allowedVisibility: ["recipient-private", "internal", "external"],
    prohibitedContent: ["message bodies outside their authorised Chat audience"],
    recheckAccessOnOpen: true,
  },
  "security-sensitive": {
    allowedVisibility: ["recipient-private", "internal"],
    prohibitedContent: ["access tokens", "magic links", "credentials", "restricted object details after revocation"],
    recheckAccessOnOpen: true,
  },
} as const satisfies Record<NotificationPrivacyClassification, {
  allowedVisibility: readonly NotificationVisibility[];
  prohibitedContent: readonly string[];
  recheckAccessOnOpen: boolean;
}>;

export const notificationPrecedence = [
  { rank: 1, rule: "Security and access-revocation safety" },
  { rank: 2, rule: "Urgent published shoot changes" },
  { rank: 3, rule: "Recipient permissions" },
  { rank: 4, rule: "Required transactional delivery" },
  { rank: 5, rule: "Project mute" },
  { rank: 6, rule: "Quiet hours" },
  { rank: 7, rule: "User preferences" },
  { rank: 8, rule: "Digest and grouping rules" },
] as const;

export type NotificationDeepLinkDefinition = {
  pathTemplate: string;
  fallbackTemplate: string;
  routeStatus: "existing" | "base-existing" | "planned";
  roles: readonly NotificationRole[];
};

export const notificationDeepLinkMap = {
  "access-status": { pathTemplate: "/access", fallbackTemplate: "/", routeStatus: "planned", roles: ["Studio Staff", "Studio Freelancer", "Customer"] },
  "person-access": { pathTemplate: "/people/{personId}?section=Access", fallbackTemplate: "/people", routeStatus: "base-existing", roles: ["Studio Staff"] },
  "client-access": { pathTemplate: "/clients/{clientId}", fallbackTemplate: "/clients", routeStatus: "existing", roles: ["Studio Staff"] },
  "customer-dashboard": { pathTemplate: "/customer-dashboard", fallbackTemplate: "/customer-dashboard", routeStatus: "existing", roles: ["Customer"] },
  "project-overview": { pathTemplate: "/projects/{projectId}", fallbackTemplate: "/active-videos", routeStatus: "existing", roles: ["Studio Staff", "Studio Freelancer", "Customer"] },
  "project-stage": { pathTemplate: "/projects/{projectId}/{stagePath}", fallbackTemplate: "/projects/{projectId}", routeStatus: "existing", roles: ["Studio Staff", "Studio Freelancer", "Customer"] },
  "call-sheet": { pathTemplate: "/share/call-sheet/{projectId}", fallbackTemplate: "/projects/{projectId}/stages/shoot", routeStatus: "existing", roles: ["Studio Staff", "Studio Freelancer", "Customer"] },
  "media-asset": { pathTemplate: "/projects/{projectId}/stages/media?asset={entityId}", fallbackTemplate: "/projects/{projectId}/stages/media", routeStatus: "base-existing", roles: ["Studio Staff", "Studio Freelancer", "Customer"] },
  "masters-deliverable": { pathTemplate: "/projects/{projectId}/stages/masters?deliverable={entityId}", fallbackTemplate: "/projects/{projectId}/stages/masters", routeStatus: "base-existing", roles: ["Studio Staff", "Studio Freelancer", "Customer"] },
  "chat-message": { pathTemplate: "/chat?project={projectId}&message={entityId}", fallbackTemplate: "/chat", routeStatus: "base-existing", roles: ["Studio Staff", "Studio Freelancer", "Customer"] },
  "chat-call": { pathTemplate: "/chat?view=calls&call={entityId}", fallbackTemplate: "/chat?view=calls", routeStatus: "base-existing", roles: ["Studio Staff", "Studio Freelancer", "Customer"] },
  "project-costs": { pathTemplate: "/projects/{projectId}/costs", fallbackTemplate: "/active-videos", routeStatus: "existing", roles: ["Studio Staff"] },
  "outstanding-invoice": { pathTemplate: "/outstanding-invoices?invoice={entityId}", fallbackTemplate: "/outstanding-invoices", routeStatus: "base-existing", roles: ["Studio Staff"] },
  "contractor-invoice": { pathTemplate: "/invoices/{entityId}", fallbackTemplate: "/active-videos", routeStatus: "planned", roles: ["Studio Freelancer"] },
  "freelancer-offer": { pathTemplate: "/offers/{entityId}", fallbackTemplate: "/active-videos", routeStatus: "planned", roles: ["Studio Freelancer"] },
  "plan-billing": { pathTemplate: "/settings/plan-billing", fallbackTemplate: "/settings/studio", routeStatus: "existing", roles: ["Studio Staff"] },
  "client-billing": { pathTemplate: "/settings/client-billing", fallbackTemplate: "/settings/studio", routeStatus: "existing", roles: ["Studio Staff"] },
  "notification-settings": { pathTemplate: "/settings/notifications", fallbackTemplate: "/settings/studio", routeStatus: "planned", roles: ["Studio Staff", "Studio Freelancer", "Customer"] },
  "personal-security": { pathTemplate: "/settings/personal/security", fallbackTemplate: "/", routeStatus: "planned", roles: ["Studio Staff", "Studio Freelancer", "Customer"] },
  "brand-kit": { pathTemplate: "/brand-kits/{clientSlug}", fallbackTemplate: "/brand-kits", routeStatus: "existing", roles: ["Studio Staff", "Studio Freelancer", "Customer"] },
  "shared-content": { pathTemplate: "/share/{shareId}", fallbackTemplate: "/", routeStatus: "planned", roles: ["Studio Staff", "Studio Freelancer", "Customer"] },
  "project-files": { pathTemplate: "/projects/{projectId}/files", fallbackTemplate: "/projects/{projectId}", routeStatus: "existing", roles: ["Studio Staff", "Studio Freelancer"] },
  today: { pathTemplate: "/today", fallbackTemplate: "/active-videos", routeStatus: "existing", roles: ["Studio Staff", "Studio Freelancer"] },
} as const satisfies Record<Exclude<NotificationDeepLinkTarget, null>, NotificationDeepLinkDefinition>;

export const notificationStagePathMap = {
  brief: "stages/brief",
  script: "script",
  shoot: "stages/shoot",
  media: "stages/media",
  edit: "stages/edit",
  masters: "stages/masters",
} as const satisfies Record<StageKey, string>;

export const notificationIdempotencyContract = {
  canonicalEvent: ["event-key", "version", "workspace", "source-operation"],
  recipientInboxItem: ["canonical-event-id", "recipient-id"],
  externalDelivery: ["canonical-event-id", "recipient-id", "channel"],
  providerAttempt: ["external-delivery-id", "attempt-number"],
  rule: "A retry may add a provider attempt, but it must not create another canonical event or inbox item.",
} as const;

export const notificationGroupingContract = {
  rule: "Grouping changes presentation, not audit history or recipient authorisation.",
  groupedReadyToEdit: {
    eventKey: "project.ready_to_edit",
    sourceStages: ["brief", "script", "shoot", "media"],
    recipientAlertCount: 1,
  },
  urgentShootRule: "The latest published shoot change replaces older unread shoot-change summaries for the same recipient and call sheet.",
} as const satisfies {
  rule: string;
  groupedReadyToEdit: {
    eventKey: NotificationEventKey;
    sourceStages: readonly StageKey[];
    recipientAlertCount: number;
  };
  urgentShootRule: string;
};

export type NotificationSeedScenario = {
  id: string;
  title: string;
  event: CanonicalNotificationEvent;
  expected: {
    activityEntries: 1;
    systemPosts: readonly ("internal" | "external")[];
    inboxRecipientIds: readonly string[];
    emailRecipientIds: readonly string[];
    notes: string;
  };
};

export const notificationSeedScenarios: readonly NotificationSeedScenario[] = [
  {
    id: "scenario-call-sheet-time-change",
    title: "Published call time changes after crew were notified",
    event: {
      id: "event-call-sheet-time-change-1", key: "shoot.schedule.time_changed", version: 1,
      occurredAt: "2026-08-20T16:15:00+10:00", sourceOperationId: "call-sheet-revision-12",
      actor: { kind: "person", personId: "te", role: "Studio Staff" }, workspaceId: "northstar-films",
      projectId: "loom-launch-film", stage: "shoot", entity: { type: "call-sheet", id: "loom-shoot-day-1" },
      publicationState: "published", metadata: { previousCallTime: "07:00", callTime: "06:30", timezone: "Australia/Sydney" },
    },
    expected: {
      activityEntries: 1, systemPosts: ["internal", "external"],
      inboxRecipientIds: ["jl", "loom-contact-1", "te"], emailRecipientIds: ["jl", "loom-contact-1"],
      notes: "Urgent published change bypasses mute and quiet hours. The actor is not sent a duplicate success message.",
    },
  },
  {
    id: "scenario-ready-to-edit",
    title: "Four prerequisite Stages complete in one workflow action",
    event: {
      id: "event-ready-to-edit-1", key: "project.ready_to_edit", version: 1,
      occurredAt: "2026-08-20T11:05:00+10:00", sourceOperationId: "ready-to-edit-loom-1",
      actor: { kind: "person", personId: "te", role: "Studio Staff" }, workspaceId: "northstar-films",
      projectId: "loom-launch-film", entity: { type: "project", id: "loom-launch-film" },
      publicationState: "published", metadata: { completedStageCount: 4 },
    },
    expected: {
      activityEntries: 1, systemPosts: ["internal"], inboxRecipientIds: ["sc"], emailRecipientIds: [],
      notes: "Brief, Script, Shoot and Media are represented by one event and one recipient alert.",
    },
  },
  {
    id: "scenario-project-access-removed",
    title: "Customer loses access to one project",
    event: {
      id: "event-access-removed-1", key: "access.customer_project.removed", version: 1,
      occurredAt: "2026-08-20T13:40:00+10:00", sourceOperationId: "loom-contact-access-4",
      actor: { kind: "person", personId: "te", role: "Studio Staff" }, workspaceId: "northstar-films",
      projectId: "loom-launch-film", entity: { type: "client-contact", id: "loom-contact-2" },
      metadata: { clientId: "loom" },
    },
    expected: {
      activityEntries: 1, systemPosts: [], inboxRecipientIds: ["te"], emailRecipientIds: ["loom-contact-2"],
      notes: "The Customer receives safe access-status copy. The removed project is never used as their CTA destination.",
    },
  },
  {
    id: "scenario-transcript-ready",
    title: "An asynchronous transcript completes after the requester leaves",
    event: {
      id: "event-transcript-ready-1", key: "media.transcript.ready", version: 1,
      occurredAt: "2026-08-20T14:25:00+10:00", sourceOperationId: "transcript-media-02-1",
      actor: { kind: "system", service: "transcription" }, workspaceId: "northstar-films",
      projectId: "loom-launch-film", stage: "media", entity: { type: "transcript", id: "media-02-transcript" },
      metadata: { requestedBy: "sc", assetId: "media-02" },
    },
    expected: {
      activityEntries: 1, systemPosts: [], inboxRecipientIds: ["sc"], emailRecipientIds: [],
      notes: "Asynchronous completion includes the requester even though they initiated the work.",
    },
  },
  {
    id: "scenario-foreground-upload",
    title: "A foreground upload completes while the uploader remains on the Media page",
    event: {
      id: "event-upload-complete-1", key: "activity.foreground_upload.completed", version: 1,
      occurredAt: "2026-08-20T15:10:00+10:00", sourceOperationId: "upload-media-06-1",
      actor: { kind: "person", personId: "te", role: "Studio Staff" }, workspaceId: "northstar-films",
      projectId: "loom-launch-film", stage: "media", entity: { type: "media-asset", id: "media-06" },
      publicationState: "draft", metadata: { fulfilledRequest: false, backgroundProcessing: false },
    },
    expected: {
      activityEntries: 1, systemPosts: [], inboxRecipientIds: [], emailRecipientIds: [],
      notes: "The UI may show a local success state, but the canonical outcome remains activity-only.",
    },
  },
];

export function getNotificationEventDefinition(key: NotificationEventKey) {
  return notificationEventRegistry[key];
}
