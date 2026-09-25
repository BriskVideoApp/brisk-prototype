import { Suspense } from "react";
import { PeoplePage } from "@/components/people/PeoplePage";
import { StudioWorkspacePageFrame } from "@/components/settings/StudioSettingsShell";

export default function PeopleRoute() {
  return <StudioWorkspacePageFrame section="people"><Suspense fallback={null}><PeoplePage /></Suspense></StudioWorkspacePageFrame>;
}
