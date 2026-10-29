"use client";

import { useMemo } from "react";
import { usePrototypeState } from "@/components/prototype-state/PrototypeStateContext";
import { usePrototypeViewer } from "@/components/prototype-state/usePrototypeViewer";
import { useProjectStageStatus } from "@/components/project/ProjectStageStatusContext";
import { useProjectFlow } from "@/components/project/ProjectFlowContext";
import { useStoryboard } from "@/components/storyboard/StoryboardContext";
import { canViewProject } from "@/data/prototype-access";
import { getAskInsights, type AskProject } from "@/data/ask-brisk";
import { productionFlowStages } from "@/data/production-flow";

export function useAskBriskModel(priorities: Record<string, string>) {
  const { state, hasHydrated } = usePrototypeState();
  const viewer = usePrototypeViewer();
  const { getProjectStages } = useProjectStageStatus();
  const { getProjectFlow } = useProjectFlow();
  const { getStoryboardStatus } = useStoryboard();
  const studioName = state.workspaces.find((workspace) => workspace.id === state.session.activeWorkspaceId)?.name ?? "the Studio";
  const projects = useMemo<AskProject[]>(() => hasHydrated ? state.projects
    .filter((project) => canViewProject(viewer, project, state))
    .map((project) => {
      const stages = getProjectStages(project);
      const flow = getProjectFlow(project);
      return { ...project, stages, assistantStages: flow.stages.map((key) => ({ key,
        label: key === "edit" && flow.postProductionTerm === "animation" ? "Animation" : productionFlowStages[key].label,
        status: (() => {
          const status = key === "storyboard" ? getStoryboardStatus(project.id) : stages[key];
          return { ...status, assignedTo: status.assignedTo ?? (status.state === "waiting" ? project.clientName : status.state === "in_progress" ? studioName : undefined) };
        })(),
      })) };
    }) : [], [getProjectFlow, getProjectStages, getStoryboardStatus, hasHydrated, state, studioName, viewer]);
  const workloadProjects = useMemo(() => viewer?.role !== "Studio Staff" ? projects : projects.filter((project) =>
    project.team.some((slot) => !slot.archivedAt && slot.invitations.some((invitation) => invitation.personId === viewer.personId
      && invitation.status === "accepted" && invitation.id === slot.acceptedInvitationId))), [projects, viewer]);
  const insights = useMemo(() => getAskInsights(workloadProjects, viewer?.role === "Customer", priorities), [priorities, viewer?.role, workloadProjects]);
  return { state, viewer, projects, workloadProjects, insights, priorities };
}
