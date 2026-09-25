import { Suspense } from "react";
import { ClientProfilePage } from "@/components/clients/ClientProfilePage";
import { StudioWorkspacePageFrame } from "@/components/settings/StudioSettingsShell";

export default async function ClientProfileRoute({ params }: { params: Promise<{ clientId: string }> }) {
  const { clientId } = await params;
  return <StudioWorkspacePageFrame section="clients"><Suspense fallback={null}><ClientProfilePage clientId={clientId} /></Suspense></StudioWorkspacePageFrame>;
}
