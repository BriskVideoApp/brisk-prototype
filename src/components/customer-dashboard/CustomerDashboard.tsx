"use client";

import type { DragEvent as ReactDragEvent } from "react";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { StageProgress } from "@/components/active-videos/StageProgress";
import { CommentCountBadge } from "@/components/CommentCountBadge";
import { ChatPage } from "@/components/chat/ChatPage";
import { usePrototypeRole } from "@/components/navigation/PrototypeRoleContext";
import { WorkspaceSidebar } from "@/components/navigation/WorkspaceSidebar";
import { DsIcon } from "@/components/video-review/DsIcon";
import {
  customerDashboardActivity,
  customerDashboardFallbackThumbnailUrl,
  customerDashboardProjects,
  customerDashboardSeries,
  type CustomerDashboardProject,
  type CustomerDashboardSeries,
  type CustomerDashboardStatus,
} from "@/data/customer-dashboard";

type QueueTab = "Queued" | "Completed" | "Paused" | "Archived" | "All";
type QueueScope = "All videos" | "Series only" | "Standalone only";
type DragItem =
  | { kind: "top-level"; token: string }
  | { kind: "series-child"; token: string; projectId: string; seriesId: string }
  | { kind: "project"; token: string; projectId: string };
type QueueEntry =
  | {
      kind: "series";
      token: string;
      series: CustomerDashboardSeries;
      visibleChildren: CustomerDashboardProject[];
    }
  | {
      kind: "project";
      token: string;
      project: CustomerDashboardProject;
    };

type DashboardPreferences = {
  queueOrder: string[];
  seriesChildOrder: Record<string, string[]>;
  expandedSeriesIds: string[];
};

type DashboardSharedState = {
  statuses: Record<string, CustomerDashboardStatus>;
};

const queueTabs: QueueTab[] = ["Queued", "Completed", "Paused", "Archived", "All"];
const queueScopes: QueueScope[] = ["All videos", "Series only", "Standalone only"];
const projectStatuses: CustomerDashboardStatus[] = ["In Production", "Queued", "Paused", "Completed", "Archived"];
const dashboardReferenceDate = new Date("2026-07-27T09:00:00+10:00");
const initialQueueOrder = Array.from(
  new Set(
    [...customerDashboardProjects]
      .sort((left, right) => right.createdAt.localeCompare(left.createdAt))
      .map((project) => project.seriesId ? `series:${project.seriesId}` : `project:${project.id}`),
  ),
);
const initialProjectsById = new Map(customerDashboardProjects.map((project) => [project.id, project]));
const initialSeriesChildOrder = Object.fromEntries(
  customerDashboardSeries.map((series) => [
    series.id,
    [...series.childProjectIds].sort((leftId, rightId) =>
      (initialProjectsById.get(rightId)?.createdAt ?? "").localeCompare(initialProjectsById.get(leftId)?.createdAt ?? ""),
    ),
  ]),
);

