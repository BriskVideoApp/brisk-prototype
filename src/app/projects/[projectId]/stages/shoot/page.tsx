import { CanonicalShootRoute } from "@/components/project/CanonicalShootRoute";

export default async function ShootRoute({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  return <CanonicalShootRoute projectId={projectId} />;
}
