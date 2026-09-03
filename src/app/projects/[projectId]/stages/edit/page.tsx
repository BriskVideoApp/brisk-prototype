import { notFound } from "next/navigation";
import { VideoReviewScreen } from "@/components/video-review/VideoReviewScreen";
import { getProjectFixture, projectFixtureIds } from "@/data/project-fixtures";

export function generateStaticParams() {
  return projectFixtureIds.map((projectId) => ({ projectId }));
}

export default async function EditRoute({ params, searchParams }: { params: Promise<{ projectId: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { projectId } = await params;
  const query = await searchParams;
  const project = getProjectFixture(projectId);

  if (!project) notFound();

  return (
    <VideoReviewScreen
      initiallyEmpty={project.stages.edit.state === "not_started" || query.preview === "empty"}
      project={project}
    />
  );
}
