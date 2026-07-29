import { notFound } from "next/navigation";
import { ProjectFilesPage } from "@/components/project/ProjectFilesPage";
import { activeVideoProjects } from "@/data/active-videos/mockData";

export function generateStaticParams() {
  return activeVideoProjects.map((project) => ({
    projectId: project.id,
  }));
}

export default async function ProjectFilesRoute({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  const project = activeVideoProjects.find((activeProject) => activeProject.id === projectId);

  if (!project) notFound();

  return <ProjectFilesPage project={project} />;
}
