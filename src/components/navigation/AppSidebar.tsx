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
  getRoleHome,
  getVisibleNavigationGroups,
  type NavigationItem,
} from "@/components/navigation/navigationConfig";
import { usePrototypeRole } from "@/components/navigation/PrototypeRoleContext";
import { RolePreviewControl } from "@/components/navigation/RolePreviewControl";
import { DsIcon, type DsIconName } from "@/components/video-review/DsIcon";
import { brandKitCustomers } from "@/data/brand-kits";
import { chatClients, chatProjects, chatUsers } from "@/data/chat";

type AppSidebarProps = {
  mobileOpen: boolean;
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
  onNavigate,
  onRequestClose,
}: AppSidebarProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentSearch = searchParams.toString();
  const currentItem = getNavigationItem(pathname, currentSearch);
  const { selectedRole, allPages } = usePrototypeRole();
  const navigationGroups = getVisibleNavigationGroups(selectedRole, allPages);
  const contextualProjectId = getContextualProjectId(pathname, searchParams.get("project"));
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isProjectPeopleOpen, setIsProjectPeopleOpen] = useState(false);
  const [accessProjectsById, setAccessProjectsById] = useState<Record<string, ChatProject>>({});
  const [recentPages, setRecentPages] = useState<RecentPage[]>([]);
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());
  const navigationId = useId();
  const historyMenuId = useId();
  const historyControlRef = useRef<HTMLDivElement>(null);
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
  const canSeeProjectSettings = allPages || selectedRole === "Studio Staff";

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

  return (
    <>
      <aside
        className={`app-sidebar ${isCollapsed ? "is-collapsed" : ""} ${mobileOpen ? "is-mobile-open" : ""}`}
        aria-label="Primary navigation"
      >
      <div className="app-sidebar-brand-row">
        <Link className="app-sidebar-brand" href={getRoleHome(selectedRole)} aria-label="Brisk home" onClick={onNavigate}>
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
        <div className="app-sidebar-history-controls" aria-label="Navigation history">
          <button type="button" aria-label="Go back" data-tooltip="Back" onClick={() => window.history.back()}>
            <DsIcon name="arrow-left" size={18} />
          </button>
          <button className="is-forward" type="button" aria-label="Go forward" data-tooltip="Forward" onClick={() => window.history.forward()}>
            <DsIcon name="arrow-left" size={18} />
          </button>
          <div className="app-sidebar-history-control" ref={historyControlRef}>
            <button
              type="button"
              aria-label="Show recent pages"
              aria-controls={historyMenuId}
              aria-expanded={isHistoryOpen}
              data-tooltip="Recent pages"
              onClick={() => setIsHistoryOpen((current) => !current)}
            >
              <DsIcon name="clock-clockwise" size={18} />
            </button>
            {isHistoryOpen ? (
              <section className="app-sidebar-history-menu" id={historyMenuId} aria-label="Recent pages">
                <p className="label-s-semibold">Recent</p>
                {visibleRecentPages.length > 0 ? visibleRecentPages.map((page) => (
                  <Link href={page.href} key={page.href} onClick={() => {
                    setIsHistoryOpen(false);
                    onNavigate();
                  }}>
                    <DsIcon name={page.icon} size={16} />
                    <span className="label-s-semibold">{page.label}</span>
                  </Link>
                )) : (
                  <span className="label-xs">No recent pages yet.</span>
                )}
              </section>
            ) : null}
          </div>
        </div>
        <button
          className="app-sidebar-collapse"
          type="button"
          aria-controls={navigationId}
          aria-expanded={!isCollapsed}
          aria-label={isCollapsed ? "Expand navigation" : "Collapse navigation"}
          data-tooltip={isCollapsed ? "Expand" : "Collapse"}
          onClick={() => setIsCollapsed((current) => !current)}
        >
          <DsIcon name={isCollapsed ? "caret-right" : "caret-left"} size={18} />
        </button>
      </div>

      <div className="app-sidebar-role-preview">
        <RolePreviewControl />
      </div>

      <nav className="app-sidebar-navigation" id={navigationId} aria-label="Brisk product">
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
              {canSeeProjectSettings ? (
                <SidebarLink
                  active={pathname === `/projects/${contextualProjectId}`}
                  collapsed={isCollapsed}
                  item={{
                    id: `project-settings-${contextualProjectId}`,
                    label: "Settings",
                    href: `/projects/${contextualProjectId}`,
                    icon: "settings",
                    roles: [],
                  }}
                  onNavigate={onNavigate}
                />
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
                      item={item}
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
  item,
  onNavigate,
}: {
  active: boolean;
  collapsed: boolean;
  item: NavigationItem;
  onNavigate: () => void;
}) {
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
  if (item.id === "client-brand-kit" && pathname.startsWith("/brand-kits/loom")) return true;
  if (item.id === "studio-settings" && (
    pathname.startsWith("/settings/studio")
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
