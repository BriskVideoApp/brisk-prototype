"use client";

import { Suspense } from "react";
import { MastersPage } from "@/components/masters/MastersPage";
import { getProjectFixture } from "@/data/project-fixtures";
import { ProjectUnavailable, useCanonicalStageProject } from "./CanonicalStageProject";

export function CanonicalMastersRoute({ projectId }: { projectId: string }) {
  const { project, projectBrief, hasHydrated } = useCanonicalStageProject(projectId);
  if (!project) return hasHydrated ? <ProjectUnavailable /> : null;
  return (
    <Suspense fallback={null}>
      <MastersPage
        key={project.id}
        initiallyEmpty
        isolateLegacyDeliverables={Boolean(getProjectFixture(project.id))}
        initialBriefFields={projectBrief?.fields}
        project={project}
      />
    </Suspense>
  );
}
