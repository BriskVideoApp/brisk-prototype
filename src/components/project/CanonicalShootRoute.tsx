"use client";

import { Suspense } from "react";
import { ShootStagePage } from "@/components/shoot/ShootStagePage";
import { ProjectUnavailable, useCanonicalStageProject } from "./CanonicalStageProject";

export function CanonicalShootRoute({ projectId }: { projectId: string }) {
  const { project, hasHydrated } = useCanonicalStageProject(projectId);
  if (!project) return hasHydrated ? <ProjectUnavailable /> : null;
  return <Suspense fallback={null}><ShootStagePage project={project} /></Suspense>;
}
