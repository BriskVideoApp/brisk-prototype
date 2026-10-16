"use client";

import { Suspense } from "react";
import { MediaStagePage } from "@/components/media/MediaStagePage";
import { getSingleValue, ProjectUnavailable, type RouteQuery, useCanonicalStageProject } from "./CanonicalStageProject";

export function CanonicalMediaRoute({ projectId, query }: { projectId: string; query: RouteQuery }) {
  const { project, hasHydrated } = useCanonicalStageProject(projectId);
  if (!project) return hasHydrated ? <ProjectUnavailable /> : null;
  return (
    <Suspense fallback={null}>
      <MediaStagePage
        project={project}
        initialFolderId={getSingleValue(query.folder) ?? null}
        initialAssetId={getSingleValue(query.asset) ?? null}
        initialAssetIds={getSingleValue(query.assets)?.split(",") ?? []}
      />
    </Suspense>
  );
}
