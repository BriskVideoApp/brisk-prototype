"use client";

import { useState } from "react";
import { ChatUnreadControl } from "@/components/chat/ChatUnreadControl";
import { DsIcon } from "@/components/video-review/DsIcon";
import type { DsIconName } from "@/components/video-review/DsIcon";
import type { ChatClient, ChatClientStatus, ChatProject } from "@/components/chat/types";
import type { PrototypeRole } from "@/components/navigation/PrototypeRoleContext";

export type ChatRailView = "projects" | "dms" | "mentions" | "groups" | "threads" | "calls";
export type ChatCustomerFilter = ChatClientStatus | "All";
export type ChatRailReadTarget =
  | { type: "all" }
  | { type: "client"; clientName: string }
  | { type: "project"; projectId: string };

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
  onMarkRead: (target: ChatRailReadTarget) => void;
  onGlobalMarkRead: (view: Exclude<ChatRailView, "projects">) => void;
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
  onMarkRead,
  onGlobalMarkRead,
  onSearchOpen,
}: ChatRailProps) {
  const [isFilterMenuOpen, setIsFilterMenuOpen] = useState(false);
  const [globalUnreadCounts, setGlobalUnreadCounts] = useState<Record<string, number>>(
    () => Object.fromEntries(globalItems.map((item) => [item.id, item.count])),
  );
  const showClients = role === "Studio Staff";
  const clientStatusByName = new Map(clients.map((client) => [client.name, client.status]));
  const lifecycleProjects = showClients && customerFilter !== "All"
    ? projects.filter((project) => clientStatusByName.get(project.clientName) === customerFilter)
    : projects;
  const visibleProjects = !showClients && showUnreadOnly
    ? lifecycleProjects.filter((project) => project.externalUnread + project.internalUnread > 0)
    : lifecycleProjects;
  const visibleGlobalItems = role === "Customer"
    ? globalItems.filter((item) => item.id !== "calls")
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
            {visibleGlobalItems.map((item) => {
              const unreadCount = globalUnreadCounts[item.id] ?? 0;

              return (
                <div className="chat-rail-global-row" key={item.id}>
                  <button
                    className={`chat-rail-global-item label-s-semibold ${activeView === item.id ? "active" : ""}`}
                    type="button"
                    aria-pressed={activeView === item.id}
                    onClick={() => onViewSelect(item.id)}
                  >
                    <span className="chat-rail-global-item-copy">
                      <DsIcon name={item.icon} size={16} />
                      <span>{item.label}</span>
                    </span>
                  </button>
                  <ChatUnreadControl
                    count={unreadCount}
                    ariaLabel={`Mark ${unreadCount} unread ${item.label.toLowerCase()} as read`}
                    onMarkRead={() => {
                      setGlobalUnreadCounts((current) => ({ ...current, [item.id]: 0 }));
                      onGlobalMarkRead(item.id);
                    }}
                  />
                </div>
              );
            })}
          </nav>

          <div className="chat-rail-divider" />
        </>
      ) : null}

      <div
        className="chat-rail-projects"
        aria-label={showClients ? "Client conversations" : "Project conversations"}
      >
        <div className="chat-project-pill-row">
          <button
            className={`chat-project-pill all-projects label-s-semibold ${
              activeView === "projects" && activeProjectId === null && activeClientName === null
                ? "active"
                : ""
            }`}
            type="button"
            onClick={() => onProjectSelect(null)}
          >
            <DsIcon name="folder-open" size={16} />
            <span>All projects</span>
          </button>
          <ChatUnreadControl
            count={totalUnreadCount}
            ariaLabel={`Mark all ${totalUnreadCount} unread messages as read`}
            onMarkRead={() => onMarkRead({ type: "all" })}
          />
        </div>

        <div className="chat-project-list-divider" aria-hidden="true" />

        {showClients
          ? visibleClients.map((client) => {
              const isActive = activeView === "projects" && activeClientName === client.name;

              return (
                <div className="chat-project-pill-row" key={client.name}>
                  <button
                    className={`chat-project-pill chat-client-pill label-s-semibold ${isActive ? "active" : ""}`}
                    type="button"
                    title={`${client.name} - ${client.projectCount} ${client.projectCount === 1 ? "project" : "projects"}`}
                    aria-pressed={isActive}
                    onClick={() => onClientSelect(client.name)}
                  >
                    <span className="chat-project-pill-name">{client.name}</span>
                  </button>
                  <ChatUnreadControl
                    count={client.unreadCount + (companyUnreadCounts[client.name] ?? 0)}
                    ariaLabel={`Mark ${client.unreadCount + (companyUnreadCounts[client.name] ?? 0)} unread messages from ${client.name} as read`}
                    onMarkRead={() => onMarkRead({ type: "client", clientName: client.name })}
                  />
                </div>
              );
            })
          : visibleProjects.map((project) => {
              const unreadCount = project.externalUnread + project.internalUnread;
              const isActive = activeView === "projects" && activeProjectId === project.id;

              return (
                <div className="chat-project-pill-row" key={project.id}>
                  <button
                    className={`chat-project-pill label-s-semibold ${isActive ? "active" : ""}`}
                    type="button"
                    title={`${project.code} ${project.title}`}
                    aria-pressed={isActive}
                    onClick={() => onProjectSelect(project.id)}
                  >
                    <span className="chat-project-pill-code">{project.code}</span>
                    <span className="chat-project-pill-name">{project.clientName}</span>
                  </button>
                  <ChatUnreadControl
                    count={unreadCount}
                    ariaLabel={`Mark ${unreadCount} unread messages in ${project.code} as read`}
                    onMarkRead={() => onMarkRead({ type: "project", projectId: project.id })}
                  />
                </div>
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
