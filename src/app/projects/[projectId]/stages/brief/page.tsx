import { notFound } from "next/navigation";
import { BriefPage } from "@/components/brief/BriefPage";
import { activeVideoProjects } from "@/data/active-videos/mockData";

export function generateStaticParams() {
  return activeVideoProjects.map((project) => ({
    projectId: project.id,
  }));
}

export default async function BriefRoute({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  const project = activeVideoProjects.find((activeProject) => activeProject.id === projectId);

  if (!project) {
    notFound();
  }

  return <BriefPage project={project} />;
}
