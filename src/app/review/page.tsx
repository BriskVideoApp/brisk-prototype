import { notFound } from "next/navigation";
import { VideoReviewScreen } from "@/components/video-review/VideoReviewScreen";
import { activeVideoProjects } from "@/data/active-videos/mockData";
import { primaryDemoProject } from "@/data/projects";

export default function ReviewPage() {
  const project = activeVideoProjects.find((candidate) => candidate.id === primaryDemoProject.id);

  if (!project) notFound();

  return <VideoReviewScreen project={project} />;
}
