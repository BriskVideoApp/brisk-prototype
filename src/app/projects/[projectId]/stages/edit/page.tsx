import { notFound } from "next/navigation";
import { VideoReviewScreen } from "@/components/video-review/VideoReviewScreen";
import { activeVideoProjects } from "@/data/active-videos/mockData";
import { demoProjects, getDemoProject } from "@/data/projects";

export function generateStaticParams() {
  return demoProjects.map((project) => ({ projectId: project.id }));
}

export default async function EditRoute({ params, searchParams }: { params: Promise<{ projectId: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { projectId } = await params;
  const query = await searchParams;
  const demoProject = getDemoProject(projectId);
  const project = activeVideoProjects.find((candidate) => candidate.id === projectId);

  if (!demoProject || !project) notFound();

  return (
    <VideoReviewScreen
      initiallyEmpty={project.stages.edit.state === "not_started" || query.preview === "empty"}
      project={project}
    />
  );
}
