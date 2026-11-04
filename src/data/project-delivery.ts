import type { Project, ProjectDeadline } from "@/components/active-videos/types";
import type { ChatMessage } from "@/components/chat/types";
import type { BriefFields } from "@/data/brief";

export const deliveryTimeZone = "Australia/Sydney";

export function briefDeliveryDate(fields: BriefFields): string {
  try {
    const rows: unknown = JSON.parse(fields.deliverables.value || "[]");
    if (Array.isArray(rows)) {
      const main: unknown = rows.find((row: unknown) => row && typeof row === "object" && "isMain" in row && row.isMain) ?? rows[0];
      if (main && typeof main === "object" && "deadline" in main && typeof main.deadline === "string"
        && (main.deadline || ("usesProjectDeadline" in main && main.usesProjectDeadline === false))) return main.deadline;
    }
  } catch { /* Preserve the legacy date until the Brief has deliverables. */ }
  return fields.deadline.value;
}

export type DeliveryDateProposal = {
  id: string;
  date: string;
  previousDate: string | null;
  reason: string;
  proposedAt: string;
  proposedBy: string;
  proposedById: string;
  /** Older proposals were always made by the Studio. */
  proposedByRole?: "Studio Staff" | "Customer";
  status: "pending" | "agreed" | "superseded";
  agreedAt: string | null;
  agreedBy: string | null;
  agreedById: string | null;
};

export type ProjectDeliveryAgreement = {
  projectId: string;
  deliverableId?: string;
  deliverableName?: string;
  originalDate: string | null;
  agreedDate: string | null;
  proposals: DeliveryDateProposal[];
  changes?: DeliveryDateChange[];
};

export function initialVersionDeliveryAgreement(projectId: string, deliverableId: string, deliverableName: string, date: string): ProjectDeliveryAgreement {
  const agreedDate = date ? deliveryInstant(date, "17:00") : null;
  return { projectId, deliverableId, deliverableName, originalDate: agreedDate, agreedDate, proposals: [] };
}

export type DeliveryDateChange = {
  id: string;
  date: string;
  previousDate: string | null;
  changedAt: string;
  changedBy: string;
  changedById: string;
  source: "brief" | "studio";
  reason: string;
};

export function initialDeliveryAgreement(project: Project): ProjectDeliveryAgreement {
  const date = project.deadline?.finalDueAt ?? null;
  return { projectId: project.id, originalDate: date, agreedDate: date, proposals: [] };
}

export function getPendingDeliveryProposal(agreement: ProjectDeliveryAgreement) {
  return [...agreement.proposals].reverse().find((proposal) => proposal.status === "pending") ?? null;
}

export function deliveryAgreementSide(proposal: DeliveryDateProposal): "Studio Staff" | "Customer" {
  return proposal.proposedByRole === "Customer" ? "Studio Staff" : "Customer";
}

export function applyDeliveryAgreement(deadline: ProjectDeadline | undefined, agreement: ProjectDeliveryAgreement): ProjectDeadline | undefined {
  const finalDueAt = agreement.agreedDate ?? undefined;
  return deadline || finalDueAt ? { ...deadline, finalDueAt } : undefined;
}

export function deliveryHref(projectId: string, deliverableId?: string) {
  if (deliverableId) return `/projects/${encodeURIComponent(projectId)}/stages/brief?versionDeadline=${encodeURIComponent(deliverableId)}`;
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

export function formatDeliveryDate(value: string | null, includeTime = true) {
  if (!value) return "Not yet agreed";
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "Not yet agreed";
  const day = new Intl.DateTimeFormat("en-AU", { timeZone: deliveryTimeZone, weekday: "short", day: "numeric", month: "short" }).format(date).replace(",", "");
  return includeTime ? `${day} · ${deliveryDateParts(value).time}` : day;
}

export function createDeliveryMessages(agreement: ProjectDeliveryAgreement, readBy: Record<string, string[]>, projectComplete = false): ChatMessage[] {
  const subject = agreement.deliverableName ? `${agreement.deliverableName} delivery` : "final delivery";
  const changes: ChatMessage[] = (agreement.changes ?? []).map((change) => {
    const id = `delivery-${change.id}-changed`;
    const copy = `${change.changedBy} ${change.source === "brief" ? `set ${subject} in the Brief` : `changed ${subject}`} to ${formatDeliveryDate(change.date)}.${change.reason ? ` ${change.reason}` : ""}`;
    return { id, projectId: agreement.projectId, channel: "external", threadId: null,
      senderId: null, senderSystem: "Project update", senderRole: "system", body: copy, attachments: [], reactions: [],
      sourceChannel: "brisk", createdAt: change.changedAt, editedAt: null, deletedAt: null,
      readBy: readBy[id] ?? [], mentions: [], projectUpdate: {
        kind: "event", eventKey: "project.delivery.date_changed", canonicalEventId: id,
        presentation: "passive", state: "information", label: "Changed",
        title: change.source === "brief" ? "Delivery deadline set" : `${agreement.deliverableName ?? "Delivery"} deadline changed`, copy,
        href: deliveryHref(agreement.projectId, agreement.deliverableId), ctaLabel: "View deadline",
      } };
  });
  return [...changes, ...agreement.proposals.flatMap<ChatMessage>((proposal) => {
    const needsAgreement = proposal.status === "pending" && !projectComplete;
    const proposedId = deliveryMessageId(proposal.id, "proposed");
    const base: ChatMessage = {
      id: proposedId, projectId: agreement.projectId, channel: "external", threadId: null,
      senderId: null, senderSystem: "Project update", senderRole: "system", body: "", attachments: [], reactions: [],
      sourceChannel: "brisk", createdAt: proposal.proposedAt, editedAt: null, deletedAt: null,
      readBy: readBy[proposedId] ?? [], mentions: [],
    };
    const copy = `${agreement.deliverableName ? `Proposed ${subject}` : "Proposed delivery"}: ${formatDeliveryDate(proposal.date)}.${proposal.reason ? ` ${proposal.reason}` : ""}`;
    const proposed: ChatMessage = { ...base, body: copy, projectUpdate: {
      kind: "event", eventKey: "project.delivery.date_proposed", canonicalEventId: proposedId,
      presentation: needsAgreement ? "actionable" : "passive", state: needsAgreement ? "warning" : proposal.status === "agreed" ? "success" : "information", label: needsAgreement ? "Needs attention" : proposal.status === "agreed" ? "Approved" : "Update",
      title: needsAgreement ? `${agreement.deliverableName ?? "New delivery"} date proposed` : proposal.status === "agreed" ? "Delivery proposal agreed" : "Earlier delivery proposal", copy,
      href: deliveryHref(agreement.projectId, agreement.deliverableId), ctaLabel: needsAgreement ? "Review date" : "View delivery",
    } };
    if (proposal.status !== "agreed") return [proposed];
    const agreedId = deliveryMessageId(proposal.id, "agreed");
    const agreedCopy = `${proposal.agreedBy} agreed to ${subject} on ${formatDeliveryDate(proposal.date)}. The previous date is retained in delivery history.`;
    return [proposed, { ...base, id: agreedId, body: agreedCopy, createdAt: proposal.agreedAt ?? proposal.proposedAt,
      readBy: readBy[agreedId] ?? [], projectUpdate: {
        kind: "event", eventKey: "project.delivery.date_agreed", canonicalEventId: agreedId,
        presentation: "passive", state: "success", label: "Approved", title: "New delivery date agreed", copy: agreedCopy,
        href: deliveryHref(agreement.projectId, agreement.deliverableId), ctaLabel: "View delivery",
      } }];
  })];
}
