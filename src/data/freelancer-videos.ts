import type { InvitationPaymentBasis, Project, StageKey } from "@/components/active-videos/types";
import { stageLabels, teamRoleLabels } from "@/data/active-videos/teamDefaults";

export const freelancerPreviewViewer = {
  id: "np",
  name: "Nina Patel",
} as const;

export type FreelancerPaymentStatus =
  | "not_ready"
  | "invoice_required"
  | "invoice_submitted"
  | "sent_back"
  | "approved"
  | "paid";

export type FreelancerProjectToolAccess = {
  chat: boolean;
  files: boolean;
  queue: boolean;
  tags: boolean;
};

const defaultFreelancerProjectToolAccess: FreelancerProjectToolAccess = {
  chat: true,
  files: true,
  queue: true,
  tags: true,
};

export type FreelancerEngagement = {
  id: string;
  roleSlotId: string;
  invitationId: string;
  project: Project;
  roleLabel: string;
  stages: StageKey[];
  stageLabels: string[];
  estimatedHours: number;
  loggedHours: number;
  hourlyRate: number | null;
  paymentBasis: InvitationPaymentBasis;
  flatRate: number | null;
  invitationStatus: Project["team"][number]["invitations"][number]["status"];
  assignmentMethod: "invited" | "direct";
  toolAccess: FreelancerProjectToolAccess;
};

export const initialFreelancerPaymentStatus: Readonly<Record<string, FreelancerPaymentStatus>> = {
  "linear-roadmap-film": "invoice_required",
};

export function getFreelancerEngagements(
  projects: Project[],
  personId: string,
): FreelancerEngagement[] {
  return projects.flatMap((project) => project.team.flatMap((roleSlot) => {
    const invitations = roleSlot.invitations.filter((candidate) => candidate.personId === personId);
    const invitation = invitations.find((candidate) => candidate.id === roleSlot.acceptedInvitationId)
      ?? invitations.findLast((candidate) => candidate.status === "invited" || candidate.status === "seen")
      ?? invitations.at(-1);
    if (!invitation) return [];

    const stages = roleSlot.stages.map((stage) => stage.stageId);
    const estimatedHours = roleSlot.stages.reduce((total, stage) => total + stage.estimatedHours, 0);
    const loggedHours = project.timeEntries
      .filter((entry) => entry.personId === personId && entry.roleSlotId === roleSlot.id)
      .reduce((total, entry) => total + entry.hours, 0);

    return [{
      id: `${project.id}-${roleSlot.id}-${personId}`,
      roleSlotId: roleSlot.id,
      invitationId: invitation.id,
      project,
      roleLabel: teamRoleLabels[roleSlot.role],
      stages,
      stageLabels: stages.map((stage) => stageLabels[stage]),
      estimatedHours,
      loggedHours,
      hourlyRate: invitation.rateSnapshot ?? null,
      paymentBasis: invitation.paymentBasis ?? "hourly",
      flatRate: invitation.flatRateSnapshot ?? null,
      invitationStatus: invitation.status,
      assignmentMethod: invitation.assignmentMethod ?? "invited",
      toolAccess: getFreelancerProjectToolAccess(personId, project.id),
    }];
  }));
}

export function getAcceptedFreelancerEngagements(projects: Project[], personId: string): FreelancerEngagement[] {
  return getFreelancerEngagements(projects, personId).filter((engagement) =>
    engagement.invitationStatus === "accepted"
    && engagement.project.team.some((slot) => slot.id === engagement.roleSlotId
      && slot.acceptedInvitationId === engagement.invitationId));
}

export function getPendingFreelancerEngagements(projects: Project[], personId: string): FreelancerEngagement[] {
  return getFreelancerEngagements(projects, personId).filter((engagement) =>
    (engagement.invitationStatus === "invited" || engagement.invitationStatus === "seen")
    && engagement.project.team.some((slot) => slot.id === engagement.roleSlotId && !slot.acceptedInvitationId));
}

export function getFreelancerProjectToolAccess(
  _personId: string,
  _projectId: string,
): FreelancerProjectToolAccess {
  return { ...defaultFreelancerProjectToolAccess };
}

export function getFreelancerPaymentLabel(status: FreelancerPaymentStatus) {
  if (status === "invoice_required") return "Invoice required";
  if (status === "invoice_submitted") return "Invoice submitted";
  if (status === "sent_back") return "Invoice sent back";
  if (status === "approved") return "Payment approved";
  if (status === "paid") return "Paid";
  return "Not ready";
}
