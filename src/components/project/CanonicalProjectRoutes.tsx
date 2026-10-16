"use client";

import { BriefPage } from "@/components/brief/BriefPage";
import { ProjectCostsPage } from "@/components/costs/ProjectCostsPage";
import { usePrototypeState } from "@/components/prototype-state/PrototypeStateContext";
import { selectProject, selectProjectBrief } from "@/data/prototype-state";
import { ProjectUnavailable } from "./CanonicalStageProject";

export function CanonicalProjectBriefRoute({ projectId }: { projectId: string }) {
  const { state, hasHydrated, updateProjectBrief } = usePrototypeState();
  if (!hasHydrated) return null;
  const project = selectProject(state, projectId);
  const brief = selectProjectBrief(state, projectId);
  const workspace = state.workspaces.find((candidate) => candidate.id === state.session.activeWorkspaceId);
  if (!project || !brief) return hasHydrated ? <ProjectUnavailable /> : null;
  return (
    <BriefPage
      project={project}
      studioName={workspace?.name ?? "Studio"}
      initialFields={brief.fields}
      briefConfiguration={brief.configuration}
      onFieldsChange={(fields) => updateProjectBrief(project.id, fields)}
    />
  );
}

export function CanonicalProjectCostsRoute({ projectId }: { projectId: string }) {
  const { state, hasHydrated } = usePrototypeState();
  if (!hasHydrated) return null;
  const project = selectProject(state, projectId);
  return project ? <ProjectCostsPage project={project} /> : <ProjectUnavailable />;
}
