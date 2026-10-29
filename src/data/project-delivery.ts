import type { Project, ProjectDeadline } from "@/components/active-videos/types";
import type { ChatMessage } from "@/components/chat/types";

export const deliveryTimeZone = "Australia/Sydney";

export type DeliveryDateProposal = {
  id: string;
  date: string;
  previousDate: string | null;
  reason: string;
  proposedAt: string;
  proposedBy: string;
  proposedById: string;
  status: "pending" | "agreed" | "superseded";
  agreedAt: string | null;
  agreedBy: string | null;
  agreedById: string | null;
};

export type ProjectDeliveryAgreement = {
  projectId: string;
  originalDate: string | null;
  agreedDate: string | null;
  proposals: DeliveryDateProposal[];
};

export function initialDeliveryAgreement(project: Project): ProjectDeliveryAgreement {
  const date = project.deadline?.finalDueAt ?? null;
  return { projectId: project.id, originalDate: date, agreedDate: date, proposals: [] };
}

export function getPendingDeliveryProposal(agreement: ProjectDeliveryAgreement) {
  return [...agreement.proposals].reverse().find((proposal) => proposal.status === "pending") ?? null;
}

export function applyDeliveryAgreement(deadline: ProjectDeadline | undefined, agreement: ProjectDeliveryAgreement): ProjectDeadline | undefined {
  const finalDueAt = agreement.agreedDate ?? undefined;
  return deadline || finalDueAt ? { ...deadline, finalDueAt } : undefined;
}

export function deliveryHref(projectId: string) {
  return `/projects/${encodeURIComponent(projectId)}/delivery`;
}

export function deliveryMessageId(proposalId: string, action: "proposed" | "agreed") {
  return `delivery-${proposalId}-${action}`;
}

export function deliveryChatHref(projectId: string, proposalId?: string) {
  const params = new URLSearchParams({ project: projectId });
  if (proposalId) params.set("message", deliveryMessageId(proposalId, "proposed"));
  return `/chat?${params.toString()}`;
}

export function deliveryDateParts(value: string) {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return { date: "", time: "" };
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: deliveryTimeZone, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23",
  }).formatToParts(date);
  const part = (type: Intl.DateTimeFormatPartTypes) => parts.find((entry) => entry.type === type)?.value ?? "";
  return { date: `${part("year")}-${part("month")}-${part("day")}`, time: `${part("hour")}:${part("minute")}` };
}

export function deliveryInstant(date: string, time: string): string | null {
  if (!/^\d{4}-\d{2}-\d{2}$/u.test(date) || !/^\d{2}:\d{2}$/u.test(time)) return null;
  const wallClock = Date.parse(`${date}T${time}:00Z`);
  if (!Number.isFinite(wallClock)) return null;
  let instant = wallClock;
  for (let index = 0; index < 3; index += 1) {
    const observed = deliveryDateParts(new Date(instant).toISOString());
    instant += wallClock - Date.parse(`${observed.date}T${observed.time}:00Z`);
  }
  const result = new Date(instant).toISOString();
  const checked = deliveryDateParts(result);
  return checked.date === date && checked.time === time ? result : null;
}

export function formatDeliveryDate(value: string | null) {
  if (!value) return "Not yet agreed";
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "Not yet agreed";
  const day = new Intl.DateTimeFormat("en-AU", { timeZone: deliveryTimeZone, weekday: "short", day: "numeric", month: "short" }).format(date).replace(",", "");
  return `${day} · ${deliveryDateParts(value).time}`;
}

export function createDeliveryMessages(agreement: ProjectDeliveryAgreement, readBy: Record<string, string[]>): ChatMessage[] {
  return agreement.proposals.flatMap((proposal) => {
    const proposedId = deliveryMessageId(proposal.id, "proposed");
    const base: ChatMessage = {
      id: proposedId, projectId: agreement.projectId, channel: "external", threadId: null,
      senderId: null, senderSystem: "Project update", senderRole: "system", body: "", attachments: [], reactions: [],
      sourceChannel: "brisk", createdAt: proposal.proposedAt, editedAt: null, deletedAt: null,
      readBy: readBy[proposedId] ?? [], mentions: [],
    };
    const copy = `Proposed delivery: ${formatDeliveryDate(proposal.date)}. ${proposal.reason}`;
    const proposed: ChatMessage = { ...base, body: copy, projectUpdate: {
      kind: "event", eventKey: "project.delivery.date_proposed", canonicalEventId: proposedId,
      presentation: "actionable", state: proposal.status === "pending" ? "warning" : proposal.status === "agreed" ? "success" : "information", label: proposal.status === "pending" ? "Needs attention" : proposal.status === "agreed" ? "Approved" : "Update",
      title: proposal.status === "superseded" ? "Earlier delivery proposal" : proposal.status === "agreed" ? "Delivery proposal agreed" : "New delivery date proposed", copy,
      href: deliveryHref(agreement.projectId), ctaLabel: "Review date",
    } };
    if (proposal.status !== "agreed") return [proposed];
    const agreedId = deliveryMessageId(proposal.id, "agreed");
    const agreedCopy = `${proposal.agreedBy} agreed to final delivery on ${formatDeliveryDate(proposal.date)}. The previous date is retained in delivery history.`;
    return [proposed, { ...base, id: agreedId, body: agreedCopy, createdAt: proposal.agreedAt ?? proposal.proposedAt,
      readBy: readBy[agreedId] ?? [], projectUpdate: {
        kind: "event", eventKey: "project.delivery.date_agreed", canonicalEventId: agreedId,
        presentation: "passive", state: "success", label: "Approved", title: "New delivery date agreed", copy: agreedCopy,
        href: deliveryHref(agreement.projectId), ctaLabel: "View delivery",
      } }];
  });
}
