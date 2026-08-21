import type { StageKey } from "@/components/active-videos/types";
import type { ChatMessage, ChatRole } from "@/components/chat/types";
import type {
  NotificationSemanticLabel,
  NotificationSemanticState,
  ProjectSystemPostData,
} from "@/components/notifications/types";
import {
  getNotificationEventDefinition,
  type NotificationEventKey,
} from "@/data/notification-registry";

type ActivityAudience = "studio" | "shared";

type ActivityPresentation = {
  action: string;
  detail: string;
  entityLabel: string;
};

export type ProjectActivityEntry = {
  id: string;
  canonicalEventId: string;
  eventKey: NotificationEventKey;
  projectId: string;
  actorName: string;
  stage: StageKey | null;
  occurredAt: string;
  audience: ActivityAudience;
  internal: ActivityPresentation;
  external?: ActivityPresentation;
  hrefByRole: Partial<Record<ChatRole, string>>;
};

export type VisibleProjectActivityEntry = Omit<
  ProjectActivityEntry,
  "internal" | "external" | "hrefByRole"
> & ActivityPresentation & {
  href: string | null;
  activityOnly: boolean;
  state: NotificationSemanticState;
  label: NotificationSemanticLabel;
};

const activityStateByEvent: Partial<
  Record<NotificationEventKey, { state: NotificationSemanticState; label: NotificationSemanticLabel }>
> = {
  "activity.shoot_draft.changed": { state: "information", label: "Update" },
  "project.ready_to_edit": { state: "success", label: "Completed" },
  "shoot.schedule.time_changed": { state: "warning", label: "Changed" },
  "stage.approved": { state: "success", label: "Approved" },
  "media.processing.failed": { state: "failure", label: "Failed" },
  "cost.invoice.approved": { state: "success", label: "Approved" },
};

export const projectActivityEntries: readonly ProjectActivityEntry[] = [
  {
    id: "activity-call-sheet-draft-1",
    canonicalEventId: "event-call-sheet-draft-1",
    eventKey: "activity.shoot_draft.changed",
    projectId: "loom-launch-film",
    actorName: "Tom Mitchell",
    stage: "shoot",
    occurredAt: "2026-08-20T09:20:00+10:00",
    audience: "studio",
    internal: {
      action: "Tom Mitchell edited a draft call sheet",
      detail: "Draft changes are recorded here and do not post to Chat.",
      entityLabel: "Shoot day 1 call sheet",
    },
    hrefByRole: {
      "Studio Staff": "/projects/loom-launch-film/stages/shoot",
      "Studio Freelancer": "/projects/loom-launch-film/stages/shoot",
    },
  },
  {
    id: "activity-ready-to-edit-1",
    canonicalEventId: "event-ready-to-edit-1",
    eventKey: "project.ready_to_edit",
    projectId: "loom-launch-film",
    actorName: "Tom Mitchell",
    stage: null,
    occurredAt: "2026-08-20T11:05:00+10:00",
    audience: "studio",
    internal: {
      action: "Tom Mitchell marked the video ready to edit",
      detail: "Brief, Script, Shoot and Media were completed together.",
      entityLabel: "Edit",
    },
    hrefByRole: {
      "Studio Staff": "/projects/loom-launch-film/stages/edit",
      "Studio Freelancer": "/projects/loom-launch-film/stages/edit",
    },
  },
  {
    id: "activity-script-approved-1",
    canonicalEventId: "event-script-approved-1",
    eventKey: "stage.approved",
    projectId: "loom-launch-film",
    actorName: "Jess Harper",
    stage: "script",
    occurredAt: "2026-08-20T12:35:00+10:00",
    audience: "shared",
    internal: {
      action: "Jess Harper approved the Script",
      detail: "The approved Script can now move to the next production step.",
      entityLabel: "Script v4",
    },
    external: {
      action: "Script approved",
      detail: "The Script has been approved.",
      entityLabel: "Script v4",
    },
    hrefByRole: {
      "Studio Staff": "/projects/loom-launch-film/script",
      "Studio Freelancer": "/projects/loom-launch-film/script",
      Customer: "/projects/loom-launch-film/script",
    },
  },
  {
    id: "activity-call-sheet-time-change-1",
    canonicalEventId: "event-call-sheet-time-change-1",
    eventKey: "shoot.schedule.time_changed",
    projectId: "loom-launch-film",
    actorName: "Tom Mitchell",
    stage: "shoot",
    occurredAt: "2026-08-20T16:15:00+10:00",
    audience: "shared",
    internal: {
      action: "Tom Mitchell changed a published call time",
      detail: "Crew call changed from 7:00 am to 6:30 am.",
      entityLabel: "Shoot day 1 call sheet",
    },
    external: {
      action: "Published call time changed",
      detail: "A published call time has changed. Review the latest call sheet.",
      entityLabel: "Shoot day 1 call sheet",
    },
    hrefByRole: {
      "Studio Staff": "/share/call-sheet/loom-launch-film",
      "Studio Freelancer": "/share/call-sheet/loom-launch-film",
      Customer: "/share/call-sheet/loom-launch-film",
    },
  },
  {
    id: "activity-media-processing-failed-1",
    canonicalEventId: "event-media-processing-failed-1",
    eventKey: "media.processing.failed",
    projectId: "loom-launch-film",
    actorName: "Brisk",
    stage: "media",
    occurredAt: "2026-08-20T16:42:00+10:00",
    audience: "studio",
    internal: {
      action: "Media processing failed",
      detail: "Interview A camera original needs attention before editing can continue.",
      entityLabel: "Interview A - Camera 1.mov",
    },
    hrefByRole: {
      "Studio Staff": "/projects/loom-launch-film/stages/media",
      "Studio Freelancer": "/projects/loom-launch-film/stages/media",
    },
  },
  {
    id: "activity-invoice-approved-1",
    canonicalEventId: "event-invoice-approved-1",
    eventKey: "cost.invoice.approved",
    projectId: "loom-launch-film",
    actorName: "Tom Mitchell",
    stage: null,
    occurredAt: "2026-08-20T17:10:00+10:00",
    audience: "studio",
    internal: {
      action: "Tom Mitchell approved a contractor invoice",
      detail: "Commercial details are visible only to authorised Studio Staff.",
      entityLabel: "Invoice NS-2048",
    },
    hrefByRole: {
      "Studio Staff": "/projects/loom-launch-film/costs",
    },
  },
] as const;

