import { notFound } from "next/navigation";
import { ScriptPage } from "@/components/script/ScriptPage";
import { activeVideoProjects } from "@/data/active-videos/mockData";
import { demoProjects, getDemoProject } from "@/data/projects";

type ScriptRouteProps = {
  params: Promise<{ projectId: string }>;
  searchParams: Promise<{
    subtab?: string | string[];
    clip?: string | string[];
  }>;
};

export function generateStaticParams() {
  return demoProjects.map((project) => ({ projectId: project.id }));
}

export default async function ScriptRoute({ params, searchParams }: ScriptRouteProps) {
  const { projectId } = await params;
  const query = await searchParams;
  const project = activeVideoProjects.find((candidate) => candidate.id === projectId);

  if (!getDemoProject(projectId) || !project) notFound();

  const subtab = getSubtab(query.subtab);
  const clip = getSingleValue(query.clip);

  return (
    <ScriptPage
      project={project}
      initialSubtab={subtab}
      initialTranscriptClipId={clip}
    />
  );
}

function getSubtab(subtab: string | string[] | undefined) {
  const value = getSingleValue(subtab);
  return value === "transcripts" ? value : "script";
}

function getSingleValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value ?? null;
}
