import { ClientPortalScreen } from "@/components/client-portal/ClientPortalScreen";

export default async function ScopedClientPortalRoute({
  params,
}: {
  params: Promise<{ workspaceId: string; clientId: string }>;
}) {
  const { workspaceId, clientId } = await params;
  return <ClientPortalScreen workspaceId={workspaceId} clientId={clientId} />;
}
