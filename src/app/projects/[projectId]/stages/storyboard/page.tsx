import { notFound } from "next/navigation";
import { StoryboardPage } from "@/components/storyboard/StoryboardPage";
import { getProjectFixture, projectFixtureIds } from "@/data/project-fixtures";

export function generateStaticParams() {
  return projectFixtureIds.map((projectId) => ({ projectId }));
}

export default async function StoryboardRoute({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  const project = getProjectFixture(projectId);

  if (!project) notFound();

  return <StoryboardPage project={project} />;
}
