import type { Project, StageKey } from "@/components/active-videos/types";
import type { PrototypeState } from "@/data/prototype-state";

export type PrototypeViewer = {
  role: "Studio Staff" | "Studio Freelancer" | "Customer";
  id: string;
  name: string;
  email: string;
  workspaceId: string;
  clientId: string | null;
  personId: string | null;
  chatUserId: string;
};

export type ProjectAction = "status" | "upload" | "send" | "approve" | "comment" | "edit";

export function canViewProject(viewer: PrototypeViewer | null, project: Project, state: PrototypeState): boolean {
  if (!viewer || viewer.workspaceId !== state.session.activeWorkspaceId) return false;
  const scoped = state.projects.find((candidate) => candidate.id === project.id && candidate.workspaceId === viewer.workspaceId);
  if (!scoped) return false;
  if (viewer.role === "Studio Staff") return true;
  if (viewer.role === "Studio Freelancer") {
    return scoped.team.some((slot) => slot.invitations.some((invitation) =>
      invitation.personId === viewer.personId && invitation.status === "accepted" && slot.acceptedInvitationId === invitation.id));
  }
  if (scoped.clientId !== viewer.clientId || !scoped.clientMemberIds.includes(viewer.id)) return false;
  const client = state.clients.find((candidate) => candidate.id === viewer.clientId && candidate.workspaceId === viewer.workspaceId);
  if (!client || client.contacts.find((contact) => contact.id === viewer.id)?.portalAccess === "Paused") return false;
  return state.invitations.some((invitation) => invitation.workspaceId === viewer.workspaceId
    && invitation.clientId === viewer.clientId && invitation.userId === viewer.id
    && invitation.projectIds.includes(project.id) && invitation.status !== "Expired");
}

export function canActOnProject(
  viewer: PrototypeViewer | null,
  project: Project,
  state: PrototypeState,
  action: ProjectAction,
  stage?: StageKey,
): boolean {
  if (!canViewProject(viewer, project, state) || !viewer) return false;
  if (viewer.role === "Studio Staff") return true;
  if (viewer.role === "Customer") return action === "comment" || action === "approve" || action === "send"
    || (stage === "media" && (action === "upload" || action === "edit"));
  if (action === "status" || action === "approve") return false;
  if (stage === "media") return true;
  if (!stage) return action === "comment";
  const team = state.projects.find((candidate) => candidate.id === project.id && candidate.workspaceId === viewer.workspaceId)?.team ?? [];
  return team.some((slot) => slot.stages.some((assignment) => assignment.stageId === stage)
    && slot.invitations.some((invitation) => invitation.personId === viewer.personId
      && invitation.status === "accepted" && slot.acceptedInvitationId === invitation.id));
}