export function CustomerDashboard() {
  const { selectedRole } = usePrototypeRole();
  const [projects, setProjects] = useState<CustomerDashboardProject[]>(customerDashboardProjects);
  const [selectedTab, setSelectedTab] = useState<QueueTab>("Queued");
  const [queueScope, setQueueScope] = useState<QueueScope>("All videos");
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [queueOrder, setQueueOrder] = useState<string[]>(initialQueueOrder);
  const [seriesChildOrder, setSeriesChildOrder] = useState<Record<string, string[]>>(initialSeriesChildOrder);
  const [expandedSeriesIds, setExpandedSeriesIds] = useState<string[]>(["wacf-cc"]);
  const [dragItem, setDragItem] = useState<DragItem | null>(null);
  const [isProductionDropActive, setIsProductionDropActive] = useState(false);
  const [openMenuProjectId, setOpenMenuProjectId] = useState<string | null>(null);
  const [openStatusProjectId, setOpenStatusProjectId] = useState<string | null>(null);
  const [chatProjectId, setChatProjectId] = useState<string | null | undefined>(undefined);
  const [isActivityOpen, setIsActivityOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [loadedPreferenceRole, setLoadedPreferenceRole] = useState<string | null>(null);
  const [hasLoadedSharedState, setHasLoadedSharedState] = useState(false);

  const preferenceStorageKey = `brisk-customer-dashboard-preferences-v1:${selectedRole}`;
  const sharedStateStorageKey = "brisk-customer-dashboard-shared-state-v1";

  useEffect(() => {
    const storedSharedState = window.localStorage.getItem(sharedStateStorageKey);

    if (storedSharedState) {
      try {
        const sharedState = JSON.parse(storedSharedState) as Partial<DashboardSharedState>;
        const storedStatuses = sharedState.statuses ?? {};

        setProjects(
          customerDashboardProjects.map((project) => {
            const storedStatus = storedStatuses[project.id];

            if (!isCustomerDashboardStatus(storedStatus) || storedStatus === project.status) {
              return project;
            }

            return {
              ...project,
              status: storedStatus,
              statusDetail: getDefaultStatusDetail(storedStatus),
            };
          }),
        );
      } catch {
        window.localStorage.removeItem(sharedStateStorageKey);
        setProjects(customerDashboardProjects);
      }
    }

    setHasLoadedSharedState(true);
  }, []);

  useEffect(() => {
    setLoadedPreferenceRole(null);
    const storedPreferences = window.localStorage.getItem(preferenceStorageKey);

    if (storedPreferences) {
      try {
        const preferences = JSON.parse(storedPreferences) as Partial<DashboardPreferences>;

        if (Array.isArray(preferences.queueOrder)) {
          setQueueOrder(normaliseQueueOrder(preferences.queueOrder));
        } else {
          setQueueOrder(initialQueueOrder);
        }

        if (preferences.seriesChildOrder && typeof preferences.seriesChildOrder === "object") {
          setSeriesChildOrder(normaliseSeriesChildOrder(preferences.seriesChildOrder));
        } else {
          setSeriesChildOrder(initialSeriesChildOrder);
        }

        if (Array.isArray(preferences.expandedSeriesIds)) {
          setExpandedSeriesIds(
            preferences.expandedSeriesIds.filter((seriesId) =>
              customerDashboardSeries.some((series) => series.id === seriesId),
            ),
          );
        } else {
          setExpandedSeriesIds(["wacf-cc"]);
        }

      } catch {
        window.localStorage.removeItem(preferenceStorageKey);
        setQueueOrder(initialQueueOrder);
        setSeriesChildOrder(initialSeriesChildOrder);
        setExpandedSeriesIds(["wacf-cc"]);
      }
    } else {
      setQueueOrder(initialQueueOrder);
      setSeriesChildOrder(initialSeriesChildOrder);
      setExpandedSeriesIds(["wacf-cc"]);
    }

    setLoadedPreferenceRole(selectedRole);
  }, [preferenceStorageKey, selectedRole]);

  useEffect(() => {
    if (loadedPreferenceRole !== selectedRole) {
      return;
    }

    const preferences: DashboardPreferences = {
      queueOrder,
      seriesChildOrder,
      expandedSeriesIds,
    };

    window.localStorage.setItem(preferenceStorageKey, JSON.stringify(preferences));
  }, [expandedSeriesIds, loadedPreferenceRole, preferenceStorageKey, queueOrder, selectedRole, seriesChildOrder]);

  useEffect(() => {
    if (!hasLoadedSharedState) {
      return;
    }

    const sharedState: DashboardSharedState = {
      statuses: Object.fromEntries(projects.map((project) => [project.id, project.status])),
    };

    window.localStorage.setItem(sharedStateStorageKey, JSON.stringify(sharedState));
  }, [hasLoadedSharedState, projects]);

  useEffect(() => {
    if (chatProjectId === undefined && !isActivityOpen) {
      return;
    }

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setChatProjectId(undefined);
        setIsActivityOpen(false);
      }
    };

    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [chatProjectId, isActivityOpen]);

  useEffect(() => {
    if (!openMenuProjectId && !openStatusProjectId && !isFilterOpen) {
      return;
    }

    const closeMenus = (event: MouseEvent) => {
      const target = event.target;

      if (target instanceof HTMLElement && target.closest(".customer-dashboard-menu, .customer-dashboard-menu-trigger")) {
        return;
      }

      setOpenMenuProjectId(null);
      setOpenStatusProjectId(null);
      setIsFilterOpen(false);
    };

    window.addEventListener("mousedown", closeMenus);
    return () => window.removeEventListener("mousedown", closeMenus);
  }, [isFilterOpen, openMenuProjectId, openStatusProjectId]);

  const projectsById = useMemo(() => new Map(projects.map((project) => [project.id, project])), [projects]);
  const seriesById = useMemo(
    () => new Map(customerDashboardSeries.map((series) => [series.id, series])),
    [],
  );
  const inProductionProjects = projects.filter((project) => project.status === "In Production");
  const tabProjects = projects.filter((project) => selectedTab === "All" || project.status === selectedTab);
  const queueCount = tabProjects.length;
  const visibleQueueEntries = queueOrder.reduce<QueueEntry[]>((entries, token) => {
    const [kind, id] = token.split(":", 2);

    if (kind === "series") {
      const series = seriesById.get(id);

      if (!series || queueScope === "Standalone only") {
        return entries;
      }

      const visibleChildren = getSeriesChildren(series, seriesChildOrder, projectsById).filter(
        (project) => selectedTab === "All" || project.status === selectedTab,
      );

      if (visibleChildren.length > 0) {
        entries.push({ kind: "series", token, series, visibleChildren });
      }

      return entries;
    }

    const project = projectsById.get(id);

    if (!project || project.seriesId || queueScope === "Series only") {
      return entries;
    }

    if (selectedTab === "All" || project.status === selectedTab) {
      entries.push({ kind: "project", token, project });
    }

    return entries;
  }, []);

  const notify = (message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(null), 2400);
  };

  const changeProjectStatus = (projectId: string, status: CustomerDashboardStatus) => {
    const project = projectsById.get(projectId);

    if (!project) {
      return;
    }

    if (project.status !== status) {
      setProjects((current) =>
        current.map((candidate) =>
          candidate.id === projectId
            ? { ...candidate, status, statusDetail: getDefaultStatusDetail(status) }
            : candidate,
        ),
      );
      notify(`${project.code} status changed to ${status.toLowerCase()}`);
    }

    setOpenStatusProjectId(null);
    setOpenMenuProjectId(null);
  };

  const startProject = (projectId: string) => {
    const project = projectsById.get(projectId);

    if (!project || project.status !== "Queued") {
      return;
    }

    changeProjectStatus(projectId, "In Production");
  };

  const moveTopLevelEntry = (draggedToken: string, targetToken: string) => {
    if (draggedToken === targetToken) {
      return;
    }

    setQueueOrder((current) => moveItem(current, draggedToken, targetToken));
  };

  const moveSeriesChild = (seriesId: string, draggedProjectId: string, targetProjectId: string) => {
    if (draggedProjectId === targetProjectId) {
      return;
    }

    setSeriesChildOrder((current) => ({
      ...current,
      [seriesId]: moveItem(current[seriesId] ?? [], draggedProjectId, targetProjectId),
    }));
  };

  const beginDrag = (event: ReactDragEvent<HTMLElement>, item: DragItem) => {
    setDragItem(item);
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", item.token);
  };

  const finishDrag = () => {
    setDragItem(null);
    setIsProductionDropActive(false);
  };

  return (
    <main className="customer-dashboard-shell">
      <WorkspaceSidebar activeItem="dashboard" />
      <div className="customer-dashboard-main">
        <header className="customer-dashboard-header">
          <div className="customer-dashboard-heading">
            <span className="customer-dashboard-customer-mark label-xs-semibold">LOOM</span>
            <h1>Your videos</h1>
          </div>
          <div className="customer-dashboard-global-actions">
            <button
              className="customer-dashboard-icon-button customer-dashboard-header-action"
              type="button"
              aria-label="Open latest activity"
              aria-expanded={isActivityOpen}
              onClick={() => {
                setChatProjectId(undefined);
                setOpenMenuProjectId(null);
                setOpenStatusProjectId(null);
                setIsFilterOpen(false);
                setIsActivityOpen((current) => !current);
              }}
            >
              <DsIcon name="clock-clockwise" size={20} />
            </button>
            <button
              className="customer-dashboard-icon-button customer-dashboard-header-action"
              type="button"
              aria-label="Open global chat"
              onClick={() => {
                setIsActivityOpen(false);
                setOpenMenuProjectId(null);
                setOpenStatusProjectId(null);
                setIsFilterOpen(false);
                setChatProjectId(null);
              }}
            >
              <DsIcon name="chats" size={20} />
              <CommentCountBadge count={8} label="8 unread messages" />
            </button>
          </div>
        </header>

        <div className="customer-dashboard-layout">
          <div className="customer-dashboard-content">
            <section
              className={`customer-production-section ${isProductionDropActive ? "drop-active" : ""}`}
              aria-labelledby="customer-production-title"
              onDragEnter={(event) => {
                if (dragItem && "projectId" in dragItem) {
                  event.preventDefault();
                  setIsProductionDropActive(true);
                }
              }}
              onDragOver={(event) => {
                if (dragItem && "projectId" in dragItem) {
                  event.preventDefault();
                  event.dataTransfer.dropEffect = "move";
                }
              }}
              onDragLeave={(event) => {
                if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
                  setIsProductionDropActive(false);
                }
              }}
              onDrop={(event) => {
                event.preventDefault();
                if (dragItem && "projectId" in dragItem) {
                  startProject(dragItem.projectId);
                }
                finishDrag();
              }}
            >
              <div className="customer-production-heading">
                <div className="customer-production-tab">
                  <h2 className="headings-m-bold" id="customer-production-title">
                    In production ({inProductionProjects.length})
                  </h2>
                </div>
                {isProductionDropActive ? (
                  <span className="customer-production-drop-message label-s-semibold">Drop to start this video</span>
                ) : null}
                <span className="customer-production-subtitle label-s">Videos we&apos;re currently making for Loom</span>
              </div>

              {inProductionProjects.length > 0 ? (
                <div className={`customer-production-grid production-count-${Math.min(inProductionProjects.length, 5)}`}>
                  {inProductionProjects.map((project) => (
                    <ProductionCard
                      key={project.id}
                      project={project}
                      isWide={inProductionProjects.length === 1}
                      series={project.seriesId ? seriesById.get(project.seriesId) : undefined}
                      onOpenChat={() => setChatProjectId(project.id)}
                      onChangeStatus={(status) => changeProjectStatus(project.id, status)}
                      isMenuOpen={openMenuProjectId === project.id}
                      onToggleMenu={() => {
                        setOpenStatusProjectId(null);
                        setIsFilterOpen(false);
                        setOpenMenuProjectId((current) => (current === project.id ? null : project.id));
                      }}
                    />
                  ))}
                </div>
              ) : (
                <div className="customer-production-empty">
                  <strong className="headings-2xs-bold">No videos in production</strong>
                  <span className="label-s">Drag a queued video here when you are ready to begin.</span>
                </div>
              )}
            </section>

            <section className="customer-queue-section" aria-labelledby="customer-queue-title">
              <div className="customer-queue-heading-row">
                <div>
                  <h2 className="headings-s-bold" id="customer-queue-title">Queue ({queueCount})</h2>
                  <span className="label-s">Your production roadmap with North Star Films</span>
                </div>
                <div className="customer-queue-header-actions">
                  <div className="customer-dashboard-filter-wrap">
                    <button
                      className={`customer-dashboard-secondary-button customer-dashboard-menu-trigger label-s-semibold ${queueScope !== "All videos" ? "selected" : ""}`}
                      type="button"
                      aria-expanded={isFilterOpen}
                      onClick={() => {
                        setOpenMenuProjectId(null);
                        setOpenStatusProjectId(null);
                        setIsFilterOpen((current) => !current);
                      }}
                    >
                      Filters
                      <DsIcon name="caret-down" size={14} />
                    </button>
                    {isFilterOpen ? (
                      <div className="customer-dashboard-menu customer-dashboard-filter-menu" role="menu">
                        {queueScopes.map((scope) => (
                          <button
                            className={`label-s ${queueScope === scope ? "selected" : ""}`}
                            type="button"
                            role="menuitemradio"
                            aria-checked={queueScope === scope}
                            key={scope}
                            onClick={() => {
                              setQueueScope(scope);
                              setIsFilterOpen(false);
                            }}
                          >
                            <span>{scope}</span>
                            {queueScope === scope ? <DsIcon name="check" size={15} /> : null}
                          </button>
                        ))}
                      </div>
                    ) : null}
                  </div>
                  <button
                    className="customer-dashboard-primary-button label-s-semibold"
                    type="button"
                    onClick={() => notify("Start Video opens the project brief flow")}
                  >
                    <DsIcon name="plus" size={16} />
                    Start Video
                  </button>
                </div>
              </div>

              <nav className="customer-queue-tabs" aria-label="Queue status">
                {queueTabs.map((tab) => (
                  <button
                    className={`customer-queue-tab label-s-semibold ${selectedTab === tab ? "selected" : ""}`}
                    type="button"
                    key={tab}
                    aria-pressed={selectedTab === tab}
                    onClick={() => setSelectedTab(tab)}
                  >
                    {tab}
                    <span className="label-xs">{getTabCount(projects, tab)}</span>
                  </button>
                ))}
              </nav>

              <div className="customer-queue-table" role="table" aria-label={`${selectedTab} videos`}>
                <div className="customer-queue-table-header label-xs-semibold" role="row">
                  <span role="columnheader">Video</span>
                  <span role="columnheader">Progress</span>
                  <span role="columnheader">Status</span>
                  <span role="columnheader">Created</span>
                  <span role="columnheader">Actions</span>
                </div>

                {visibleQueueEntries.map((entry) => {
                  if (entry.kind === "project") {
                    return (
                      <QueueProjectRow
                        key={entry.token}
                        project={entry.project}
                        dragItem={{ kind: "project", token: entry.token, projectId: entry.project.id }}
                        onDragStart={beginDrag}
                        onDragEnd={finishDrag}
                        onDropTopLevel={() => {
                          if (dragItem?.kind === "top-level" || dragItem?.kind === "project") {
                            moveTopLevelEntry(dragItem.token, entry.token);
                          }
                        }}
                        onOpenChat={() => setChatProjectId(entry.project.id)}
                        onStart={() => startProject(entry.project.id)}
                        isStatusMenuOpen={openStatusProjectId === entry.project.id}
                        onToggleStatusMenu={() => {
                          setOpenMenuProjectId(null);
                          setIsFilterOpen(false);
                          setOpenStatusProjectId((current) => (current === entry.project.id ? null : entry.project.id));
                        }}
                        onChangeStatus={(status) => changeProjectStatus(entry.project.id, status)}
                        isMenuOpen={openMenuProjectId === entry.project.id}
                        onToggleMenu={() => {
                          setOpenStatusProjectId(null);
                          setIsFilterOpen(false);
                          setOpenMenuProjectId((current) => (current === entry.project.id ? null : entry.project.id));
                        }}
                      />
                    );
                  }

                  const allChildren = getSeriesChildren(entry.series, seriesChildOrder, projectsById);
                  const latestAction = getLatestSeriesAction(allChildren);
                  const isExpanded = expandedSeriesIds.includes(entry.series.id);

                  return (
                    <div className="customer-series-group" role="rowgroup" key={entry.token}>
                      <div
                        className="customer-series-row"
                        role="row"
                        draggable
                        onDragStart={(event) => beginDrag(event, { kind: "top-level", token: entry.token })}
                        onDragEnd={finishDrag}
                        onDragOver={(event) => event.preventDefault()}
                        onDrop={(event) => {
                          event.preventDefault();
                          if (dragItem?.kind === "top-level" || dragItem?.kind === "project") {
                            moveTopLevelEntry(dragItem.token, entry.token);
                          }
                          finishDrag();
                        }}
                      >
                        <span className="customer-queue-drag" aria-hidden="true">
                          <DsIcon name="dots-six-vertical" size={18} />
                        </span>
                        <button
                          className="customer-series-toggle"
                          type="button"
                          aria-expanded={isExpanded}
                          aria-label={`${isExpanded ? "Collapse" : "Expand"} ${entry.series.name} series`}
                          onClick={() =>
                            setExpandedSeriesIds((current) =>
                              current.includes(entry.series.id)
                                ? current.filter((seriesId) => seriesId !== entry.series.id)
                                : [...current, entry.series.id],
                            )
                          }
                        >
                          <DsIcon name="caret-right" size={16} />
                        </button>
                        <div className="customer-series-primary" role="cell">
                          <span className="customer-series-tag label-xs-semibold">SERIES</span>
                          <strong className="heading-3xs">{entry.series.name}</strong>
                          <span className="customer-latest-action label-xs">
                            {latestAction.label} · {formatRelativeTime(latestAction.timestamp)}
                          </span>
                        </div>
                        <span className="customer-series-summary label-s" role="cell">
                          {getSeriesSummary(allChildren)}
                        </span>
                        <span className="customer-series-statuses" role="cell">
                          {getSeriesStatusLabels(allChildren).map((status) => (
                            <span className={`status-pill status-${toStatusClass(status)} label-xs-semibold`} key={status}>
                              {status}
                            </span>
                          ))}
                        </span>
                        <span className="customer-series-created label-xs" role="cell">
                          {formatCreatedDate(getOldestCreatedAt(allChildren))}
                        </span>
                        <span className="customer-series-actions" role="cell">
                          <button
                            className="customer-dashboard-icon-button"
                            type="button"
                            aria-label={`Open ${entry.series.name} conversations`}
                            onClick={() => setChatProjectId(entry.visibleChildren[0]?.id ?? null)}
                          >
                            <DsIcon name="chats" size={18} />
                          </button>
                        </span>
                      </div>

                      {isExpanded
                        ? entry.visibleChildren.map((project) => (
                            <QueueProjectRow
                              key={project.id}
                              project={project}
                              child
                              dragItem={{
                                kind: "series-child",
                                token: `child:${project.id}`,
                                projectId: project.id,
                                seriesId: entry.series.id,
                              }}
                              onDragStart={beginDrag}
                              onDragEnd={finishDrag}
                              onDropTopLevel={() => {
                                if (dragItem?.kind === "series-child" && dragItem.seriesId === entry.series.id) {
                                  moveSeriesChild(entry.series.id, dragItem.projectId, project.id);
                                }
                              }}
                              onOpenChat={() => setChatProjectId(project.id)}
                              onStart={() => startProject(project.id)}
                              isStatusMenuOpen={openStatusProjectId === project.id}
                              onToggleStatusMenu={() => {
                                setOpenMenuProjectId(null);
                                setIsFilterOpen(false);
                                setOpenStatusProjectId((current) => (current === project.id ? null : project.id));
                              }}
                              onChangeStatus={(status) => changeProjectStatus(project.id, status)}
                              isMenuOpen={openMenuProjectId === project.id}
                              onToggleMenu={() => {
                                setOpenStatusProjectId(null);
                                setIsFilterOpen(false);
                                setOpenMenuProjectId((current) => (current === project.id ? null : project.id));
                              }}
                            />
                          ))
                        : null}
                    </div>
                  );
                })}

                {visibleQueueEntries.length === 0 ? (
                  <div className="customer-queue-empty">
                    <span className="customer-queue-empty-icon"><DsIcon name="queue" size={24} /></span>
                    <strong className="headings-2xs-bold">Plan your next video</strong>
                    <p className="paragraph-s">Add videos here to plan ahead. Drag any into production when you&apos;re ready.</p>
                    <button
                      className="customer-dashboard-primary-button label-s-semibold"
                      type="button"
                      onClick={() => notify("Start Video opens the project brief flow")}
                    >
                      Start Video
                    </button>
                  </div>
                ) : null}
              </div>
            </section>
          </div>

        </div>
      </div>

      {isActivityOpen ? (
        <div className="customer-activity-backdrop" role="presentation" onMouseDown={() => setIsActivityOpen(false)}>
          <aside
            className="customer-activity-drawer"
            role="dialog"
            aria-modal="true"
            aria-label="Latest activity"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <button
              className="customer-activity-close"
              type="button"
              aria-label="Close latest activity"
              onClick={() => setIsActivityOpen(false)}
            >
              <DsIcon name="x-close-cross" size={18} />
            </button>
            <ActivityPanel />
          </aside>
        </div>
      ) : null}

      {chatProjectId !== undefined ? (
        <div className="customer-chat-backdrop" role="presentation" onMouseDown={() => setChatProjectId(undefined)}>
          <aside
            className="customer-chat-drawer"
            role="dialog"
            aria-modal="true"
            aria-label={chatProjectId ? "Project chat" : "Global chat"}
            onMouseDown={(event) => event.stopPropagation()}
          >
            <button
              className="customer-chat-close"
              type="button"
              aria-label="Close chat"
              onClick={() => setChatProjectId(undefined)}
            >
              <DsIcon name="x-close-cross" size={18} />
            </button>
            <ChatPage
              key={chatProjectId ?? "global-chat"}
              embedded
              clientName="Loom"
              initialProjectId={chatProjectId}
            />
          </aside>
        </div>
      ) : null}

      {toast ? <div className="customer-dashboard-toast label-s-semibold" role="status">{toast}</div> : null}
    </main>
  );
}

