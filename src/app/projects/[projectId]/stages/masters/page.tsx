import { CanonicalMastersRoute } from "@/components/project/CanonicalMastersRoute";

export default async function MastersRoute({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  return <CanonicalMastersRoute projectId={projectId} />;
}
