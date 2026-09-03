import { Suspense } from "react";
import { notFound } from "next/navigation";
import { ShootStagePage } from "@/components/shoot/ShootStagePage";
import { getProjectFixture, projectFixtureIds } from "@/data/project-fixtures";

export function generateStaticParams() {
  return projectFixtureIds.map((projectId) => ({ projectId }));
}

export default async function ShootRoute({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  const project = getProjectFixture(projectId);

  if (!project) notFound();

  return <Suspense fallback={null}><ShootStagePage project={project} /></Suspense>;
}