function ActivityPanel() {
  return (
    <section className="customer-activity-panel" aria-labelledby="customer-activity-title">
      <div className="customer-activity-heading">
        <div>
          <h2 className="headings-2xs-bold" id="customer-activity-title">Latest activity</h2>
          <span className="label-xs">Across all Loom videos</span>
        </div>
        <span className="customer-activity-filter label-xs-semibold">All</span>
      </div>
      <div className="customer-activity-list">
        {customerDashboardActivity.slice(0, 10).map((activity) => (
          <Link className="customer-activity-row" href={activity.href} key={activity.id}>
            <span className="customer-activity-icon"><DsIcon name={activity.icon} size={16} /></span>
            <span className="customer-activity-copy label-xs">
              <span>
                <strong>{activity.actor}</strong> {activity.action} {activity.object}
              </span>
              <span>{activity.projectLabel} · {formatRelativeTime(activity.timestamp)}</span>
            </span>
            <DsIcon name="caret-right" size={13} />
          </Link>
        ))}
      </div>
    </section>
  );
}

function ProductionCard({
  project,
  isWide,
  series,
  onOpenChat,
  onChangeStatus,
  isMenuOpen,
  onToggleMenu,
}: {
  project: CustomerDashboardProject;
  isWide: boolean;
  series?: CustomerDashboardSeries;
  onOpenChat: () => void;
  onChangeStatus: (status: CustomerDashboardStatus) => void;
  isMenuOpen: boolean;
  onToggleMenu: () => void;
}) {
  return (
    <article className={`customer-production-card ${isWide ? "is-wide" : ""}`}>
      <div className="customer-production-card-top">
        <div className="customer-production-card-copy">
          <span className="customer-project-code label-xs-semibold">{project.code}</span>
          <Link className="customer-production-card-title headings-2xs-bold" href={`/projects/${project.id}/stages/brief`}>
            {project.name}
          </Link>
          <span className="customer-latest-action label-xs">
            {project.latestAction.label} · {formatRelativeTime(project.latestAction.timestamp)}
          </span>
          {series ? (
            <div className="customer-production-card-tags">
              <span className="customer-series-chip label-xs-semibold">Series: {series.name}</span>
            </div>
          ) : null}
        </div>
        <div className="customer-production-card-header-side">
          <div className="customer-production-card-actions">
            <button className="customer-dashboard-icon-button" type="button" aria-label={`Open chat for ${project.name}`} onClick={onOpenChat}>
              <DsIcon name="chats" size={18} />
              <CommentCountBadge count={project.unreadMessages} label={`${project.unreadMessages} unread messages`} />
            </button>
            <div className="customer-project-menu-wrap">
              <button
                className="customer-dashboard-icon-button customer-dashboard-menu-trigger"
                type="button"
                aria-label={`Open actions for ${project.name}`}
                aria-expanded={isMenuOpen}
                onClick={onToggleMenu}
              >
                <DsIcon name="dots-three" size={18} />
              </button>
              {isMenuOpen ? (
                <ProjectActionsMenu project={project} onChangeStatus={onChangeStatus} />
              ) : null}
            </div>
          </div>
          <img
            className="customer-production-thumbnail"
            src={project.thumbnailUrl ?? customerDashboardFallbackThumbnailUrl}
            alt=""
          />
        </div>
      </div>

      <StageProgress
        compact={!isWide}
        showAge={false}
        projectId={project.id}
        projectName={project.name}
        stages={project.stages}
        studioName="North Star Films"
        customerName="Loom"
      />
    </article>
  );
}

