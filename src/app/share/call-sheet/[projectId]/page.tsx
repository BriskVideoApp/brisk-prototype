import { Suspense } from "react";
import { notFound } from "next/navigation";
import { SharedCallSheetPage } from "@/components/shoot/SharedCallSheetPage";
import { activeVideoProjects } from "@/data/active-videos/mockData";

export function generateStaticParams() {
  return activeVideoProjects.map((project) => ({ projectId: project.id }));
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
  const project = activeVideoProjects.find((activeProject) => activeProject.id === projectId);

  if (!project) notFound();

  return (
    <Suspense fallback={null}>
      <SharedCallSheetPage
        project={project}
        printMode={query.print === "1"}
        previewMode={query.preview === "1"}
        viewerId={typeof query.viewer === "string" ? query.viewer : undefined}
      />
    </Suspense>
  );
}
