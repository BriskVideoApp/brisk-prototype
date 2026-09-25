import { CanonicalProjectStageRoute } from "@/components/project/CanonicalProjectRoutes";

export default async function MediaRoute({ params, searchParams }: { params: Promise<{ projectId: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const [{ projectId }, query] = await Promise.all([params, searchParams]);
  return <CanonicalProjectStageRoute projectId={projectId} stage="media" query={query} />;
}
