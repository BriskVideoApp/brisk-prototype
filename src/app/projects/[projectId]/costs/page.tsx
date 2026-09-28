import { CanonicalProjectCostsRoute } from "@/components/project/CanonicalProjectRoutes";

export default async function ProjectCostsRoute({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  return <CanonicalProjectCostsRoute projectId={projectId} />;
}
