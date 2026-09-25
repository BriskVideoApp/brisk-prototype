import { CanonicalProjectStageRoute } from "@/components/project/CanonicalProjectRoutes";

export default async function MastersRoute({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  return <CanonicalProjectStageRoute projectId={projectId} stage="masters" />;
}
