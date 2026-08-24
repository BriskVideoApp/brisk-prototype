import { Suspense } from "react";
import { notFound } from "next/navigation";
import { MediaStagePage } from "@/components/media/MediaStagePage";
import { activeVideoProjects } from "@/data/active-videos/mockData";

export function generateStaticParams() {
  return activeVideoProjects.map((project) => ({ projectId: project.id }));
}

export default async function MediaRoute({ params, searchParams }: { params: Promise<{ projectId: string }>; searchParams: Promise<{ folder?: string | string[]; asset?: string | string[] }> }) {
  const { projectId } = await params;
  const query = await searchParams;
  const project = activeVideoProjects.find((activeProject) => activeProject.id === projectId);

  if (!project) notFound();

  return <Suspense fallback={null}><MediaStagePage project={project} initialFolderId={singleValue(query.folder)} initialAssetId={singleValue(query.asset)} /></Suspense>;
}

function singleValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] ?? null : value ?? null;
}
