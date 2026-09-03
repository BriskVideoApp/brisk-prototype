import type { StageKey } from "@/components/active-videos/types";
import type { PrototypeRole } from "@/components/navigation/PrototypeRoleContext";
import type {
  NotificationSemanticLabel,
  NotificationSemanticState,
} from "@/components/notifications/types";
import {
  getNotificationEventDefinition,
  notificationDeepLinkMap,
  notificationRecipientMatrix,
  type NotificationDeepLinkTarget,
  type NotificationEventKey,
  type NotificationResponsibility,
} from "@/data/notification-registry";

export type NotificationInboxFilter = "all" | "unread" | "mentions" | "action-required";
export type NotificationInboxCategory = "update" | "mention" | "action-required";
export type NotificationEmailDeliveryState = "sent" | "reminder-scheduled" | "failed";
export type NotificationEmailReminderPreview = {
  recipient: string;
  scheduledFor: string;
  subject: string;
  body: readonly string[];
  ctaLabel: string;
  ctaHref: string;
};

export type RecipientInboxItem = {
  id: string;
  canonicalEventId: string;
  eventKey: NotificationEventKey;
  recipientId: string;
  recipientRole: PrototypeRole;
  recipientResponsibility: NotificationResponsibility;
  category: NotificationInboxCategory;
  state: NotificationSemanticState;
  label: NotificationSemanticLabel;
  title: string;
  copy: string;
  actorName?: string;
  projectId?: string;
  projectCode?: string;
  projectName?: string;
  stage?: StageKey;
  occurredAt: string;
  href: string | null;
  deepLinkTarget: NotificationDeepLinkTarget;
  ctaLabel?: string;
  groupedCount?: number;
  groupLabel?: string;
  emailDeliveryState?: NotificationEmailDeliveryState;
  emailRetrySuccess?: { title: string; copy: string };
  emailReminderPreview?: NotificationEmailReminderPreview;
  initiallyRead: boolean;
};

export type StageReviewRequestedNotificationInput = {
  projectId: string;
  projectCode?: string;
  projectName: string;
  stage: StageKey;
  versionLabel?: string;
  actorName: string;
  href: string;
  occurredAt?: string;
};

const stageNotificationLabels: Record<StageKey, string> = {
  brief: "Brief",
  script: "Script",
  shoot: "Shoot",
  media: "Media",
  edit: "Edit",
  masters: "Masters",
};

const stageReviewNotificationCopy: Record<StageKey, string> = {
  brief: "Review the Brief and confirm the direction before production continues.",
  script: "Review the Script and add any feedback before production continues.",
  shoot: "Review the Shoot plan and confirm the production details.",
  media: "Review the shared Media and add any required feedback.",
  edit: "Watch the latest Edit and add any feedback in Brisk.",
  masters: "Review the latest Masters and approve the deliverables when you are happy.",
};

export function createClientStageReviewNotification({
  projectId,
  projectCode,
  projectName,
  stage,
  versionLabel,
  actorName,
  href,
  occurredAt = new Date().toISOString(),
}: StageReviewRequestedNotificationInput): RecipientInboxItem {
  const stageLabel = stageNotificationLabels[stage];
  const reviewTarget = [stageLabel, versionLabel].filter(Boolean).join(" ");
  const eventVersionKey = (versionLabel ?? "current").toLowerCase().replace(/[^a-z0-9]+/gu, "-");

  return {
    id: `generated-client-review-${projectId}-${stage}-${eventVersionKey}`,
    canonicalEventId: `generated-review-${projectId}-${stage}-${eventVersionKey}`,
    eventKey: "stage.review_requested",
    recipientId: notificationInboxRecipientByRole.Customer,
    recipientRole: "Customer",
    recipientResponsibility: "reviewer",
    category: "action-required",
    state: "warning",
    label: "Needs attention",
    title: `${reviewTarget} is ready for review`,
    copy: stageReviewNotificationCopy[stage],
    actorName,
    projectId,
    projectCode,
    projectName,
    stage,
    occurredAt,
    href,
    deepLinkTarget: "project-stage",
    ctaLabel: `Review ${stageLabel}`,
    emailDeliveryState: "sent",
    initiallyRead: false,
  };
}

