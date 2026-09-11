import { Suspense } from "react";
import { notFound } from "next/navigation";
import { SharedCallSheetPage } from "@/components/shoot/SharedCallSheetPage";
import { getProjectFixture, projectFixtureIds } from "@/data/project-fixtures";

export function generateStaticParams() {
  return projectFixtureIds.map((projectId) => ({ projectId }));
}

export default async function SharedCallSheetRoute({
  params,
  searchParams,
}: {
  params: Promise<{ projectId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { projectId } = await params;
  const query = await searchParams;
  const project = getProjectFixture(projectId);

  if (!project) notFound();

  return (
    <Suspense fallback={null}>
      <SharedCallSheetPage
        project={project}
        isStudioInternal={false}
        printMode={query.print === "1"}
        previewMode={query.preview === "1"}
        viewerId={typeof query.viewer === "string" ? query.viewer : undefined}
      />
    </Suspense>
  );
}
