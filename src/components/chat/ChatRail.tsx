"use client";

import { useState } from "react";
import { DsIcon } from "@/components/video-review/DsIcon";
import type { DsIconName } from "@/components/video-review/DsIcon";
import type { ChatClient, ChatClientStatus, ChatProject } from "@/components/chat/types";
import type { PrototypeRole } from "@/components/navigation/PrototypeRoleContext";

export type ChatRailView = "projects" | "dms" | "mentions" | "groups" | "threads" | "calls";
export type ChatCustomerFilter = ChatClientStatus | "All";

type ChatRailProps = {
  workspaceName: string;
  role: PrototypeRole;
  activeProjectId: string | null;
  activeClientName: string | null;
  activeView: ChatRailView;
  projects: ChatProject[];
  clients: ChatClient[];
  customerFilter: ChatCustomerFilter;
  showUnreadOnly: boolean;
  companyUnreadCounts?: Record<string, number>;
  onProjectSelect: (projectId: string | null) => void;
  onClientSelect: (clientName: string) => void;
  onViewSelect: (view: ChatRailView) => void;
  onCustomerFilterChange: (filter: ChatCustomerFilter) => void;
  onUnreadOnlyChange: (showUnreadOnly: boolean) => void;
  onSearchOpen: () => void;
};

const globalItems: Array<{
  id: Exclude<ChatRailView, "projects">;
  label: string;
  count: number;
  icon: DsIconName;
}> = [
  { id: "dms", label: "DMs", count: 2, icon: "chat-circle-text" },
  { id: "mentions", label: "Mentions", count: 4, icon: "at-mail" },
  { id: "groups", label: "Groups", count: 3, icon: "users-three" },
  { id: "threads", label: "Threads", count: 6, icon: "chat-centered-dots" },
  { id: "calls", label: "Calls", count: 0, icon: "headphones" },
];