type SystemPostFixture = ProjectSystemPostData & {
  id: string;
  projectId: string;
  channel: "internal" | "external";
  createdAt: string;
};

export const projectSystemPostFixtures: readonly SystemPostFixture[] = [
  {
    id: "system-ready-to-edit-1",
    projectId: "loom-launch-film",
    channel: "internal",
    createdAt: "2026-08-20T11:05:00+10:00",
    eventKey: "project.ready_to_edit",
    canonicalEventId: "event-ready-to-edit-1",
    presentation: "passive",
    state: "success",
    label: "Completed",
    title: "Ready to edit",
    copy: "Brief, Script, Shoot and Media were completed together.",
    href: "/projects/loom-launch-film/stages/edit",
    ctaLabel: "Open Edit",
    groupedCount: 4,
  },
  {
    id: "system-script-approved-internal-1",
    projectId: "loom-launch-film",
    channel: "internal",
    createdAt: "2026-08-20T12:35:00+10:00",
    eventKey: "stage.approved",
    canonicalEventId: "event-script-approved-1",
    presentation: "passive",
    state: "success",
    label: "Approved",
    title: "Jess Harper approved the Script",
    copy: "Script v4 is approved and can move to the next production step.",
    href: "/projects/loom-launch-film/script",
    ctaLabel: "Open Script",
  },
  {
    id: "system-script-approved-1",
    projectId: "loom-launch-film",
    channel: "external",
    createdAt: "2026-08-20T12:35:00+10:00",
    eventKey: "stage.approved",
    canonicalEventId: "event-script-approved-1",
    presentation: "passive",
    state: "success",
    label: "Approved",
    title: "Script approved",
    copy: "The Script has been approved.",
    href: "/projects/loom-launch-film/script",
    ctaLabel: "Open Script",
  },
  {
    id: "system-call-sheet-time-internal-1",
    projectId: "loom-launch-film",
    channel: "internal",
    createdAt: "2026-08-20T16:15:00+10:00",
    eventKey: "shoot.schedule.time_changed",
    canonicalEventId: "event-call-sheet-time-change-1",
    presentation: "actionable",
    state: "warning",
    label: "Changed",
    title: "Published call time changed",
    copy: "Crew call changed from 7:00 am to 6:30 am. Affected crew have been notified.",
    href: "/share/call-sheet/loom-launch-film",
    ctaLabel: "Open call sheet",
  },
  {
    id: "system-call-sheet-time-external-1",
    projectId: "loom-launch-film",
    channel: "external",
    createdAt: "2026-08-20T16:15:00+10:00",
    eventKey: "shoot.schedule.time_changed",
    canonicalEventId: "event-call-sheet-time-change-1",
    presentation: "actionable",
    state: "warning",
    label: "Changed",
    title: "Published call time changed",
    copy: "A published call time has changed. Review the latest call sheet.",
    href: "/share/call-sheet/loom-launch-film",
    ctaLabel: "Review changes",
  },
] as const;

