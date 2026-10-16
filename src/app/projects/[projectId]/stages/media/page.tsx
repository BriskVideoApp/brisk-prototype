import { CanonicalMediaRoute } from "@/components/project/CanonicalMediaRoute";

export default async function MediaRoute({ params, searchParams }: { params: Promise<{ projectId: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const [{ projectId }, query] = await Promise.all([params, searchParams]);
  return <CanonicalMediaRoute projectId={projectId} query={query} />;
}
