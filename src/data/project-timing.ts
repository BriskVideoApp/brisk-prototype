import type { ChatChannel, ChatMessage } from "@/components/chat/types";
import { deliveryHref } from "./project-delivery";

export type ProjectTimingAssessment = {
  projectId: string;
  suggestedDate: string;
  reason: string;
  internalReason: string;
  assessedAt: string;
  /** A fixture must never replace or reinterpret a saved project deadline. */
  referenceFinalDate: string;
  productionRisk: boolean;
};

// Historical demo assessments retained for traceability. Current suggestions use
// the working-day forecast in TurnaroundContext, not these fixed dates.
export const projectTimingAssessments: readonly ProjectTimingAssessment[] = [
  {
    projectId: "loom-launch-film",
    suggestedDate: "2026-09-02",
    reason: "We need a little more time for filming, editing and final checks. We’ll confirm the delivery date with you.",
    internalReason: "The Shoot and footage handover are still outstanding. Review the time needed for Edit and Masters before confirming final delivery.",
    assessedAt: "2026-08-13T10:00:00+10:00",
    referenceFinalDate: "2026-08-29",
    productionRisk: true,
  },
  {
    projectId: "hims-product-education",
    suggestedDate: "2026-08-27",
    reason: "The animation needs a little more production time, followed by final checks. We’ll confirm the delivery date with you.",
    internalReason: "Script is waiting on the Studio. Storyboard and Animation still need time before Masters. Review the estimate before sharing it with the Client.",
    assessedAt: "2026-08-13T10:15:00+10:00",
    referenceFinalDate: "2026-08-22",
    productionRisk: true,
  },
];

export type ProjectTimingIssue = {
  id: string;
  projectId: string;
  kind: "brief" | "production";
  requestedDate: string;
  suggestedDate: string;
  reason: string;
  internalReason: string;
  createdAt: string;
  /** External copy is a separate producer-reviewed snapshot. */
  clientUpdate: { reason: string; sharedAt: string; reviewedBy: string } | null;
  resolvedAt: string | null;
};

export function formatTimingDate(value: string) {
  const date = new Date(`${value}T12:00:00Z`);
  if (Number.isNaN(date.getTime())) return "To be confirmed";
  return new Intl.DateTimeFormat("en-AU", {
    weekday: "short", day: "numeric", month: "short", timeZone: "UTC",
  }).format(date).replace(",", "");
}

export function timingMessageId(issueId: string, channel: ChatChannel) {
  return `timing-${issueId}-${channel}`;
}

export function timingChatHref(issue: ProjectTimingIssue, channel: ChatChannel, review = false) {
  const params = new URLSearchParams({ project: issue.projectId, message: timingMessageId(issue.id, channel) });
  if (review) params.set("timing", issue.id);
  return `/chat?${params.toString()}`;
}

export function createTimingMessage(issue: ProjectTimingIssue, channel: ChatChannel, readBy: string[]): ChatMessage {
  const reason = channel === "internal" ? issue.internalReason : issue.clientUpdate?.reason ?? issue.reason;
  const copy = `Requested ${formatTimingDate(issue.requestedDate)} · Suggested ${formatTimingDate(issue.suggestedDate)}. ${reason}`;
  return {
    id: timingMessageId(issue.id, channel), projectId: issue.projectId, channel,
    threadId: null, senderId: null, senderSystem: "Project update", senderRole: "system",
    body: copy, attachments: [], reactions: [], sourceChannel: "brisk",
    createdAt: channel === "external" ? issue.clientUpdate?.sharedAt ?? issue.createdAt : issue.createdAt,
    editedAt: null, deletedAt: null, readBy, mentions: [],
    projectUpdate: {
      kind: "event", eventKey: issue.kind === "brief" ? "project.timing.review_required"
        : channel === "internal" ? "project.timing.production_risk" : "project.timing.client_update",
      canonicalEventId: timingMessageId(issue.id, channel), presentation: "actionable", state: issue.resolvedAt ? "success" : "warning", label: issue.resolvedAt ? "Approved" : "Needs attention",
      title: issue.resolvedAt ? "Earlier timing review resolved" : "Delivery date needs review", copy,
      href: issue.resolvedAt ? deliveryHref(issue.projectId) : timingChatHref(issue, channel, true), ctaLabel: issue.resolvedAt ? "View delivery" : "Review date",
      timingIssueId: issue.id,
    },
  };
}