function isVisibleToRole(entry: ProjectActivityEntry, role: ChatRole) {
  if (role === "Customer") {
    return entry.audience === "shared" && entry.external !== undefined;
  }

  if (role === "Studio Freelancer") {
    return entry.eventKey !== "cost.invoice.approved";
  }

  return true;
}

function presentActivityEntry(entry: ProjectActivityEntry, role: ChatRole): VisibleProjectActivityEntry {
  const presentation = role === "Customer" ? entry.external ?? entry.internal : entry.internal;
  const semantic = activityStateByEvent[entry.eventKey] ?? {
    state: "information" as const,
    label: "Update" as const,
  };

  return {
    id: entry.id,
    canonicalEventId: entry.canonicalEventId,
    eventKey: entry.eventKey,
    projectId: entry.projectId,
    actorName: entry.actorName,
    stage: entry.stage,
    occurredAt: entry.occurredAt,
    audience: entry.audience,
    ...presentation,
    href: entry.hrefByRole[role] ?? null,
    activityOnly: getNotificationEventDefinition(entry.eventKey).activityOnly,
    ...semantic,
  };
}

function newestFirst(left: VisibleProjectActivityEntry, right: VisibleProjectActivityEntry) {
  return Date.parse(right.occurredAt) - Date.parse(left.occurredAt);
}

export function getVisibleActivityFeed(role: ChatRole) {
  return projectActivityEntries
    .filter((entry) => isVisibleToRole(entry, role))
    .map((entry) => presentActivityEntry(entry, role))
    .sort(newestFirst);
}

export function getVisibleProjectActivity(
  projectId: string,
  role: ChatRole,
  options: { freelancerHasProjectAccess?: boolean } = {},
) {
  const allProjectEntries = projectActivityEntries.filter((entry) => entry.projectId === projectId);
  const freelancerHasProjectAccess = options.freelancerHasProjectAccess ?? true;
  const visibleEntries = role === "Studio Freelancer" && !freelancerHasProjectAccess
    ? []
    : allProjectEntries.filter((entry) => isVisibleToRole(entry, role));

  return {
    entries: visibleEntries
      .map((entry) => presentActivityEntry(entry, role))
      .sort(newestFirst),
    hasPermissionFilteredEntries: visibleEntries.length < allProjectEntries.length,
  };
}

export const projectSystemPostMessages: ChatMessage[] = projectSystemPostFixtures.map((post) => ({
  id: post.id,
  projectId: post.projectId,
  channel: post.channel,
  threadId: null,
  senderId: null,
  senderSystem: "Brisk",
  senderRole: "system",
  body: post.title,
  attachments: [],
  reactions: [],
  sourceChannel: "brisk",
  createdAt: post.createdAt,
  editedAt: null,
  deletedAt: null,
  readBy: post.channel === "external"
    ? ["user-tom", "user-david", "user-marcus", "user-jess", "user-sarah"]
    : ["user-tom", "user-david", "user-marcus"],
  mentions: [],
  projectUpdate: {
    kind: "event",
    eventKey: post.eventKey,
    canonicalEventId: post.canonicalEventId,
    presentation: post.presentation,
    state: post.state,
    label: post.label,
    title: post.title,
    copy: post.copy,
    href: post.href,
    ctaLabel: post.ctaLabel,
    groupedCount: post.groupedCount,
    thumbnailUrl: post.thumbnailUrl,
  },
}));
