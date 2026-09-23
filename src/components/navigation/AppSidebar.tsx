"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import { ProjectMemberSettings } from "@/components/chat/ChatOverlays";
import type { ChatProject } from "@/components/chat/types";
import {
  canRoleSeeNavigationItem,
  getNavigationItem,
  getVisibleNavigationGroups,
  type NavigationItem,
} from "@/components/navigation/navigationConfig";
import { usePrototypeRole } from "@/components/navigation/PrototypeRoleContext";
import { usePeople } from "@/components/people/PeopleDataContext";
import { DsIcon, type DsIconName } from "@/components/video-review/DsIcon";
import { brandKitCustomers } from "@/data/brand-kits";
import { chatClients, chatProjects, chatUsers } from "@/data/chat";
import { hasStudioAdministrationAccess, prototypeStudioPersonId } from "@/data/people";
import { usePrototypeScenario } from "@/components/prototype-scenarios/PrototypeScenarioContext";
import { usePrototypeState } from "@/components/prototype-state/PrototypeStateContext";
import {
  getClientPortalDestination,
  getScopedRoleHome,
  shouldHideLegacyCurrentVideo,
} from "@/components/navigation/prototypeNavigation";

type AppSidebarProps = {
  mobileOpen: boolean;
  onBack?: () => void;
  onNavigate: () => void;
  onRequestClose: () => void;
};

type RecentPage = {
  href: string;
  label: string;
  icon: DsIconName;
};

const recentPagesStorageKey = "brisk-recent-pages-v2";

