import { Suspense } from "react";
import { notFound } from "next/navigation";
import { MastersPage } from "@/components/masters/MastersPage";
import { getProjectFixture, projectFixtureIds } from "@/data/project-fixtures";

export function generateStaticParams() {
  return projectFixtureIds.map((projectId) => ({ projectId }));
}

export default async function MastersRoute({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  const project = getProjectFixture(projectId);

  if (!project) notFound();

  return <Suspense fallback={null}><MastersPage project={project} /></Suspense>;
}
