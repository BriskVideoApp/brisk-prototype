import { CanonicalProjectBriefRoute } from "@/components/project/CanonicalProjectRoutes";

export default async function BriefRoute({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  return <CanonicalProjectBriefRoute projectId={projectId} />;
}