export const notificationInboxRecipientByRole = {
  "Studio Staff": "user-tom",
  "Studio Freelancer": "user-nina",
  Customer: "user-jess",
} as const satisfies Record<PrototypeRole, string>;

export const notificationInboxItems = [
  {
    id: "inbox-staff-shoot-time",
    canonicalEventId: "event-call-sheet-time-change-1",
    eventKey: "shoot.schedule.time_changed",
    recipientId: "user-tom",
    recipientRole: "Studio Staff",
    recipientResponsibility: "project-lead",
    category: "action-required",
    state: "warning",
    label: "Needs attention",
    title: "Published call time changed",
    copy: "The crew call is now 6:30 am. Review the updated call sheet.",
    actorName: "David Ryan",
    projectId: "loom-launch-film",
    projectCode: "LOOM-24",
    projectName: "Launch Film - Sales Narrative",
    stage: "shoot",
    occurredAt: "2026-08-20T16:15:00+10:00",
    href: "/share/call-sheet/loom-launch-film?preview=1",
    deepLinkTarget: "call-sheet",
    ctaLabel: "View call sheet",
    initiallyRead: false,
  },
  {
    id: "inbox-staff-mentions",
    canonicalEventId: "event-edit-mentions-group-1",
    eventKey: "chat.mention.created",
    recipientId: "user-tom",
    recipientRole: "Studio Staff",
    recipientResponsibility: "mentioned-person",
    category: "mention",
    state: "information",
    label: "Update",
    title: "Three new mentions in Edit",
    copy: "Priya Nair and two others mentioned you in rapid feedback comments.",
    actorName: "Priya Nair",
    projectId: "hims-product-education",
    projectCode: "HIMS-18",
    projectName: "Product Education - Sleep Series",
    stage: "edit",
    occurredAt: "2026-08-20T15:42:00+10:00",
    href: "/chat?project=hims-product-education&message=message-hims-001",
    deepLinkTarget: "chat-message",
    groupedCount: 3,
    groupLabel: "3 mentions grouped",
    initiallyRead: false,
  },
  {
    id: "inbox-staff-invoice",
    canonicalEventId: "event-invoice-uploaded-loom-ct-1",
    eventKey: "cost.invoice.uploaded",
    recipientId: "user-tom",
    recipientRole: "Studio Staff",
    recipientResponsibility: "invoice-approver",
    category: "action-required",
    state: "warning",
    label: "Needs attention",
    title: "Contractor invoice needs approval",
    copy: "Chris Taylor submitted CT-3142-edit-services.pdf for A$1,950.",
    actorName: "Chris Taylor",
    projectId: "loom-launch-film",
    projectCode: "LOOM-24",
    projectName: "Launch Film - Sales Narrative",
    occurredAt: "2026-08-20T14:48:00+10:00",
    href: "/outstanding-invoices?invoice=invoice-loom-ct",
    deepLinkTarget: "outstanding-invoice",
    ctaLabel: "Review invoice",
    initiallyRead: false,
  },
  {
    id: "inbox-staff-transcript",
    canonicalEventId: "event-transcript-ready-1",
    eventKey: "media.transcript.ready",
    recipientId: "user-tom",
    recipientRole: "Studio Staff",
    recipientResponsibility: "requester",
    category: "update",
    state: "success",
    label: "Completed",
    title: "Interview transcript is ready",
    copy: "The transcript for Mia-interview-camera-b.mov finished processing.",
    projectId: "loom-launch-film",
    projectCode: "LOOM-24",
    projectName: "Launch Film - Sales Narrative",
    stage: "media",
    occurredAt: "2026-08-20T14:25:00+10:00",
    href: "/projects/loom-launch-film/stages/media?asset=media-02",
    deepLinkTarget: "media-asset",
    initiallyRead: false,
  },
  {
    id: "inbox-staff-stripe",
    canonicalEventId: "event-stripe-action-required-1",
    eventKey: "integration.stripe.action_required",
    recipientId: "user-tom",
    recipientRole: "Studio Staff",
    recipientResponsibility: "billing-contact",
    category: "action-required",
    state: "failure",
    label: "Failed",
    title: "Stripe connection needs attention",
    copy: "Reconnect Stripe to keep subscription and invoice payments working.",
    occurredAt: "2026-08-20T12:05:00+10:00",
    href: "/settings/client-billing",
    deepLinkTarget: "client-billing",
    ctaLabel: "Reconnect",
    initiallyRead: true,
  },
  {
    id: "inbox-staff-email-failure",
    canonicalEventId: "event-delivery-retries-exhausted-deel-review",
    eventKey: "delivery.retries_exhausted",
    recipientId: "user-tom",
    recipientRole: "Studio Staff",
    recipientResponsibility: "project-owner",
    category: "action-required",
    state: "failure",
    label: "Failed",
    title: "Review email couldn’t be sent",
    copy: "Email to Alex Morgan could not be sent.",
    projectId: "deel-customer-story",
    projectCode: "DEEL-18",
    projectName: "Customer Story - APAC Hiring",
    stage: "masters",
    occurredAt: "2026-08-20T13:30:26+10:00",
    href: null,
    deepLinkTarget: null,
    emailDeliveryState: "failed",
    emailRetrySuccess: {
      title: "Review email sent",
      copy: "Email to Alex Morgan was sent.",
    },
    initiallyRead: false,
  },
  {
    id: "inbox-staff-edit-review",
    canonicalEventId: "event-review-loom-edit-v3",
    eventKey: "stage.review_requested",
    recipientId: "user-tom",
    recipientRole: "Studio Staff",
    recipientResponsibility: "reviewer",
    category: "update",
    state: "information",
    label: "Update",
    title: "Edit review requested",
    copy: "Edit v3 is with Jess Taylor for review.",
    actorName: "David Ryan",
    projectId: "loom-launch-film",
    projectCode: "LOOM-24",
    projectName: "Launch Film - Sales Narrative",
    stage: "edit",
    occurredAt: "2026-08-20T11:00:00+10:00",
    href: "/projects/loom-launch-film/stages/edit",
    deepLinkTarget: "project-stage",
    ctaLabel: "Preview reminder",
    emailDeliveryState: "reminder-scheduled",
    emailReminderPreview: {
      recipient: "Jess Taylor · jess@loom.com",
      scheduledFor: "2026-08-21T11:00:00+10:00",
      subject: "Reminder: LOOM-24 Edit v3 is ready for review",
      body: [
        "Hi Jess,",
        "A quick reminder that LOOM-24 Edit v3 is ready for your review.",
        "Please review the latest version and add any feedback in Brisk.",
        "Thanks,\nNorth Star Films",
      ],
      ctaLabel: "Review Edit",
      ctaHref: "/projects/loom-launch-film/stages/edit",
    },
    initiallyRead: true,
  },
  {
    id: "inbox-staff-ready-to-edit",
    canonicalEventId: "event-ready-to-edit-1",
    eventKey: "project.ready_to_edit",
    recipientId: "user-tom",
    recipientRole: "Studio Staff",
    recipientResponsibility: "project-lead",
    category: "update",
    state: "success",
    label: "Completed",
    title: "Video is ready to edit",
    copy: "Brief, Script, Shoot and Media were completed together.",
    actorName: "David Ryan",
    projectId: "loom-launch-film",
    projectCode: "LOOM-24",
    projectName: "Launch Film - Sales Narrative",
    stage: "edit",
    occurredAt: "2026-08-20T11:05:00+10:00",
    href: "/projects/loom-launch-film/stages/edit",
    deepLinkTarget: "project-stage",
    groupedCount: 4,
    groupLabel: "4 Stages together",
    initiallyRead: true,
  },
  {
    id: "inbox-freelancer-call-sheet",
    canonicalEventId: "event-call-sheet-published-nina-1",
    eventKey: "shoot.call_sheet.published",
    recipientId: "user-nina",
    recipientRole: "Studio Freelancer",
    recipientResponsibility: "assigned-crew",
    category: "action-required",
    state: "information",
    label: "Update",
    title: "Call sheet published",
    copy: "Your shoot details are ready. Check the call time and location.",
    actorName: "David Ryan",
    projectId: "loom-launch-film",
    projectCode: "LOOM-24",
    projectName: "Launch Film - Sales Narrative",
    stage: "shoot",
    occurredAt: "2026-08-20T16:02:00+10:00",
    href: "/share/call-sheet/loom-launch-film?preview=1",
    deepLinkTarget: "call-sheet",
    ctaLabel: "View call sheet",
    initiallyRead: false,
  },
  {
    id: "inbox-freelancer-ready-to-edit",
    canonicalEventId: "event-ready-to-edit-freelancer-1",
    eventKey: "project.ready_to_edit",
    recipientId: "user-nina",
    recipientRole: "Studio Freelancer",
    recipientResponsibility: "assigned-editor",
    category: "action-required",
    state: "success",
    label: "Completed",
    title: "Your edit is ready to start",
    copy: "Brief, Script, Shoot and Media were completed in one transition.",
    actorName: "Tom Mitchell",
    projectId: "loom-launch-film",
    projectCode: "LOOM-24",
    projectName: "Launch Film - Sales Narrative",
    stage: "edit",
    occurredAt: "2026-08-20T11:05:00+10:00",
    href: "/projects/loom-launch-film/stages/edit",
    deepLinkTarget: "project-stage",
    ctaLabel: "Open Edit",
    groupedCount: 4,
    groupLabel: "4 Stages together",
    initiallyRead: false,
  },
  {
    id: "inbox-freelancer-transcript",
    canonicalEventId: "event-transcript-ready-freelancer-1",
    eventKey: "media.transcript.ready",
    recipientId: "user-nina",
    recipientRole: "Studio Freelancer",
    recipientResponsibility: "requester",
    category: "update",
    state: "success",
    label: "Completed",
    title: "Transcript processing complete",
    copy: "The requested interview transcript is ready for the paper edit.",
    projectId: "loom-launch-film",
    projectCode: "LOOM-24",
    projectName: "Launch Film - Sales Narrative",
    stage: "media",
    occurredAt: "2026-08-20T10:20:00+10:00",
    href: "/projects/loom-launch-film/stages/media?asset=media-02",
    deepLinkTarget: "media-asset",
    initiallyRead: true,
  },
  {
    id: "inbox-customer-review",
    canonicalEventId: "event-masters-review-requested-customer-1",
    eventKey: "stage.review_requested",
    recipientId: "user-jess",
    recipientRole: "Customer",
    recipientResponsibility: "reviewer",
    category: "action-required",
    state: "warning",
    label: "Needs attention",
    title: "Masters are ready for review",
    copy: "Review the 16:9 and 1:1 deliverables before final delivery.",
    actorName: "Tom Mitchell",
    projectId: "loom-launch-film",
    projectCode: "LOOM-24",
    projectName: "Launch Film - Sales Narrative",
    stage: "masters",
    occurredAt: "2026-08-20T16:35:00+10:00",
    href: "/projects/loom-launch-film/stages/masters?deliverable=loom-master-16x9",
    deepLinkTarget: "project-stage",
    ctaLabel: "Review Masters",
    groupedCount: 2,
    groupLabel: "2 reminders collapsed",
    initiallyRead: false,
  },
  {
    id: "inbox-customer-shoot-time",
    canonicalEventId: "event-call-sheet-time-change-customer-1",
    eventKey: "shoot.schedule.time_changed",
    recipientId: "user-jess",
    recipientRole: "Customer",
    recipientResponsibility: "customer-project-member",
    category: "action-required",
    state: "warning",
    label: "Needs attention",
    title: "Published shoot time changed",
    copy: "The crew call is now 6:30 am. Review the latest call sheet.",
    actorName: "David Ryan",
    projectId: "loom-launch-film",
    projectCode: "LOOM-24",
    projectName: "Launch Film - Sales Narrative",
    stage: "shoot",
    occurredAt: "2026-08-20T14:40:00+10:00",
    href: "/share/call-sheet/loom-launch-film?preview=1",
    deepLinkTarget: "call-sheet",
    ctaLabel: "View call sheet",
    initiallyRead: false,
  },
  {
    id: "inbox-customer-script-approved",
    canonicalEventId: "event-script-approved-customer-1",
    eventKey: "stage.approved",
    recipientId: "user-jess",
    recipientRole: "Customer",
    recipientResponsibility: "reviewer",
    category: "update",
    state: "success",
    label: "Approved",
    title: "Script approval recorded",
    copy: "The approved Script can now move to the next production Stage.",
    actorName: "Sarah Kim",
    projectId: "loom-launch-film",
    projectCode: "LOOM-24",
    projectName: "Launch Film - Sales Narrative",
    stage: "script",
    occurredAt: "2026-08-20T12:35:00+10:00",
    href: "/projects/loom-launch-film/script",
    deepLinkTarget: "project-stage",
    initiallyRead: true,
  },
  {
    id: "inbox-customer-access-removed",
    canonicalEventId: "event-customer-project-access-removed-1",
    eventKey: "access.customer_project.removed",
    recipientId: "user-jess",
    recipientRole: "Customer",
    recipientResponsibility: "affected-person",
    category: "update",
    state: "warning",
    label: "Changed",
    title: "Video access removed",
    copy: "Your access to one archived video was removed. Other available videos are unchanged.",
    occurredAt: "2026-08-20T09:30:00+10:00",
    href: "/customer-dashboard",
    deepLinkTarget: "customer-dashboard",
    initiallyRead: true,
  },
] as const satisfies readonly RecipientInboxItem[];