function QueueProjectRow({
  project,
  child = false,
  dragItem,
  onDragStart,
  onDragEnd,
  onDropTopLevel,
  onOpenChat,
  onStart,
  isStatusMenuOpen,
  onToggleStatusMenu,
  onChangeStatus,
  isMenuOpen,
  onToggleMenu,
}: {
  project: CustomerDashboardProject;
  child?: boolean;
  dragItem: DragItem;
  onDragStart: (event: ReactDragEvent<HTMLElement>, item: DragItem) => void;
  onDragEnd: () => void;
  onDropTopLevel: () => void;
  onOpenChat: () => void;
  onStart: () => void;
  isStatusMenuOpen: boolean;
  onToggleStatusMenu: () => void;
  onChangeStatus: (status: CustomerDashboardStatus) => void;
  isMenuOpen: boolean;
  onToggleMenu: () => void;
}) {
  return (
    <div
      className={`customer-queue-row ${child ? "series-child" : ""}`}
      role="row"
      draggable
      onDragStart={(event) => onDragStart(event, dragItem)}
      onDragEnd={onDragEnd}
      onDragOver={(event) => {
        event.preventDefault();
        event.dataTransfer.dropEffect = "move";
      }}
      onDrop={(event) => {
        event.preventDefault();
        onDropTopLevel();
        onDragEnd();
      }}
    >
      <span className="customer-queue-drag" aria-hidden="true"><DsIcon name="dots-six-vertical" size={18} /></span>
      <div className="customer-queue-project" role="cell">
        <span className="customer-project-code label-xs-semibold">{project.code}</span>
        <Link className="heading-3xs" href={`/projects/${project.id}/stages/brief`}>{project.name}</Link>
        <span className="customer-latest-action label-xs">
          {project.latestAction.label} · {formatRelativeTime(project.latestAction.timestamp)}
        </span>
      </div>
      <div className="customer-queue-progress" role="cell">
        <StageProgress
          compact
          showAge={false}
          projectId={project.id}
          projectName={project.name}
          stages={project.stages}
          studioName="North Star Films"
          customerName="Loom"
        />
      </div>
      <div className="customer-queue-status" role="cell">
        <ProjectStatusControl
          project={project}
          isOpen={isStatusMenuOpen}
          onToggle={onToggleStatusMenu}
          onChange={onChangeStatus}
        />
      </div>
      <time className="customer-queue-created label-xs" dateTime={project.createdAt} role="cell">
        {formatCreatedDate(project.createdAt)}
      </time>
      <div className="customer-queue-actions" role="cell">
        <button className="customer-dashboard-icon-button" type="button" aria-label={`Open chat for ${project.name}`} onClick={onOpenChat}>
          <DsIcon name="chats" size={18} />
          <CommentCountBadge count={project.unreadMessages} label={`${project.unreadMessages} unread messages`} />
        </button>
        <div className="customer-project-menu-wrap">
          <button
            className="customer-dashboard-icon-button customer-dashboard-menu-trigger"
            type="button"
            aria-label={`Open actions for ${project.name}`}
            aria-expanded={isMenuOpen}
            onClick={onToggleMenu}
          >
            <DsIcon name="dots-three" size={18} />
          </button>
          {isMenuOpen ? <ProjectActionsMenu project={project} onStart={onStart} /> : null}
        </div>
      </div>
    </div>
  );
}

