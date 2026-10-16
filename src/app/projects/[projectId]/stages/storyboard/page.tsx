import { CanonicalStoryboardRoute } from "@/components/project/CanonicalStoryboardRoute";

export default async function StoryboardRoute({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  return <CanonicalStoryboardRoute projectId={projectId} />;
}
