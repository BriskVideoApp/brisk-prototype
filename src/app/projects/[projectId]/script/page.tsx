import { CanonicalProjectStageRoute } from "@/components/project/CanonicalProjectRoutes";

type ScriptRouteProps = {
  params: Promise<{ projectId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function ScriptRoute({ params, searchParams }: ScriptRouteProps) {
  const [{ projectId }, query] = await Promise.all([params, searchParams]);
  return <CanonicalProjectStageRoute projectId={projectId} stage="script" query={query} />;
}
