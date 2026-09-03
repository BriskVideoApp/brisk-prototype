import { ClientPortalScreen } from "@/components/client-portal/ClientPortalScreen";

export default async function ScopedClientPortalRoute({
  params,
  searchParams,
}: {
  params: Promise<{ workspaceId: string; clientId: string }>;
  searchParams: Promise<{ "studio-preview"?: string }>;
}) {
  const [{ workspaceId, clientId }, query] = await Promise.all([params, searchParams]);
  return <ClientPortalScreen workspaceId={workspaceId} clientId={clientId} studioPreview={query["studio-preview"] === "1"} />;
}
