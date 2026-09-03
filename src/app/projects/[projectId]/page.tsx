import { CanonicalProjectOverviewRoute } from "@/components/project/CanonicalProjectRoutes";

export default async function ProjectRoute({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  return <CanonicalProjectOverviewRoute projectId={projectId} />;
}
