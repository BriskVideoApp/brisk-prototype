import { Suspense } from "react";
import { SharedCallSheetRouteContent } from "@/components/shoot/SharedCallSheetRouteContent";

export default async function SharedCallSheetRoute({
  params,
  searchParams,
}: {
  params: Promise<{ projectId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { projectId } = await params;
  const query = await searchParams;
  return (
    <Suspense fallback={null}>
      <SharedCallSheetRouteContent
        projectId={projectId}
        printMode={query.print === "1"}
        previewMode={query.preview === "1"}
        viewerId={typeof query.viewer === "string" ? query.viewer : undefined}
      />
    </Suspense>
  );
}
