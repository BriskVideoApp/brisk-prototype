import { notFound } from "next/navigation";
import { MastersPage } from "@/components/masters/MastersPage";
import { activeVideoProjects } from "@/data/active-videos/mockData";

export function generateStaticParams() {
  return activeVideoProjects.map((project) => ({ projectId: project.id }));
}

export default async function MastersRoute({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  const project = activeVideoProjects.find((activeProject) => activeProject.id === projectId);

  if (!project) notFound();

  return <MastersPage project={project} />;
}
