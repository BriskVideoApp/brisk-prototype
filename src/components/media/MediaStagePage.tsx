"use client";

import type { Project } from "@/components/active-videos/types";
import { ProjectStageHeader } from "@/components/project/ProjectStageHeader";
import { MediaBrowser } from "./MediaBrowser";
import { useMediaLibrary } from "./MediaLibraryContext";

export function MediaStagePage({ project, initialFolderId = null, initialAssetId = null }: { project: Project; initialFolderId?: string | null; initialAssetId?: string | null }) {
  const { assetViews } = useMediaLibrary();
  const mediaCount = assetViews.filter((asset) => asset.projectId === project.id && !asset.archivedAt && asset.collection === "media").length;
  return <main className="media-stage-shell"><ProjectStageHeader project={project} activeUtility="media" mediaCount={mediaCount} /><MediaBrowser scope="project" project={project} initialFolderId={initialFolderId} initialAssetId={initialAssetId} /></main>;
}
