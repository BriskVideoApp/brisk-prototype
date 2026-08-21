import { Suspense } from "react";
import { PlanBillingPage } from "@/components/settings/PlanBillingPage";
import { StudioSettingsShell } from "@/components/settings/StudioSettingsShell";

export default function PlanBillingRoute() {
  return (
    <StudioSettingsShell sectionId="plan-billing">
      <Suspense fallback={null}><PlanBillingPage embedded /></Suspense>
    </StudioSettingsShell>
  );
}
