"use client";

import Link from "next/link";
import { BriefPage } from "@/components/brief/BriefPage";
import { ProjectOverviewPage } from "@/components/project/ProjectOverviewPage";
import { usePrototypeState } from "@/components/prototype-state/PrototypeStateContext";
import { selectProject, selectProjectBrief, selectWorkspace } from "@/data/prototype-state";

export function CanonicalProjectOverviewRoute({ projectId }: { projectId: string }) {
  const { state } = usePrototypeState();
  const project = selectProject(state, projectId);
  if (!project) return <ProjectUnavailable />;
  const workspace = selectWorkspace(state, project.workspaceId);
  return <ProjectOverviewPage project={project} studioName={workspace?.name ?? "Studio"} />;
}

export function CanonicalProjectBriefRoute({ projectId }: { projectId: string }) {
  const { state, updateProjectBrief } = usePrototypeState();
  const project = selectProject(state, projectId);
  const brief = selectProjectBrief(state, projectId);
  if (!project || !brief) return <ProjectUnavailable />;
  return (
    <BriefPage
      project={project}
      initialFields={brief.fields}
      onFieldsChange={(fields) => updateProjectBrief(project.id, fields)}
    />
  );
}

function ProjectUnavailable() {
  return (
    <main className="client-not-found">
      <h1 className="headings-s-bold">Project unavailable</h1>
      <p className="paragraph-s">This project is not part of the active Studio workspace.</p>
      <Link className="client-secondary-button label-s-semibold" href="/active-videos">Back to Videos</Link>
    </main>
  );
}