export function AppSidebar({
  mobileOpen,
  onBack,
  onNavigate,
  onRequestClose,
}: AppSidebarProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentSearch = searchParams.toString();
  const currentItem = getNavigationItem(pathname, currentSearch);
  const { selectedRole, allPages } = usePrototypeRole();
  const { activeScenario } = usePrototypeScenario();
  const { state } = usePrototypeState();
  const clientPortalDestination = getClientPortalDestination(state);
  const { people } = usePeople();
  const currentStudioMember = people.find((person) => person.id === prototypeStudioPersonId) ?? null;
  const canManageStudioSettings = hasStudioAdministrationAccess(currentStudioMember);
  const contextualProjectId = getContextualProjectId(pathname, searchParams.get("project"));
  const hideLegacyCurrentVideo = shouldHideLegacyCurrentVideo(
    pathname,
    activeScenario?.state ?? null,
    contextualProjectId,
  );
  const navigationGroups = getVisibleNavigationGroups(selectedRole, allPages)
    .filter((group) => !hideLegacyCurrentVideo || group.id !== "current-video")
    .filter((group) => group.id !== "studio-settings" || allPages || canManageStudioSettings)
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => allPages || canManageStudioSettings || !["people", "outstanding-invoices"].includes(item.id)),
    }))
    .filter((group) => group.items.length > 0);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isProjectPeopleOpen, setIsProjectPeopleOpen] = useState(false);
  const [accessProjectsById, setAccessProjectsById] = useState<Record<string, ChatProject>>({});
  const [recentPages, setRecentPages] = useState<RecentPage[]>([]);
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());
  const historyMenuId = useId();
  const historyControlRef = useRef<HTMLDivElement>(null);
  const historyPressTimerRef = useRef<number | null>(null);
  const historyOpenedByPressRef = useRef(false);
  const currentHref = currentSearch ? `${pathname}?${currentSearch}` : pathname;
  const accessProject = contextualProjectId
    ? accessProjectsById[contextualProjectId]
      ?? chatProjects.find((project) => project.id === contextualProjectId)
      ?? null
    : null;
  const accessClient = accessProject
    ? chatClients.find((client) => client.name === accessProject.clientName) ?? null
    : null;
  const companyUsers = accessClient
    ? chatUsers.filter((user) => accessClient.userIds.includes(user.id))
    : [];
  const projectBrandKit = accessProject
    ? brandKitCustomers.find((customer) => customer.name === accessProject.clientName) ?? null
    : null;
  const canSeeProjectFiles = allPages || selectedRole !== "Customer";

  useEffect(() => {
    if (!currentItem) return;

    const storedPages = readRecentPages();
    const currentPage: RecentPage = {
      href: currentHref,
      label: currentItem.label,
      icon: currentItem.icon,
    };
    const nextPages = [
      currentPage,
      ...storedPages.filter((page) => page.href !== currentHref),
    ].slice(0, 8);

    window.localStorage.setItem(recentPagesStorageKey, JSON.stringify(nextPages));
    setRecentPages(nextPages);
  }, [currentHref, currentItem]);

  useEffect(() => {
    if (!isHistoryOpen) return;

    const closeHistory = (event: MouseEvent) => {
      if (!historyControlRef.current?.contains(event.target as Node)) {
        setIsHistoryOpen(false);
      }
    };
    const closeHistoryWithEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsHistoryOpen(false);
    };

    document.addEventListener("mousedown", closeHistory);
    document.addEventListener("keydown", closeHistoryWithEscape);
    return () => {
      document.removeEventListener("mousedown", closeHistory);
      document.removeEventListener("keydown", closeHistoryWithEscape);
    };
  }, [isHistoryOpen]);

  useEffect(() => () => {
    if (historyPressTimerRef.current) window.clearTimeout(historyPressTimerRef.current);
  }, []);

  useEffect(() => {
    setIsProjectPeopleOpen(false);
  }, [contextualProjectId]);

  const visibleRecentPages = recentPages.filter((page) => {
    if (page.href === currentHref) return false;
    const [recentPathname, recentSearch = ""] = page.href.split("?");
    const item = getNavigationItem(recentPathname, recentSearch);
    if (!item) return false;
    return canRoleSeeNavigationItem(item, selectedRole, allPages);
  });

  const clearHistoryPress = () => {
    if (historyPressTimerRef.current) {
      window.clearTimeout(historyPressTimerRef.current);
      historyPressTimerRef.current = null;
    }
  };

  const beginHistoryPress = () => {
    clearHistoryPress();
    historyOpenedByPressRef.current = false;
    historyPressTimerRef.current = window.setTimeout(() => {
      historyOpenedByPressRef.current = true;
      setIsHistoryOpen(true);
    }, 500);
  };

  const goBack = () => {
    if (historyOpenedByPressRef.current) {
      historyOpenedByPressRef.current = false;
      return;
    }
    if (onBack) {
      onBack();
      onNavigate();
      return;
    }
    window.history.back();
  };

  return (
    <>
      <aside
        className={`app-sidebar ${isCollapsed ? "is-collapsed" : ""} ${mobileOpen ? "is-mobile-open" : ""}`}
        aria-label="Primary navigation"
      >
      <div className="app-sidebar-brand-row">
        <Link className="app-sidebar-brand" href={getScopedRoleHome(selectedRole, clientPortalDestination)} aria-label="Brisk home" onClick={onNavigate}>
          <Image src="/assets/logos/brisk.svg" alt="" width={24} height={16} priority />
          <span className="app-sidebar-copy label-m-semibold">Brisk</span>
        </Link>
        <button
          className="app-sidebar-mobile-close"
          type="button"
          aria-label="Close navigation"
          onClick={onRequestClose}
        >
          <DsIcon name="x-close-cross" size={18} />
        </button>
      </div>

      <div className="app-sidebar-history-row">
        <button
          className="app-sidebar-collapse"
          type="button"
          aria-controls="brisk-primary-navigation"
          aria-expanded={!isCollapsed}
          aria-label={isCollapsed ? "Expand navigation" : "Collapse navigation"}
          data-tooltip={isCollapsed ? "Expand" : "Collapse"}
          onClick={() => setIsCollapsed((current) => !current)}
        >
          <DsIcon name={isCollapsed ? "caret-right" : "caret-left"} size={18} />
        </button>
      </div>

      <nav className="app-sidebar-navigation" id="brisk-primary-navigation" aria-label="Brisk product">
        {contextualProjectId ? (
          <section className="app-sidebar-group app-sidebar-project-tools">
            <div className="app-sidebar-group-heading">
              <span className="app-sidebar-copy label-xs-semibold">Project tools</span>
            </div>
            <div className="app-sidebar-links">
              {canSeeProjectFiles ? (
                <SidebarLink
                  active={pathname === `/projects/${contextualProjectId}/files`}
                  collapsed={isCollapsed}
                  item={{
                    id: `project-files-${contextualProjectId}`,
                    label: "Files",
                    href: `/projects/${contextualProjectId}/files`,
                    icon: "folder",
                    roles: [],
                  }}
                  onNavigate={onNavigate}
                />
              ) : null}
              <SidebarLink
                active={pathname === "/chat" && searchParams.get("project") === contextualProjectId}
                collapsed={isCollapsed}
                item={{
                  id: `project-chat-${contextualProjectId}`,
                  label: "Project chat",
                  href: `/chat?project=${encodeURIComponent(contextualProjectId)}`,
                  icon: "chats",
                  roles: [],
                }}
                onNavigate={onNavigate}
              />
              {accessProject ? (
                <button
                  className={`app-sidebar-link label-s-semibold ${isProjectPeopleOpen ? "is-active" : ""}`}
                  type="button"
                  aria-haspopup="dialog"
                  aria-expanded={isProjectPeopleOpen}
                  title={isCollapsed ? "Project people" : undefined}
                  onClick={() => setIsProjectPeopleOpen(true)}
                >
                  <DsIcon name="users-three" size={16} />
                  <span className="app-sidebar-copy">Project people</span>
                </button>
              ) : null}
              {projectBrandKit ? (
                <SidebarLink
                  active={pathname === `/brand-kits/${projectBrandKit.slug}`}
                  collapsed={isCollapsed}
                  item={{
                    id: `project-brand-kit-${contextualProjectId}`,
                    label: `${projectBrandKit.name}'s Brand Kit`,
                    href: `/brand-kits/${projectBrandKit.slug}`,
                    icon: "sparkle",
                    roles: [],
                  }}
                  onNavigate={onNavigate}
                />
              ) : null}
            </div>
          </section>
        ) : null}
        {navigationGroups.map((group) => {
          const isGroupCollapsed = collapsedGroups.has(group.id);

          return (
            <section className="app-sidebar-group" key={group.id}>
              <div className="app-sidebar-group-heading">
                <span className="app-sidebar-copy label-xs-semibold">{group.label}</span>
                {group.collapsible ? (
                  <button
                    className="app-sidebar-group-toggle"
                    type="button"
                    aria-label={`${isGroupCollapsed ? "Expand" : "Collapse"} ${group.label}`}
                    aria-expanded={!isGroupCollapsed}
                    onClick={() => setCollapsedGroups((current) => {
                      const next = new Set(current);
                      if (next.has(group.id)) next.delete(group.id);
                      else next.add(group.id);
                      return next;
                    })}
                  >
                    <DsIcon name={isGroupCollapsed ? "caret-right" : "caret-down"} size={14} />
                  </button>
                ) : null}
              </div>
              {!isGroupCollapsed || isCollapsed ? (
                <div className="app-sidebar-links">
                  {group.items.map((item) => (
                    <SidebarLink
                      active={isNavigationItemActive(item, currentItem, pathname)}
                      collapsed={isCollapsed}
                      disabled={item.id === "client-dashboard" && !clientPortalDestination}
                      disabledReason="Choose a Client scenario to open a Client portal."
                      item={item.id === "client-dashboard" && clientPortalDestination
                        ? { ...item, href: clientPortalDestination }
                        : item}
                      key={`${group.id}-${item.id}`}
                      onNavigate={onNavigate}
                    />
                  ))}
                </div>
              ) : null}
            </section>
          );
        })}
      </nav>

      {allPages ? (
        <div className="app-sidebar-review-note">
          <DsIcon name="eye" size={16} />
          <span className="app-sidebar-copy label-xs">Prototype review tool</span>
        </div>
      ) : null}
      </aside>
      {isProjectPeopleOpen && accessProject ? (
        <ProjectMemberSettings
          project={accessProject}
          users={chatUsers}
          companyUsers={companyUsers}
          canManage={selectedRole === "Studio Staff"}
          onClose={() => setIsProjectPeopleOpen(false)}
          onProjectChange={(project) => setAccessProjectsById((current) => ({
            ...current,
            [project.id]: project,
          }))}
        />
      ) : null}
    </>
  );
}

