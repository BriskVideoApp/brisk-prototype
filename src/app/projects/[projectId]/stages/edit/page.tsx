import { CanonicalEditRoute } from "@/components/project/CanonicalEditRoute";

export default async function EditRoute({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  return <CanonicalEditRoute projectId={projectId} />;
}
