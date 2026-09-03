import { Suspense } from "react";
import { notFound } from "next/navigation";
import { MediaStagePage } from "@/components/media/MediaStagePage";
import { getProjectFixture, projectFixtureIds } from "@/data/project-fixtures";

export function generateStaticParams() {
  return projectFixtureIds.map((projectId) => ({ projectId }));
}

export default async function MediaRoute({ params, searchParams }: { params: Promise<{ projectId: string }>; searchParams: Promise<{ folder?: string | string[]; asset?: string | string[] }> }) {
  const { projectId } = await params;
  const query = await searchParams;
  const project = getProjectFixture(projectId);

  if (!project) notFound();

  return <Suspense fallback={null}><MediaStagePage project={project} initialFolderId={singleValue(query.folder)} initialAssetId={singleValue(query.asset)} /></Suspense>;
}

function singleValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] ?? null : value ?? null;
}
