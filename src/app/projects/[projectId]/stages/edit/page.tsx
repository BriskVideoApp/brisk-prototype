import { notFound } from "next/navigation";
import { VideoReviewScreen } from "@/components/video-review/VideoReviewScreen";
import { activeVideoProjects } from "@/data/active-videos/mockData";
import { demoProjects, getDemoProject } from "@/data/projects";

export function generateStaticParams() {
  return demoProjects.map((project) => ({ projectId: project.id }));
}

export default async function EditRoute({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  const demoProject = getDemoProject(projectId);
  const project = activeVideoProjects.find((candidate) => candidate.id === projectId);

  if (!demoProject || !project) notFound();

  return <VideoReviewScreen project={project} />;
}