export function ChatRail({
  workspaceName,
  role,
  activeProjectId,
  activeClientName,
  activeView,
  projects,
  clients,
  customerFilter,
  showUnreadOnly,
  companyUnreadCounts = {},
  onProjectSelect,
  onClientSelect,
  onViewSelect,
  onCustomerFilterChange,
  onUnreadOnlyChange,
  onSearchOpen,
}: ChatRailProps) {
  const [isFilterMenuOpen, setIsFilterMenuOpen] = useState(false);
  const showClients = role === "Studio Staff";
  const clientStatusByName = new Map(clients.map((client) => [client.name, client.status]));
  const lifecycleProjects = showClients && customerFilter !== "All"
    ? projects.filter((project) => clientStatusByName.get(project.clientName) === customerFilter)
    : projects;
  const visibleProjects = !showClients && showUnreadOnly
    ? lifecycleProjects.filter((project) => project.externalUnread + project.internalUnread > 0)
    : lifecycleProjects;
  const visibleGlobalItems = role === "Customer"
    ? globalItems.filter((item) => item.id === "mentions" || item.id === "threads")
    : globalItems;
  const showGlobalNavigation = visibleGlobalItems.length > 0;
  const allVisibleClients = Array.from(
    visibleProjects.reduce(
      (clients, project) => {
        const current = clients.get(project.clientName);
        const unreadCount = project.externalUnread + project.internalUnread;

        clients.set(project.clientName, {
          name: project.clientName,
          projectCount: (current?.projectCount ?? 0) + 1,
          unreadCount: (current?.unreadCount ?? 0) + unreadCount,
        });

        return clients;
      },
      new Map<string, { name: string; projectCount: number; unreadCount: number }>(),
    ).values(),
  );
  const visibleClients = showUnreadOnly
    ? allVisibleClients.filter(
        (client) => client.unreadCount + (companyUnreadCounts[client.name] ?? 0) > 0,
      )
    : allVisibleClients;
  const totalUnreadCount =
    visibleProjects.reduce(
      (total, project) => total + project.externalUnread + project.internalUnread,
      0,
    ) +
    (showClients
      ? visibleClients.reduce(
          (total, client) => total + (companyUnreadCounts[client.name] ?? 0),
          0,
        )
      : 0);
  const customerFilterLabel = customerFilter === "All" ? "All customers" : `${customerFilter} customers`;

  return (
    <aside className="chat-rail" aria-label="Chat navigation">
      <div className="chat-rail-top">
        <div className="chat-rail-brand">
          <span className="chat-rail-brand-mark">
            <DsIcon name="chat-circle" size={20} />
          </span>
          <span className="label-s-semibold">{workspaceName}</span>
        </div>
        <button
          className="chat-rail-search"
          type="button"
          aria-label="Search messages - Command K"
          onClick={onSearchOpen}
        >
          <DsIcon name="search" size={18} />
        </button>
      </div>

      {showGlobalNavigation ? (
        <>
          <nav className="chat-rail-global" aria-label="Global conversations">
            {visibleGlobalItems.map((item) => (
              <button
                className={`chat-rail-global-item label-s-semibold ${activeView === item.id ? "active" : ""}`}
                type="button"
                key={item.id}
                aria-pressed={activeView === item.id}
                onClick={() => onViewSelect(item.id)}
              >
                <span className="chat-rail-global-item-copy">
                  <DsIcon name={item.icon} size={16} />
                  <span>{item.label}</span>
                </span>
                {item.count > 0 ? <span className="chat-count-badge label-xs-semibold">{item.count}</span> : null}
              </button>
            ))}
          </nav>

          <div className="chat-rail-divider" />
        </>
      ) : null}

      <div
        className="chat-rail-projects"
        aria-label={showClients ? "Client conversations" : "Project conversations"}
      >
        <button
          className={`chat-project-pill all-projects label-s-semibold ${
            activeView === "projects" && activeProjectId === null && activeClientName === null
              ? "active"
              : ""
          }`}
          type="button"
          onClick={() => onProjectSelect(null)}
        >
          {totalUnreadCount > 0 ? (
            <span className="chat-unread-badge label-xs-semibold" aria-label={`${totalUnreadCount} unread`}>
              {totalUnreadCount}
            </span>
          ) : null}
          <DsIcon name="folder-open" size={16} />
          <span>All projects</span>
        </button>

        <div className="chat-project-list-divider" aria-hidden="true" />

        {showClients
          ? visibleClients.map((client) => {
              const isActive = activeView === "projects" && activeClientName === client.name;

              return (
                <button
                  className={`chat-project-pill chat-client-pill label-s-semibold ${isActive ? "active" : ""}`}
                  type="button"
                  key={client.name}
                  title={`${client.name} - ${client.projectCount} ${client.projectCount === 1 ? "project" : "projects"}`}
                  aria-pressed={isActive}
                  onClick={() => onClientSelect(client.name)}
                >
                  {client.unreadCount + (companyUnreadCounts[client.name] ?? 0) > 0 ? (
                    <span
                      className="chat-unread-badge label-xs-semibold"
                      aria-label={`${client.unreadCount + (companyUnreadCounts[client.name] ?? 0)} unread`}
                    >
                      {client.unreadCount + (companyUnreadCounts[client.name] ?? 0)}
                    </span>
                  ) : null}
                  <span className="chat-project-pill-name">{client.name}</span>
                </button>
              );
            })
          : visibleProjects.map((project) => {
              const unreadCount = project.externalUnread + project.internalUnread;
              const isActive = activeView === "projects" && activeProjectId === project.id;

              return (
                <button
                  className={`chat-project-pill label-s-semibold ${isActive ? "active" : ""}`}
                  type="button"
                  key={project.id}
                  title={`${project.code} ${project.title}`}
                  aria-pressed={isActive}
                  onClick={() => onProjectSelect(project.id)}
                >
                  {unreadCount > 0 ? (
                    <span className="chat-unread-badge label-xs-semibold" aria-label={`${unreadCount} unread`}>
                      {unreadCount}
                    </span>
                  ) : null}
                  <span className="chat-project-pill-code">{project.code}</span>
                  <span className="chat-project-pill-name">{project.clientName}</span>
                </button>
              );
            })}
      </div>

      {showClients ? (
        <div
          className="chat-customer-filters"
          onBlur={(event) => {
            const nextFocus = event.relatedTarget;

            if (!(nextFocus instanceof Node) || !event.currentTarget.contains(nextFocus)) {
              setIsFilterMenuOpen(false);
            }
          }}
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              setIsFilterMenuOpen(false);
            }
          }}
        >
          <button
            className="chat-customer-filter-trigger label-s-semibold"
            type="button"
            aria-haspopup="menu"
            aria-expanded={isFilterMenuOpen}
            onClick={() => setIsFilterMenuOpen((current) => !current)}
          >
            <span>{customerFilterLabel}</span>
            <DsIcon name="caret-down" size={14} />
          </button>
          {isFilterMenuOpen ? (
            <div className="chat-customer-filter-menu" role="menu" aria-label="Filter customers">
              {(["Active", "Inactive", "Archived", "All"] as ChatCustomerFilter[]).map((filter) => (
                <button
                  className={`label-s ${customerFilter === filter ? "selected" : ""}`}
                  type="button"
                  role="menuitemradio"
                  aria-checked={customerFilter === filter}
                  key={filter}
                  onClick={() => {
                    onCustomerFilterChange(filter);
                    setIsFilterMenuOpen(false);
                  }}
                >
                  <span>{filter === "All" ? "All customers" : `${filter} customers`}</span>
                  {customerFilter === filter ? <DsIcon name="check" size={15} /> : null}
                </button>
              ))}
            </div>
          ) : null}
          <button
            className={`chat-unread-filter label-xs-semibold ${showUnreadOnly ? "active" : ""}`}
            type="button"
            aria-pressed={showUnreadOnly}
            onClick={() => onUnreadOnlyChange(!showUnreadOnly)}
          >
            <DsIcon name={showUnreadOnly ? "check" : "envelope-simple"} size={15} />
            <span>{showUnreadOnly ? "Showing unread only" : "Unread only"}</span>
          </button>
        </div>
      ) : null}

    </aside>
  );
}
