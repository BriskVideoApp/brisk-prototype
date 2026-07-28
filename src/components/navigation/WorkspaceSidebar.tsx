"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import { usePrototypeRole, type PrototypeRole } from "@/components/navigation/PrototypeRoleContext";
import { DsIcon } from "@/components/video-review/DsIcon";
import type { DsIconName } from "@/components/video-review/DsIcon";

type WorkspaceSidebarItem = "dashboard" | "videos" | "today" | "chat";

type WorkspaceSidebarProps = {
  activeItem?: WorkspaceSidebarItem;
  className?: string;
};

const prototypeRoles: PrototypeRole[] = ["Studio Staff", "Studio Freelancer", "Customer"];
const recentPagesStorageKey = "brisk-recent-pages";

type RecentPage = {
  href: string;
  label: string;
};

export function WorkspaceSidebar({
  activeItem,
  className = "",
}: WorkspaceSidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [recentPages, setRecentPages] = useState<RecentPage[]>([]);
  const { selectedRole } = usePrototypeRole();
  const pathname = usePathname();
  const navigationId = useId();
  const historyMenuId = useId();
  const historyControlRef = useRef<HTMLDivElement>(null);
  const sidebarClassName = [
    "today-sidebar",
    "workspace-sidebar",
    className,
    isCollapsed ? "collapsed" : "",
  ].filter(Boolean).join(" ");

  useEffect(() => {
    const storedPages = readRecentPages();
    const currentPage = { href: pathname, label: getPageLabel(pathname, activeItem) };
    const nextPages = [
      currentPage,
      ...storedPages.filter((page) => page.href !== pathname),
    ].slice(0, 8);

    window.localStorage.setItem(recentPagesStorageKey, JSON.stringify(nextPages));
    setRecentPages(nextPages);
  }, [activeItem, pathname]);

  useEffect(() => {
    if (!isHistoryOpen) {
      return;
    }

    const closeHistory = (event: MouseEvent) => {
      if (!historyControlRef.current?.contains(event.target as Node)) {
        setIsHistoryOpen(false);
      }
    };
    const closeHistoryWithEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsHistoryOpen(false);
      }
    };

    document.addEventListener("mousedown", closeHistory);
    document.addEventListener("keydown", closeHistoryWithEscape);
    return () => {
      document.removeEventListener("mousedown", closeHistory);
      document.removeEventListener("keydown", closeHistoryWithEscape);
    };
  }, [isHistoryOpen]);

  return (
    <aside className={sidebarClassName} aria-label="Primary navigation">
      <div className="workspace-sidebar-header">
        <div className="workspace-history-controls" aria-label="Navigation history">
          <button type="button" aria-label="Go back" title="Back" onClick={() => window.history.back()}>
            <DsIcon name="arrow-left" size={18} />
          </button>
          <button
            className="workspace-history-forward"
            type="button"
            aria-label="Go forward"
            title="Forward"
            onClick={() => window.history.forward()}
          >
            <DsIcon name="arrow-left" size={18} />
          </button>
          <div className="workspace-history-control" ref={historyControlRef}>
            <button
              type="button"
              aria-label="Show history"
              aria-controls={historyMenuId}
              aria-expanded={isHistoryOpen}
              title="History"
              onClick={() => setIsHistoryOpen((current) => !current)}
            >
              <DsIcon name="clock-clockwise" size={18} />
            </button>
            {isHistoryOpen ? (
              <section id={historyMenuId} className="workspace-history-menu" aria-label="Recent pages">
                <p className="label-s-semibold">Recent</p>
                <div className="workspace-history-list">
                  {recentPages.length > 1 ? recentPages.slice(1).map((page) => (
                    <Link
                      className="label-s-semibold"
                      href={page.href}
                      key={page.href}
                      onClick={() => setIsHistoryOpen(false)}
                    >
                      <DsIcon name={getPageIcon(page.href)} size={16} />
                      <span>{page.label}</span>
                    </Link>
                  )) : (
                    <span className="workspace-history-empty label-xs">No recent pages yet.</span>
                  )}
                </div>
              </section>
            ) : null}
          </div>
        </div>
        <button
          className="workspace-sidebar-toggle"
          type="button"
          aria-controls={navigationId}
          aria-expanded={!isCollapsed}
          aria-label={isCollapsed ? "Expand navigation" : "Collapse navigation"}
          onClick={() => setIsCollapsed((current) => !current)}
        >
          <DsIcon name={isCollapsed ? "caret-right" : "caret-left"} size={18} />
        </button>
      </div>
      <nav id={navigationId} className="today-sidebar-nav" aria-label="Workspace">
        <Link
          className={`today-sidebar-link label-s-semibold ${activeItem === "dashboard" ? "active" : ""}`}
          href="/customer-dashboard"
          title={isCollapsed ? "Dashboard" : undefined}
        >
          <DsIcon name="grid-four" size={16} />
          <span className="workspace-sidebar-link-label">Dashboard</span>
        </Link>
        <Link
          className={`today-sidebar-link label-s-semibold ${activeItem === "videos" ? "active" : ""}`}
          href="/active-videos"
          title={isCollapsed ? "Videos" : undefined}
        >
          <DsIcon name="queue" size={16} />
          <span className="workspace-sidebar-link-label">Videos</span>
        </Link>
        {selectedRole === "Studio Staff" ? (
          <Link
            className={`today-sidebar-link label-s-semibold ${activeItem === "today" ? "active" : ""}`}
            href="/today"
            title={isCollapsed ? "Today" : undefined}
          >
            <DsIcon name="check-circle" size={16} />
            <span className="workspace-sidebar-link-label">Today</span>
          </Link>
        ) : null}
        <Link
          className={`today-sidebar-link label-s-semibold ${activeItem === "chat" ? "active" : ""}`}
          href="/chat"
          title={isCollapsed ? "Chat" : undefined}
        >
          <DsIcon name="chats" size={16} />
          <span className="workspace-sidebar-link-label">Chat</span>
        </Link>
      </nav>
      <PrototypeRoleSwitcher />
    </aside>
  );
}

