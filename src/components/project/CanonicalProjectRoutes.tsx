"use client";

import Link from "next/link";
import { BriefPage } from "@/components/brief/BriefPage";
import { usePrototypeState } from "@/components/prototype-state/PrototypeStateContext";
import { selectProject, selectProjectBrief } from "@/data/prototype-state";

export function CanonicalProjectBriefRoute({ projectId }: { projectId: string }) {
  const { state, updateProjectBrief } = usePrototypeState();
  const project = selectProject(state, projectId);
  const brief = selectProjectBrief(state, projectId);
  const workspace = state.workspaces.find((candidate) => candidate.id === state.session.activeWorkspaceId);
  if (!project || !brief) return <ProjectUnavailable />;
  return (
    <BriefPage
      project={project}
      studioName={workspace?.name ?? "Studio"}
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
