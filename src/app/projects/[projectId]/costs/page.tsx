import { notFound } from "next/navigation";
import { ProjectCostsPage } from "@/components/costs/ProjectCostsPage";
import { activeVideoProjects } from "@/data/active-videos/mockData";

export function generateStaticParams() {
  return activeVideoProjects.map((project) => ({ projectId: project.id }));
}

export default async function ProjectCostsRoute({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  const project = activeVideoProjects.find((candidate) => candidate.id === projectId);
  if (!project) notFound();
  return <ProjectCostsPage project={project} />;
}