function PrototypeRoleSwitcher() {
  const { selectedRole, setSelectedRole } = usePrototypeRole();

  return (
    <section className="workspace-role-control" aria-label="Prototype role">
      <p className="label-xs-semibold">Prototype view</p>
      <div className="workspace-role-options" role="group" aria-label="View pages as role">
        {prototypeRoles.map((role) => (
          <button
            className={`label-xs-semibold ${selectedRole === role ? "active" : ""}`}
            type="button"
            key={role}
            aria-pressed={selectedRole === role}
            onClick={() => setSelectedRole(role)}
          >
            {role}
          </button>
        ))}
      </div>
    </section>
  );
}

function readRecentPages(): RecentPage[] {
  try {
    const storedPages = window.localStorage.getItem(recentPagesStorageKey);
    return storedPages ? JSON.parse(storedPages) as RecentPage[] : [];
  } catch {
    return [];
  }
}

function getPageLabel(pathname: string, activeItem?: WorkspaceSidebarItem) {
  if (activeItem === "dashboard" || pathname === "/customer-dashboard") {
    return "Dashboard";
  }
  if (activeItem === "videos" || pathname === "/active-videos") {
    return "Videos";
  }
  if (activeItem === "today" || pathname === "/" || pathname === "/today") {
    return "Today";
  }
  if (activeItem === "chat" || pathname === "/chat") {
    return "Chat";
  }

  const projectMatch = pathname.match(/^\/projects\/([^/]+)\/([^/]+)/);
  if (projectMatch) {
    const projectName = titleCase(projectMatch[1]);
    const stageName = titleCase(projectMatch[2]);
    return `${projectName} - ${stageName}`;
  }

  return titleCase(pathname.split("/").filter(Boolean).at(-1) ?? "Brisk");
}

function getPageIcon(pathname: string): DsIconName {
  if (pathname === "/customer-dashboard") {
    return "grid-four";
  }
  if (pathname === "/active-videos") {
    return "queue";
  }
  if (pathname === "/" || pathname === "/today") {
    return "check-circle";
  }
  if (pathname === "/chat") {
    return "chats";
  }
  return "folder-open";
}

function titleCase(value: string) {
  return value
    .split("-")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}