function SidebarLink({
  active,
  collapsed,
  disabled = false,
  disabledReason,
  item,
  onNavigate,
}: {
  active: boolean;
  collapsed: boolean;
  disabled?: boolean;
  disabledReason?: string;
  item: NavigationItem;
  onNavigate: () => void;
}) {
  if (disabled) {
    return (
      <button
        className="app-sidebar-link label-s-semibold is-disabled"
        type="button"
        disabled
        title={disabledReason ?? item.label}
      >
        <DsIcon name={item.icon} size={16} />
        <span className="app-sidebar-copy">{item.label}</span>
      </button>
    );
  }

  return (
    <Link
      className={`app-sidebar-link label-s-semibold ${active ? "is-active" : ""}`}
      href={item.href}
      target={item.external ? "_blank" : undefined}
      rel={item.external ? "noreferrer" : undefined}
      title={collapsed ? item.label : undefined}
      onClick={onNavigate}
    >
      <DsIcon name={item.icon} size={16} />
      <span className="app-sidebar-copy">{item.label}</span>
      {item.external ? (
        <DsIcon name="arrow-bend-up-right" size={14} />
      ) : null}
    </Link>
  );
}

function isNavigationItemActive(
  item: NavigationItem,
  currentItem: NavigationItem | null,
  pathname: string,
) {
  if (currentItem?.id === item.id) return true;
  if (item.id === "brand-kits" && pathname.startsWith("/brand-kits/")) return true;
  if (item.id === "clients" && pathname.startsWith("/clients/")) return true;
  if (item.id === "people" && pathname.startsWith("/people/")) return true;
  if (item.id === "client-dashboard" && /^\/workspaces\/[^/]+\/clients\/[^/]+\/portal$/u.test(pathname)) return true;
  if (item.id === "client-brand-kit" && pathname.startsWith("/brand-kits/loom")) return true;
  if (item.id === "studio-settings" && (
    pathname.startsWith("/settings/studio")
    || pathname.startsWith("/settings/notifications")
    || pathname === "/settings/plan-billing"
    || pathname === "/settings/client-billing"
  )) return true;
  return false;
}

function readRecentPages(): RecentPage[] {
  try {
    const storedPages = window.localStorage.getItem(recentPagesStorageKey);
    return storedPages ? JSON.parse(storedPages) as RecentPage[] : [];
  } catch {
    return [];
  }
}

function getContextualProjectId(pathname: string, chatProjectId: string | null) {
  const projectPathMatch = pathname.match(/^\/projects\/([^/]+)/u);

  if (projectPathMatch?.[1]) return projectPathMatch[1];
  if (pathname === "/chat") return chatProjectId;

  return null;
}
