import { Suspense } from "react";
import { ClientsPage } from "@/components/clients/ClientsPage";
import { StudioWorkspacePageFrame } from "@/components/settings/StudioSettingsShell";

export default function ClientsRoute() {
  return <StudioWorkspacePageFrame section="clients"><Suspense fallback={null}><ClientsPage /></Suspense></StudioWorkspacePageFrame>;
}
