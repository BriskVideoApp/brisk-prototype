"use client";

import { Suspense } from "react";
import { StoryboardPage } from "@/components/storyboard/StoryboardPage";
import { ProjectUnavailable, useCanonicalStageProject } from "./CanonicalStageProject";

export function CanonicalStoryboardRoute({ projectId }: { projectId: string }) {
  const { project, hasHydrated } = useCanonicalStageProject(projectId);
  if (!project) return hasHydrated ? <ProjectUnavailable /> : null;
  return <Suspense fallback={null}><StoryboardPage project={project} /></Suspense>;
}