function ProjectStatusControl({
  project,
  isOpen,
  onToggle,
  onChange,
}: {
  project: CustomerDashboardProject;
  isOpen: boolean;
  onToggle: () => void;
  onChange: (status: CustomerDashboardStatus) => void;
}) {
  return (
    <div className="customer-status-control">
      <button
        className={`status-pill status-${toStatusClass(project.status)} customer-status-trigger customer-dashboard-menu-trigger label-xs-semibold`}
        type="button"
        aria-label={`Change status for ${project.name}. Current status: ${project.status}`}
        aria-haspopup="menu"
        aria-expanded={isOpen}
        onClick={onToggle}
      >
        {project.status}
        <DsIcon name="caret-down" size={12} />
      </button>
      {isOpen ? (
        <div className="customer-dashboard-menu customer-status-menu" role="menu" aria-label={`Status for ${project.name}`}>
          {projectStatuses.map((status) => (
            <button
              className={`label-s ${project.status === status ? "selected" : ""}`}
              type="button"
              role="menuitemradio"
              aria-checked={project.status === status}
              key={status}
              onClick={() => onChange(status)}
            >
              <span>{status}</span>
              {project.status === status ? <DsIcon name="check" size={15} /> : null}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function ProjectActionsMenu({
  project,
  onStart,
  onChangeStatus,
}: {
  project: CustomerDashboardProject;
  onStart?: () => void;
  onChangeStatus?: (status: CustomerDashboardStatus) => void;
}) {
  return (
    <div className="customer-dashboard-menu customer-project-actions-menu" role="menu">
      {project.status === "Queued" && onStart ? (
        <button className="label-s-semibold" type="button" role="menuitem" onClick={onStart}>
          <DsIcon name="play" size={16} />
          Start this video
        </button>
      ) : null}
      {onChangeStatus ? (
        <div className="customer-project-status-actions" role="group" aria-label={`Change status for ${project.name}`}>
          <span className="customer-project-menu-label label-xs-semibold">Change status</span>
          <button className="label-s-semibold" type="button" role="menuitem" onClick={() => onChangeStatus("Queued")}>
            <DsIcon name="queue" size={16} />
            Move to queue
          </button>
          <button className="label-s-semibold" type="button" role="menuitem" onClick={() => onChangeStatus("Paused")}>
            <DsIcon name="pause" size={16} />
            Pause video
          </button>
          <button className="label-s-semibold" type="button" role="menuitem" onClick={() => onChangeStatus("Completed")}>
            <DsIcon name="check-circle" size={16} />
            Mark completed
          </button>
          <button className="label-s-semibold" type="button" role="menuitem" onClick={() => onChangeStatus("Archived")}>
            <DsIcon name="folder" size={16} />
            Archive
          </button>
        </div>
      ) : null}
      <Link className="label-s-semibold" href={`/projects/${project.id}/stages/brief`} role="menuitem">
        <DsIcon name="folder-open" size={16} />
        Open project
      </Link>
    </div>
  );
}

function getSeriesChildren(
  series: CustomerDashboardSeries,
  seriesChildOrder: Record<string, string[]>,
  projectsById: Map<string, CustomerDashboardProject>,
) {
  return (seriesChildOrder[series.id] ?? series.childProjectIds)
    .map((projectId) => projectsById.get(projectId))
    .filter((project): project is CustomerDashboardProject => Boolean(project));
}

function getLatestSeriesAction(projects: CustomerDashboardProject[]) {
  return [...projects]
    .sort((left, right) => right.latestAction.timestamp.localeCompare(left.latestAction.timestamp))[0]
    ?.latestAction ?? { label: "Series created", timestamp: "2026-07-01T09:00:00+10:00" };
}

function getSeriesSummary(projects: CustomerDashboardProject[]) {
  const labels = getSeriesStatusLabels(projects).map((status) => {
    const count = projects.filter((project) => project.status === status).length;
    return `${count} ${status.toLowerCase()}`;
  });

  return `${projects.length} videos${labels.length > 0 ? `, ${labels.join(", ")}` : ""}`;
}

function getSeriesStatusLabels(projects: CustomerDashboardProject[]) {
  const statusOrder: CustomerDashboardStatus[] = ["In Production", "Queued", "Completed", "Paused", "Archived"];
  return statusOrder.filter((status) => projects.some((project) => project.status === status));
}

function getOldestCreatedAt(projects: CustomerDashboardProject[]) {
  return [...projects].sort((left, right) => left.createdAt.localeCompare(right.createdAt))[0]?.createdAt ?? "";
}

function getTabCount(projects: CustomerDashboardProject[], tab: QueueTab) {
  return tab === "All" ? projects.length : projects.filter((project) => project.status === tab).length;
}

function moveItem(items: string[], draggedItem: string, targetItem: string) {
  const draggedIndex = items.indexOf(draggedItem);
  const targetIndex = items.indexOf(targetItem);

  if (draggedIndex === -1 || targetIndex === -1) {
    return items;
  }

  const nextItems = [...items];
  nextItems.splice(draggedIndex, 1);
  nextItems.splice(targetIndex, 0, draggedItem);
  return nextItems;
}

function normaliseQueueOrder(storedOrder: string[]) {
  const knownTokens = new Set(initialQueueOrder);
  const validStoredTokens = storedOrder.filter((token) => knownTokens.has(token));
  return [...validStoredTokens, ...initialQueueOrder.filter((token) => !validStoredTokens.includes(token))];
}

function normaliseSeriesChildOrder(storedOrder: Record<string, string[]>) {
  return Object.fromEntries(
    customerDashboardSeries.map((series) => {
      const storedChildren = Array.isArray(storedOrder[series.id]) ? storedOrder[series.id] : [];
      const validStoredChildren = storedChildren.filter((projectId) => series.childProjectIds.includes(projectId));
      return [
        series.id,
        [...validStoredChildren, ...series.childProjectIds.filter((projectId) => !validStoredChildren.includes(projectId))],
      ];
    }),
  );
}

function isCustomerDashboardStatus(value: unknown): value is CustomerDashboardStatus {
  return value === "Queued" || value === "In Production" || value === "Completed" || value === "Paused" || value === "Archived";
}

function getDefaultStatusDetail(status: CustomerDashboardStatus): CustomerDashboardProject["statusDetail"] {
  if (status === "In Production") {
    return "Waiting on studio";
  }

  if (status === "Completed") {
    return "Approved";
  }

  if (status === "Paused") {
    return "Paused";
  }

  if (status === "Archived") {
    return "Archived";
  }

  return "Ready to start";
}

function toStatusClass(status: CustomerDashboardStatus) {
  return status.toLowerCase().replace(/\s+/gu, "-");
}

function formatCreatedDate(timestamp: string) {
  return new Intl.DateTimeFormat("en-AU", { day: "numeric", month: "short", year: "numeric" }).format(new Date(timestamp));
}

function formatRelativeTime(timestamp: string) {
  const milliseconds = Math.max(0, dashboardReferenceDate.getTime() - new Date(timestamp).getTime());
  const hours = Math.floor(milliseconds / 3_600_000);

  if (hours < 24) {
    return `${Math.max(1, hours)}h ago`;
  }

  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}
