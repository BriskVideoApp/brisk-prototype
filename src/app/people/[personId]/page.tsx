import { Suspense } from "react";
import { PersonProfilePage } from "@/components/people/PersonProfilePage";
import { StudioWorkspacePageFrame } from "@/components/settings/StudioSettingsShell";

export default async function PersonProfileRoute({ params }: { params: Promise<{ personId: string }> }) {
  const { personId } = await params;
  return <StudioWorkspacePageFrame section="people"><Suspense fallback={null}><PersonProfilePage personId={personId} /></Suspense></StudioWorkspacePageFrame>;
}
