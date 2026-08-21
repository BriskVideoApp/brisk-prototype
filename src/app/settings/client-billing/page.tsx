import { Suspense } from "react";
import { ClientBillingPage } from "@/components/settings/ClientBillingPage";
import { StudioSettingsShell } from "@/components/settings/StudioSettingsShell";

export default function ClientBillingRoute() {
  return (
    <StudioSettingsShell sectionId="client-billing">
      <Suspense fallback={null}><ClientBillingPage embedded /></Suspense>
    </StudioSettingsShell>
  );
}