export function getAuthorisedNotificationInboxItems(
  role: PrototypeRole,
  sourceItems: readonly RecipientInboxItem[] = notificationInboxItems,
) {
  const recipientId = notificationInboxRecipientByRole[role];
  const authorisedItems = sourceItems
    .filter((item) => item.recipientId === recipientId && item.recipientRole === role)
    .filter(isAuthorisedNotificationInboxItem);
  const uniqueItems = new Map<string, RecipientInboxItem>();

  authorisedItems.forEach((item) => {
    uniqueItems.set(`${item.canonicalEventId}:${item.recipientId}`, item);
  });

  return [...uniqueItems.values()]
    .sort((left, right) => right.occurredAt.localeCompare(left.occurredAt));
}

function isAuthorisedNotificationInboxItem(item: RecipientInboxItem) {
  const eventDefinition = getNotificationEventDefinition(item.eventKey);
  const responsibilityContract = notificationRecipientMatrix[item.recipientResponsibility];
  const responsibilityRoles: readonly PrototypeRole[] = responsibilityContract.roles;

  if (
    eventDefinition.activityOnly
    || eventDefinition.outcomes.inbox !== "resolved-recipients"
    || !eventDefinition.recipientResponsibilities.includes(item.recipientResponsibility)
    || !responsibilityRoles.includes(item.recipientRole)
  ) {
    return false;
  }

  if (item.href === null || item.deepLinkTarget === null) {
    return item.href === null && item.deepLinkTarget === null;
  }

  if (eventDefinition.deepLink === null) {
    return false;
  }

  const registryDeepLink = typeof eventDefinition.deepLink === "string"
    ? eventDefinition.deepLink
    : eventDefinition.deepLink.audienceOverrides[
        item.recipientResponsibility === "affected-person"
          ? "affected-person"
          : item.recipientRole === "Customer"
            ? "customer"
            : "studio"
      ] ?? eventDefinition.deepLink.default;

  if (registryDeepLink !== item.deepLinkTarget) {
    return false;
  }

  const deepLinkContract = notificationDeepLinkMap[item.deepLinkTarget];
  const deepLinkRoles: readonly PrototypeRole[] = deepLinkContract.roles;
  return deepLinkRoles.includes(item.recipientRole);
}
