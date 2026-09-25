"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  canRoleSeeNavigationItem,
  getNavigationItem,
} from "@/components/navigation/navigationConfig";
import {
  prototypeRoleLabels,
  prototypeRoles,
  usePrototypeRole,
  type PrototypeRole,
} from "@/components/navigation/PrototypeRoleContext";
import { DsIcon } from "@/components/video-review/DsIcon";
import { usePrototypeState } from "@/components/prototype-state/PrototypeStateContext";
import { usePrototypeViewer } from "@/components/prototype-state/usePrototypeViewer";
import {
  getClientPortalDestination,
  getScopedRoleHome,
} from "@/components/navigation/prototypeNavigation";

export function RolePreviewControl({ compact = false }: { compact?: boolean }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const {
    selectedRole,
    setSelectedRole,
    allPages,
    setAllPages,
  } = usePrototypeRole();
  const { state } = usePrototypeState();
  const viewer = usePrototypeViewer();
  const projectIdFromPath = pathname.match(/^\/projects\/([^/]+)/u)?.[1] ?? null;
  const projectId = searchParams.get("project") ?? (projectIdFromPath ? decodeURIComponent(projectIdFromPath) : null);
  const contextualProject = projectId
    ? state.projects.find((project) => project.id === projectId && project.workspaceId === state.session.activeWorkspaceId)
    : null;
  const clientPortalDestination = getClientPortalDestination(state, viewer?.role === "Customer" ? viewer.clientId : undefined);
  const clientHome = state.users.find((user) => user.role === "Client" && user.clientId === "loom" && user.name === "Jess Taylor")
    ? `/workspaces/${encodeURIComponent(state.session.activeWorkspaceId)}/clients/loom/portal`
    : null;
  const currentItem = getNavigationItem(pathname, searchParams.toString());

  function selectRole(role: PrototypeRole) {
    setSelectedRole(role);

    const isClientsPermissionPreview = pathname === "/clients" || pathname.startsWith("/clients/");
    const keepsRolePreviewOnCurrentPage = isClientsPermissionPreview || pathname === "/prototype/production-flow";
    const destination = role === "Customer" ? clientHome : clientPortalDestination;
    if (role === "Customer" && pathname.startsWith("/projects/") && contextualProject?.clientId !== "loom") {
      router.push(getScopedRoleHome(role, destination));
    } else if (!keepsRolePreviewOnCurrentPage && currentItem && !canRoleSeeNavigationItem(currentItem, role, allPages)) {
      router.push(getScopedRoleHome(role, destination));
    }
  }

  function toggleAllPages() {
    const nextAllPages = !allPages;
    setAllPages(nextAllPages);

    if (!nextAllPages && currentItem && !canRoleSeeNavigationItem(currentItem, selectedRole, false)) {
      router.push(getScopedRoleHome(selectedRole, clientPortalDestination));
    }
  }

  if (compact) {
    return (
      <section className="role-preview-control is-compact" aria-label="Prototype view">
        <div className="role-preview-options" role="group" aria-label="View as role">
          {prototypeRoles.map((role) => (
            <button
              className={`label-xs-semibold ${selectedRole === role ? "is-active" : ""}`}
              type="button"
              aria-pressed={selectedRole === role}
              key={role}
              onClick={() => selectRole(role)}
            >
              {prototypeRoleLabels[role]}
            </button>
          ))}
        </div>
      </section>
    );
  }

  return (
    <section className="role-preview-control" aria-label="Prototype view">
      <div className="role-preview-options" role="group" aria-label="View as role">
        {prototypeRoles.map((role) => (
          <button
            className={`label-xs-semibold ${selectedRole === role ? "is-active" : ""}`}
            type="button"
            aria-pressed={selectedRole === role}
            key={role}
            onClick={() => selectRole(role)}
          >
            {prototypeRoleLabels[role]}
          </button>
        ))}
      </div>
      <button
        className={`role-preview-all-pages label-xs-semibold ${allPages ? "is-active" : ""}`}
        type="button"
        aria-pressed={allPages}
        onClick={toggleAllPages}
      >
        <span className="role-preview-checkbox" aria-hidden="true">
          {allPages ? <DsIcon name="check" size={12} /> : null}
        </span>
        All pages
      </button>
    </section>
  );
}
