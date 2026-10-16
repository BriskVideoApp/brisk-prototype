"use client";

import { useMemo } from "react";
import { usePathname } from "next/navigation";
import { usePrototypeRole } from "@/components/navigation/PrototypeRoleContext";
import { usePrototypeScenario } from "@/components/prototype-scenarios/PrototypeScenarioContext";
import { usePrototypeState } from "@/components/prototype-state/PrototypeStateContext";
import { mockTeamPeople } from "@/data/active-videos/teamDefaults";
import { initialNativePeople } from "@/data/people";
import { getFreelancerNotificationRecipientId } from "@/data/notification-inbox";
import type { PrototypeViewer } from "@/data/prototype-access";

export function getPrototypeFreelancerViewer(workspaceId: string, participantName = "Nina Patel"): PrototypeViewer | null {
  const person = mockTeamPeople.find((candidate) => candidate.name === participantName && candidate.personType === "Studio Freelancer");
  const profile = initialNativePeople.find((candidate) => candidate.id === person?.id);
  if (!person || !profile) return null;
  const id = getFreelancerNotificationRecipientId(person.id, person.name);
  return { role: "Studio Freelancer", id, name: profile.name, email: profile.email,
    workspaceId, clientId: null, personId: person.id, chatUserId: id };
}

export function usePrototypeViewer(): PrototypeViewer | null {
  const pathname = usePathname();
  const { selectedRole } = usePrototypeRole();
  const { activeScenario } = usePrototypeScenario();
  const { state } = usePrototypeState();

  return useMemo(() => {
    const workspaceId = state.session.activeWorkspaceId;
    const portalClientId = pathname.match(/^\/workspaces\/[^/]+\/clients\/([^/]+)\/portal$/u)?.[1];
    const routedClientId = portalClientId ? decodeURIComponent(portalClientId) : null;
    const projectIdFromPath = pathname.match(/^\/projects\/([^/]+)/u)?.[1];
    const contextualProject = projectIdFromPath
      ? state.projects.find((project) => project.id === decodeURIComponent(projectIdFromPath)
        && project.workspaceId === workspaceId)
      : null;
    if (selectedRole === "Studio Staff") {
      const user = state.users.find((candidate) => candidate.id === state.session.activeUserId && candidate.role === "Studio Staff")
        ?? state.users.find((candidate) => candidate.role === "Studio Staff" && candidate.workspaceId === workspaceId);
      return user ? { role: selectedRole, id: user.id, name: user.name, email: user.email, workspaceId, clientId: null, personId: "te", chatUserId: user.id } : null;
    }
    if (selectedRole === "Studio Freelancer") {
      return getPrototypeFreelancerViewer(workspaceId,
        activeScenario?.accessRole === "Studio Freelancer" ? activeScenario.participantName : undefined);
    }
    const clientId = routedClientId ?? contextualProject?.clientId ?? activeScenario?.clientId ?? state.session.activeClientId ?? "loom";
    const projectMemberIds = contextualProject?.clientMemberIds ?? [];
    const projectMember = state.users.find((candidate) => candidate.role === "Client"
      && candidate.clientId === clientId
      && projectMemberIds.includes(candidate.id)
      && state.invitations.some((invitation) => invitation.workspaceId === workspaceId
        && invitation.clientId === clientId
        && invitation.userId === candidate.id
        && invitation.projectIds.includes(contextualProject?.id ?? "")
        && invitation.status !== "Expired"));
    const user = projectMember
      ?? state.users.find((candidate) => candidate.role === "Client" && candidate.clientId === clientId
        && (candidate.name === activeScenario?.participantName || candidate.name === "Jess Taylor"))
      ?? state.users.find((candidate) => candidate.role === "Client" && candidate.clientId === clientId);
    return user ? { role: selectedRole, id: user.id, name: user.name, email: user.email, workspaceId, clientId, personId: null, chatUserId: user.email === "jess@loom.com" ? "user-jess" : user.id } : null;
  }, [activeScenario?.accessRole, activeScenario?.clientId, activeScenario?.participantName, pathname, selectedRole, state.invitations, state.projects, state.session.activeClientId, state.session.activeUserId, state.session.activeWorkspaceId, state.users]);
}
