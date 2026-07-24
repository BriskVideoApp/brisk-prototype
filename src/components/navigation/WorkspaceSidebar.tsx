"use client";

import Link from "next/link";
import { useId, useState } from "react";
import { usePrototypeRole, type PrototypeRole } from "@/components/navigation/PrototypeRoleContext";
import { DsIcon } from "@/components/video-review/DsIcon";

type WorkspaceSidebarItem = "videos" | "today" | "chat";

type WorkspaceSidebarProps = {
  activeItem?: WorkspaceSidebarItem;
  className?: string;
};

const prototypeRoles: PrototypeRole[] = ["Studio Staff", "Studio Freelancer", "Customer"];

export function WorkspaceSidebar({
  activeItem,
  className = "",
}: WorkspaceSidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const { selectedRole, setSelectedRole } = usePrototypeRole();
  const navigationId = useId();
  const sidebarClassName = [
    "today-sidebar",
    "workspace-sidebar",
    className,
    isCollapsed ? "collapsed" : "",
  ].filter(Boolean).join(" ");

  return (
    <aside className={sidebarClassName} aria-label="Primary navigation">
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
      <nav id={navigationId} className="today-sidebar-nav" aria-label="Workspace">
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
          <DsIcon name="chat-circle" size={16} />
          <span className="workspace-sidebar-link-label">Chat</span>
        </Link>
      </nav>
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
    </aside>
  );
}
