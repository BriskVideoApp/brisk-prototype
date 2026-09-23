"use client";

import { usePrototypeState } from "@/components/prototype-state/PrototypeStateContext";

export function useStudioCompanyName() {
  const { state } = usePrototypeState();
  return state.workspaces.find((workspace) => workspace.id === state.session.activeWorkspaceId)?.name ?? "Studio";
}
