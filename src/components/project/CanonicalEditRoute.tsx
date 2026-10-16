"use client";

import { Suspense } from "react";
import { VideoReviewScreen } from "@/components/video-review/VideoReviewScreen";
import { getProjectFixture } from "@/data/project-fixtures";
import { ProjectUnavailable, useCanonicalStageProject } from "./CanonicalStageProject";

export function CanonicalEditRoute({ projectId }: { projectId: string }) {
  const { project, hasHydrated } = useCanonicalStageProject(projectId);
  if (!project) return hasHydrated ? <ProjectUnavailable /> : null;
  return (
    <Suspense fallback={null}>
      <VideoReviewScreen initiallyEmpty isolateLegacyReview={Boolean(getProjectFixture(project.id))} project={project} />
    </Suspense>
  );
}
