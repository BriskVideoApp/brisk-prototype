import type { PrototypeRole } from "@/components/navigation/PrototypeRoleContext";
import {
  selectScopedClient,
  type PrototypeState,
} from "@/data/prototype-state";

export type AppShellPresentation = "standalone" | "clean-entry" | "product";

const scopedClientPortalPattern = /^\/workspaces\/[^/]+\/clients\/[^/]+\/portal$/u;

export function getAppShellPresentation(
  pathname: string,
  testModeIsActive: boolean,
): AppShellPresentation {
  const isStandaloneDocument = pathname.startsWith("/print/")
    || pathname.startsWith("/share/call-sheet/");
  const isPrototypeControl = pathname === "/prototype/scenarios";

  if (isStandaloneDocument || isPrototypeControl) return "standalone";

  if (pathname === "/studio-onboard") return "clean-entry";

  const isEntryRoute = pathname === "/prototype/journey-entry";
  const isClientPortal = scopedClientPortalPattern.test(pathname)
    || pathname === "/customer-dashboard";

  if (!testModeIsActive && (isEntryRoute || isClientPortal)) return "clean-entry";

  return "product";
}

export function shouldHideLegacyCurrentVideo(
  pathname: string,
  scenarioState: "new" | "active" | "edge" | null,
  contextualProjectId: string | null,
) {
  const isEntryRoute = pathname === "/studio-onboard"
    || pathname === "/prototype/journey-entry";
  const isClientPortal = scopedClientPortalPattern.test(pathname)
    || pathname === "/customer-dashboard";

  return scenarioState === "new"
    || Boolean(contextualProjectId)
    || isEntryRoute
    || isClientPortal;
}

export function getClientPortalDestination(state: PrototypeState) {
  const workspaceId = state.session.activeWorkspaceId;
  const activeUser = state.users.find((user) => user.id === state.session.activeUserId);

  if (!activeUser || activeUser.workspaceId !== workspaceId) return null;

  if (activeUser.role === "Client") {
    const clientId = state.session.activeClientId;

    if (!clientId || activeUser.clientId !== clientId
      || !selectScopedClient(state, workspaceId, clientId)) return null;

    return `/workspaces/${encodeURIComponent(workspaceId)}/clients/${encodeURIComponent(clientId)}/portal`;
  }

  const clientId = state.onboarding.clientId;

  if (!clientId || !selectScopedClient(state, workspaceId, clientId)) return null;

  return `/workspaces/${encodeURIComponent(workspaceId)}/clients/${encodeURIComponent(clientId)}/portal?studio-preview=1`;
}

export function getScopedRoleHome(
  role: PrototypeRole,
  clientPortalDestination: string | null,
) {
  if (role === "Customer") return clientPortalDestination ?? "/prototype/scenarios";
  return "/today";
}
