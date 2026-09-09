"use client";

import type {
  CSSProperties,
  KeyboardEvent as ReactKeyboardEvent,
  MouseEvent as ReactMouseEvent,
  PointerEvent as ReactPointerEvent,
  ReactNode,
} from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { activeVideoProjects } from "@/data/active-videos/mockData";
import { formatHours, getAcceptedPerson, getProjectEstimatedHours, getProjectLoggedHours, getTeamPerson, getVisibleInvitations } from "@/data/active-videos/teamDefaults";
import { useCostsData } from "@/components/costs/CostsDataContext";
import { todayCurrentUserId } from "@/data/today/mockData";
import { getDemoProjectDestination } from "@/data/projects";
import { formatCostAmount, type ContractorInvoice, type ContractorOffer, type CostCurrency } from "@/data/costs";
import {
  readSharedTimeEntries,
  sharedTimeEntriesEventName,
  toProjectTimeEntry,
} from "@/data/timeEntries/sharedTimeEntries";
import { CommentCountBadge } from "@/components/CommentCountBadge";
import { usePrototypeRole, type PrototypeRole } from "@/components/navigation/PrototypeRoleContext";
import { useProjectCompletion } from "@/components/project/ProjectCompletionContext";
import { useProjectFiles } from "@/components/project/ProjectFilesContext";
import { useProjectStageStatus } from "@/components/project/ProjectStageStatusContext";
import { TeamPanel, type TeamPanelAccess } from "@/components/project/team/TeamPanel";
import { ProjectLatestActionsList } from "@/components/notifications/ProjectActivityHistory";
import { DsIcon } from "@/components/video-review/DsIcon";
import { StageProgress, stageOrder } from "@/components/active-videos/StageProgress";
import { ProjectFlowAdjuster } from "@/components/production-flow/ProjectFlowAdjuster";
import { FreelancerVideosPage } from "@/components/active-videos/FreelancerVideosPage";
import { useRoleVideoTable } from "@/components/active-videos/useRoleVideoTable";
import { usePrototypeState } from "@/components/prototype-state/PrototypeStateContext";
import { selectWorkspaceProjects, type ScopedProject } from "@/data/prototype-state";
import { getFileLocationDisplayLabel, getFileLocationHref, getFileLocationTooltip } from "@/lib/project-files";
import type { Project, ProjectDeadline, ProjectFileLocation, RoleSlot, StageKey, TeamPerson, TimeEntry } from "./types";

type StatusTab = "All" | Project["status"];
type FilterKey = "client" | "teammate" | "tags" | "status" | "deadline";
type DataColumnKey = "progress" | "latestUpdate" | "status" | "deadline" | "hours" | "costs" | "team" | "actions";
type TableColumnKey = "project" | DataColumnKey;
type DeadlineCategory = "Overdue" | "Due Soon" | "On Track";
type TagClass = "critical" | "high-priority" | "in-review" | "neutral" | "green" | "peach" | "cream";
type ProjectPanelEditSection = "hours" | "deadline" | "client" | "tags" | "notes";
type ProjectTimeEntry = {
  id: string;
  person: string;
  dateLabel: string;
  hours: number;
  stage: StageKey;
  note?: string;
};
type ProjectCostSummary = {
  totalLabel: string;
  outstandingInvoiceCount: number;
};
type FilterState = {
  client: string | null;
  teammate: string | null;
  tags: string[];
  status: string | null;
  deadline: string | null;
};
type ColumnDragState = {
  columnKey: DataColumnKey;
  dropIndex: number;
  pointerId: number;
  startX: number;
  currentX: number;
  isDragging: boolean;
  originLeft: number;
  originTop: number;
  originWidth: number;
  originHeight: number;
  tableTop: number;
  tableHeight: number;
};
type ColumnContextMenuState = {
  columnKey: DataColumnKey;
  x: number;
  y: number;
};
type ColumnSettlingGhostState = {
  label: string;
  startLeft: number;
  endLeft: number;
  top: number;
  width: number;
  height: number;
};
type LatestActionsOpenRequest = {
  projectId: string;
  requestId: number;
};

const statusTabs: StatusTab[] = ["All", "Queued", "In Production", "Completed", "Paused", "Archived"];
const latestUpdateReferenceDate = new Date("2026-06-18T12:00:00+10:00");
const deadlineReferenceDate = new Date("2026-06-22T09:30:00+10:00");
const projectColumnWidth = 300;
const columnOrderStorageKey = "brisk-active-videos-column-order-v3";
const fixedEndColumn: DataColumnKey = "actions";

const columnConfig: Record<DataColumnKey, { label: string; width: number }> = {
  progress: { label: "Progress", width: 490 },
  latestUpdate: { label: "Latest action", width: 300 },
  status: { label: "Status", width: 150 },
  deadline: { label: "Deadline", width: 170 },
  hours: { label: "Hours", width: 220 },
  costs: { label: "Project costs", width: 190 },
  team: { label: "Team", width: 68 },
  actions: { label: "Actions", width: 64 },
};

const defaultColumnOrder: DataColumnKey[] = ["progress", "latestUpdate", "status", "deadline", "hours", "costs", "team", "actions"];
const nonStaffColumnOrder: DataColumnKey[] = ["progress", "latestUpdate", "status", "deadline", "hours", "team", "actions"];
const defaultHiddenColumns: DataColumnKey[] = ["hours", "team"];

function getProjectFlowHref(projectId: string) {
  return getDemoProjectDestination(projectId, "brief")?.href ?? `/projects/${encodeURIComponent(projectId)}`;
}

const filterLabels: Record<FilterKey, string> = {
  client: "Client",
  teammate: "Teammate",
  tags: "Tags",
  status: "Status",
  deadline: "Deadline",
};

const tagFilterOptions = ["Critical", "High Priority", "In Review"];
const deadlineFilterOptions = ["Overdue", "Due Soon", "On Track"];
const defaultTagClasses: Record<string, TagClass> = {
  Critical: "critical",
  "High Priority": "high-priority",
  "In Review": "in-review",
};
const tagColourOptions: { className: TagClass; label: string }[] = [
  { className: "critical", label: "Purple" },
  { className: "high-priority", label: "Blue" },
  { className: "neutral", label: "Grey" },
  { className: "green", label: "Green" },
  { className: "peach", label: "Peach" },
  { className: "cream", label: "Cream" },
];
export function ActiveVideosPage() {
  const { hasLoadedRole, selectedRole } = usePrototypeRole();

  if (hasLoadedRole && selectedRole === "Studio Freelancer") {
    return <FreelancerVideosPage />;
  }

  return <ActiveVideosWorkspace key={selectedRole} />;
}

function ActiveVideosWorkspace() {
  const { hasLoadedRole, selectedRole } = usePrototypeRole();
  const { state } = usePrototypeState();
  const canonicalProjects = selectWorkspaceProjects(state, state.session.activeWorkspaceId);
  const { completionRecords } = useProjectCompletion();
  const { fileLocationsByProjectId } = useProjectFiles();
  const { getProjectStages } = useProjectStageStatus();
  const { invoices, offers } = useCostsData();
  const router = useRouter();
  const searchParams = useSearchParams();
  const projectIdFromParams = searchParams.get("project");
  const previewState = searchParams.get("preview");
  const [selectedTab, setSelectedTab] = useState<StatusTab>("All");
  const [query, setQuery] = useState("");
  const [openFilter, setOpenFilter] = useState<FilterKey | null>(null);
  const [filters, setFilters] = useState<FilterState>({
    client: null,
    teammate: null,
    tags: [],
    status: null,
    deadline: null,
  });
  const [projectTags, setProjectTags] = useState<Record<string, string[]>>(() =>
    Object.fromEntries(canonicalProjects.map((project) => [project.id, project.tags ?? []])),
  );
  const [projectDeadlines, setProjectDeadlines] = useState<Record<string, ProjectDeadline | undefined>>(() =>
    Object.fromEntries(canonicalProjects.map((project) => [project.id, project.deadline])),
  );
  const [extraProjectTimeEntries, setExtraProjectTimeEntries] = useState<Record<string, TimeEntry[]>>({});
  const [tagClasses, setTagClasses] = useState<Record<string, TagClass>>(defaultTagClasses);
  const [openTagProjectId, setOpenTagProjectId] = useState<string | null>(null);
  const [openDeadlineProjectId, setOpenDeadlineProjectId] = useState<string | null>(null);
  const [areFiltersVisible, setAreFiltersVisible] = useState(false);
  const [panelProjectId, setPanelProjectId] = useState<string | null>(() => getValidProjectId(projectIdFromParams));
  const [isProjectPanelOpen, setIsProjectPanelOpen] = useState(() => getValidProjectId(projectIdFromParams) !== null);
  const [isPanelContentSwitching, setIsPanelContentSwitching] = useState(false);
  const [latestActionsOpenRequest, setLatestActionsOpenRequest] = useState<LatestActionsOpenRequest | null>(null);
  const panelCloseTimeoutRef = useRef<number | null>(null);
  const latestActionsRequestIdRef = useRef(0);
  const availableColumnOrder = selectedRole === "Studio Staff" ? defaultColumnOrder : nonStaffColumnOrder;
  const videoTable = useRoleVideoTable<DataColumnKey, "project">({
    columnConfig,
    defaultHiddenColumns,
    defaultOrder: availableColumnOrder,
    minimumVisibleColumns: 2,
    primaryColumnKey: "project",
    primaryColumnWidth: projectColumnWidth,
    storageKey: selectedRole === "Studio Staff" ? columnOrderStorageKey : `${columnOrderStorageKey}:${selectedRole}`,
  });
  const {
    columnContextMenu,
    columnDrag,
    columnOrder,
    draggedColumn,
    droppedColumn,
    dropIndicatorStyle,
    getColumnShiftDirection: getSharedColumnShiftDirection,
    getColumnWidth: getSharedColumnWidth,
    handleColumnContextMenu,
    handleColumnPointerDown,
    handleTableScroll,
    headerRefs,
    hiddenColumns,
    hideColumn,
    isColumnMenuOpen,
    isTableScrolledX,
    moveColumnByStep,
    pinColumn,
    resetColumns,
    setColumnContextMenu,
    setIsColumnMenuOpen,
    settlingGhost,
    tableMinWidth,
    tableScrollRef,
    toggleColumnVisibility,
    visibleDataColumns,
    visibleTableColumns,
  } = videoTable;

  useEffect(() => {
    const syncSharedEntries = () => {
      const entriesByProject = readSharedTimeEntries().reduce<Record<string, TimeEntry[]>>((groupedEntries, entry) => {
        const projectEntries = groupedEntries[entry.projectId] ?? [];
        groupedEntries[entry.projectId] = [...projectEntries, toProjectTimeEntry(entry)];
        return groupedEntries;
      }, {});

      setExtraProjectTimeEntries(entriesByProject);
    };

    syncSharedEntries();
    window.addEventListener(sharedTimeEntriesEventName, syncSharedEntries);
    window.addEventListener("storage", syncSharedEntries);

    return () => {
      window.removeEventListener(sharedTimeEntriesEventName, syncSharedEntries);
      window.removeEventListener("storage", syncSharedEntries);
    };
  }, []);

  const projects = useMemo(() => {
    if (previewState === "empty") return [];

    return canonicalProjects.map((project) => {
        const completion = completionRecords[project.id];
        const projectStages = getProjectStages(project);
        return {
          ...project,
          status: completion ? "Completed" as const : project.status,
          deliveredAt: completion?.deliveredAt ?? project.deliveredAt,
          deliveredBy: completion?.deliveredBy ?? project.deliveredBy,
          stages: completion
            ? {
                ...projectStages,
                ...Object.fromEntries((Object.keys(projectStages) as StageKey[]).map((stage) => [stage, { state: "done" as const }])),
              }
            : projectStages,
          latestUpdate: completion
            ? { label: `Delivered ${formatDeliveredDate(completion.deliveredAt)}`, daysAgo: 0, timestamp: completion.deliveredAt }
            : project.latestUpdate,
          timeEntries: [...project.timeEntries, ...(extraProjectTimeEntries[project.id] ?? [])],
        };
      });
  }, [canonicalProjects, completionRecords, extraProjectTimeEntries, getProjectStages, previewState]);

  const projectCostSummaries = useMemo(
    () => Object.fromEntries(
      projects.map((project) => [project.id, getProjectCostSummary(project.id, offers, invoices)]),
    ) as Record<string, ProjectCostSummary>,
    [invoices, offers, projects],
  );

  const statusCounts = useMemo(() => Object.fromEntries(statusTabs.map((tab) => [
    tab,
    tab === "All" ? projects.length : projects.filter((project) => project.status === tab).length,
  ])) as Record<StatusTab, number>, [projects]);

  const clientOptions = useMemo(() => getUniqueOptions(projects.map((project) => project.clientBadge)), [projects]);
  const teammateOptions = useMemo(
    () => getUniqueOptions(projects.map((project) => getPrimaryTeamPerson(project.team)?.initials ?? "Studio")),
    [projects],
  );
  const tagOptions = useMemo(
    () => getUniqueOptions([...tagFilterOptions, ...Object.values(projectTags).flat()]),
    [projectTags],
  );
  const filteredProjects = useMemo(() => {
    if (previewState === "no-results") return [];

    const normalisedQuery = query.trim().toLowerCase();

    return projects.filter((project) => {
      const matchesTab = selectedTab === "All" || project.status === selectedTab;
      const matchesSearch =
        normalisedQuery.length === 0 ||
        project.name.toLowerCase().includes(normalisedQuery) ||
        project.clientBadge.toLowerCase().includes(normalisedQuery);
      const matchesClient = filters.client === null || project.clientBadge === filters.client;
      const matchesTeammate = filters.teammate === null || getPrimaryTeamPerson(project.team)?.initials === filters.teammate;
      const matchesTags =
        filters.tags.length === 0 || filters.tags.some((tag) => (projectTags[project.id] ?? []).includes(tag));
      const matchesStatus = filters.status === null || project.status === filters.status;
      const deadlineCategory = getDeadlineCategory(projectDeadlines[project.id]);
      const matchesDeadline = filters.deadline === null || deadlineCategory === filters.deadline;

      return matchesTab && matchesSearch && matchesClient && matchesTeammate && matchesTags && matchesStatus && matchesDeadline;
    });
  }, [filters, previewState, projectDeadlines, projectTags, projects, query, selectedTab]);

  const clearControls = () => {
    setQuery("");
    setSelectedTab("All");
    setFilters({ client: null, teammate: null, tags: [], status: null, deadline: null });
    const url = new URL(window.location.href);
    url.searchParams.delete("preview");
    router.replace(`${url.pathname}${url.search}`);
  };

  const panelProject = useMemo(
    () => projects.find((project) => project.id === panelProjectId) ?? null,
    [panelProjectId, projects],
  );

  const updateProjectQuery = (projectId: string | null, mode: "push" | "replace" = "push") => {
    const url = new URL(window.location.href);

    if (projectId) {
      url.searchParams.set("project", projectId);
    } else {
      url.searchParams.delete("project");
    }

    const nextPath = `${url.pathname}${url.search}${url.hash}`;

    if (mode === "replace") {
      router.replace(nextPath, { scroll: false });
      return;
    }

    router.push(nextPath, { scroll: false });
  };

  const openProjectPanel = (
    projectId: string,
    mode: "push" | "replace" = "push",
    expandLatestActions = false,
  ) => {
    if (panelCloseTimeoutRef.current !== null) {
      window.clearTimeout(panelCloseTimeoutRef.current);
      panelCloseTimeoutRef.current = null;
    }

    setOpenTagProjectId(null);
    setOpenDeadlineProjectId(null);
    if (expandLatestActions) {
      latestActionsRequestIdRef.current += 1;
      setLatestActionsOpenRequest({
        projectId,
        requestId: latestActionsRequestIdRef.current,
      });
    } else {
      setLatestActionsOpenRequest(null);
    }

    if (isProjectPanelOpen && panelProjectId && panelProjectId !== projectId) {
      setIsPanelContentSwitching(true);
      window.setTimeout(() => {
        setPanelProjectId(projectId);
        window.setTimeout(() => setIsPanelContentSwitching(false), 75);
      }, 75);
    } else {
      setPanelProjectId(projectId);
      setIsPanelContentSwitching(false);
    }

    setIsProjectPanelOpen(true);
    updateProjectQuery(projectId, mode);
  };

  const closeProjectPanel = (mode: "push" | "replace" = "push") => {
    setIsProjectPanelOpen(false);
    setIsPanelContentSwitching(false);
    setLatestActionsOpenRequest(null);
    updateProjectQuery(null, mode);

    if (panelCloseTimeoutRef.current !== null) {
      window.clearTimeout(panelCloseTimeoutRef.current);
    }

    panelCloseTimeoutRef.current = window.setTimeout(() => {
      setPanelProjectId(null);
      panelCloseTimeoutRef.current = null;
    }, 200);
  };

  const setFilter = (filterKey: FilterKey, value: string | null) => {
    if (filterKey === "tags") {
      toggleTagFilter(value);
      return;
    }

    setFilters((current) => ({
      ...current,
      [filterKey]: current[filterKey] === value ? null : value,
    }));
  };

  const toggleTagFilter = (tag: string | null) => {
    setFilters((current) => {
      if (tag === null) {
        return {
          ...current,
          tags: [],
        };
      }

      const isSelected = current.tags.includes(tag);

      return {
        ...current,
        tags: isSelected ? current.tags.filter((currentTag) => currentTag !== tag) : [...current.tags, tag],
      };
    });
  };

  const addProjectTag = (projectId: string, tag: string) => {
    setProjectTags((current) => {
      const currentTags = current[projectId] ?? [];

      if (currentTags.includes(tag)) {
        return current;
      }

      return {
        ...current,
        [projectId]: [...currentTags, tag],
      };
    });
    setOpenTagProjectId(null);
  };

  const removeProjectTag = (projectId: string, tag: string) => {
    setProjectTags((current) => ({
      ...current,
      [projectId]: (current[projectId] ?? []).filter((currentTag) => currentTag !== tag),
    }));
  };

  const createProjectTag = (projectId: string, tagName: string, tagClass: TagClass) => {
    const normalisedTagName = tagName.trim();

    if (!normalisedTagName) {
      return;
    }

    setTagClasses((current) => ({
      ...current,
      [normalisedTagName]: tagClass,
    }));
    addProjectTag(projectId, normalisedTagName);
  };

  const saveProjectDeadline = (projectId: string, deadline: ProjectDeadline | undefined) => {
    setProjectDeadlines((current) => ({
      ...current,
      [projectId]: deadline,
    }));
  };

  useEffect(() => {
    const validProjectId = getValidProjectId(projectIdFromParams);

    if (validProjectId) {
      setPanelProjectId(validProjectId);
      setIsProjectPanelOpen(true);
      return;
    }

    setIsProjectPanelOpen(false);
    setPanelProjectId(null);
  }, [projectIdFromParams]);

  useEffect(() => {
    if (!isProjectPanelOpen || !panelProjectId) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        closeProjectPanel();
        return;
      }

      if (event.key !== "ArrowDown" && event.key !== "ArrowUp") {
        return;
      }

      const currentIndex = filteredProjects.findIndex((project) => project.id === panelProjectId);

      if (currentIndex === -1) {
        return;
      }

      const nextIndex = event.key === "ArrowDown" ? currentIndex + 1 : currentIndex - 1;
      const nextProject = filteredProjects[nextIndex];

      if (!nextProject) {
        return;
      }

      event.preventDefault();
      openProjectPanel(nextProject.id);
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [filteredProjects, isProjectPanelOpen, panelProjectId]);

  useEffect(() => {
    if (!isProjectPanelOpen) {
      return;
    }

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target;

      if (
        target instanceof HTMLElement &&
        target.closest(
          ".project-detail-panel, .active-project-row, a, button, input, textarea, select, [role='button'], .project-tag-menu, .deadline-popover",
        )
      ) {
        return;
      }

      closeProjectPanel();
    };

    window.addEventListener("pointerdown", handlePointerDown);

    return () => window.removeEventListener("pointerdown", handlePointerDown);
  }, [isProjectPanelOpen]);

  useEffect(() => {
    if (!openDeadlineProjectId) {
      return;
    }

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target;

      if (target instanceof HTMLElement && target.closest(".deadline-cell, .deadline-popover")) {
        return;
      }

      setOpenDeadlineProjectId(null);
    };

    window.addEventListener("pointerdown", handlePointerDown);

    return () => window.removeEventListener("pointerdown", handlePointerDown);
  }, [openDeadlineProjectId]);

  return (
    <main className={`active-videos-shell ${areFiltersVisible ? "filters-open" : ""}`}>
      <div className="active-videos-main">
        <section className="active-videos-header" aria-label="Videos header">
          <h1 className="active-videos-title">Videos ({projects.length})</h1>
          <div className="active-videos-header-actions">
            <label className="active-videos-search label-s" htmlFor="active-videos-search">
              <span className="sr-only">Search projects</span>
              <input
                id="active-videos-search"
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search projects..."
              />
            </label>
          </div>
        </section>

      <nav className="active-videos-tabs" aria-label="Project status">
        {statusTabs.map((tab) => (
          <button
            className={`active-videos-tab label-s-semibold ${selectedTab === tab ? "selected" : ""}`}
            type="button"
            key={tab}
            onClick={() => setSelectedTab(tab)}
          >
            {getStatusLabel(tab)} ({statusCounts[tab]})
          </button>
        ))}
        <button
          className={`active-filters-toggle label-s-semibold ${areFiltersVisible ? "selected" : ""}`}
          type="button"
          aria-expanded={areFiltersVisible}
          aria-controls="active-videos-filters"
          onClick={() => {
            setAreFiltersVisible((current) => {
              if (current) {
                setOpenFilter(null);
                setIsColumnMenuOpen(false);
              }

              return !current;
            });
          }}
        >
          Filters
          <DsIcon name="caret-down" size={14} />
        </button>
      </nav>

      {areFiltersVisible ? (
        <section className="active-videos-filters" id="active-videos-filters" aria-label="Filters">
          {(Object.keys(filterLabels) as FilterKey[]).map((filterKey) => (
            <FilterDropdown
              key={filterKey}
              filterKey={filterKey}
              label={filterLabels[filterKey]}
              value={filters[filterKey]}
              options={getFilterOptions(filterKey, clientOptions, teammateOptions, tagOptions)}
              tagClasses={tagClasses}
              isOpen={openFilter === filterKey}
              onToggle={() => setOpenFilter((current) => (current === filterKey ? null : filterKey))}
              onSelect={(value) => {
                if (filterKey === "tags") {
                  toggleTagFilter(value);
                  return;
                }

                setFilter(filterKey, value);
              }}
            />
          ))}
          <ColumnVisibilityMenu
            availableColumns={availableColumnOrder}
            isOpen={isColumnMenuOpen}
            hiddenColumns={hiddenColumns}
            visibleColumnCount={visibleDataColumns.filter((columnKey) => columnKey !== fixedEndColumn).length}
            onToggleOpen={() => setIsColumnMenuOpen((current) => !current)}
            onToggleColumn={toggleColumnVisibility}
            onReset={resetColumns}
          />
        </section>
      ) : null}

      <section className="active-videos-table-frame" aria-label="Videos table">
        <div
          className={`active-videos-scroll ${isTableScrolledX ? "has-horizontal-scroll" : ""}`}
          ref={tableScrollRef}
          onScroll={handleTableScroll}
        >
          <table
            className={`active-videos-table ${draggedColumn ? "is-column-dragging" : ""}`}
            style={{ minWidth: tableMinWidth } as CSSProperties}
          >
            <colgroup>
              {visibleTableColumns.map((columnKey) => (
                <col
                  className={`column-${columnKey}`}
                  key={columnKey}
                  style={{ width: getSharedColumnWidth(columnKey) } as CSSProperties}
                />
              ))}
            </colgroup>
            <thead>
              <tr>
                {visibleTableColumns.map((columnKey, index) => (
                  <TableHeaderCell
                    key={columnKey}
                    columnKey={columnKey}
                    columnIndex={index}
                    dropIndex={columnDrag?.dropIndex ?? null}
                    isDragging={draggedColumn === columnKey}
                    isDropped={droppedColumn === columnKey}
                    shiftDirection={getSharedColumnShiftDirection(columnKey)}
                    setHeaderRef={(element) => {
                      if (element) {
                        headerRefs.current[columnKey] = element;
                        return;
                      }

                      delete headerRefs.current[columnKey];
                    }}
                    onPointerDown={handleColumnPointerDown}
                    onContextMenu={handleColumnContextMenu}
                  />
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredProjects.map((project) => (
                <ProjectRow
                  key={project.id}
                  project={project}
                  fileLocations={fileLocationsByProjectId[project.id] ?? []}
                  hasLoadedRole={hasLoadedRole}
                  selectedRole={selectedRole}
                  costSummary={projectCostSummaries[project.id]}
                  tags={projectTags[project.id] ?? []}
                  tagOptions={tagOptions}
                  tagClasses={tagClasses}
                  isTagMenuOpen={openTagProjectId === project.id}
                  onToggleTagMenu={() =>
                    setOpenTagProjectId((current) => (current === project.id ? null : project.id))
                  }
                  onAddTag={(tag) => addProjectTag(project.id, tag)}
                  onRemoveTag={(tag) => removeProjectTag(project.id, tag)}
                  onCreateTag={(tag, tagClass) => createProjectTag(project.id, tag, tagClass)}
                  deadline={projectDeadlines[project.id]}
                  isDeadlineOpen={openDeadlineProjectId === project.id}
                  onToggleDeadline={() =>
                    setOpenDeadlineProjectId((current) => (current === project.id ? null : project.id))
                  }
                  onSaveDeadline={(deadline) => saveProjectDeadline(project.id, deadline)}
                  visibleColumns={visibleDataColumns}
                  visibleTableColumns={visibleTableColumns}
                  columnDrag={columnDrag}
                  draggedColumn={draggedColumn}
                  droppedColumn={droppedColumn}
                  isSelected={isProjectPanelOpen && panelProjectId === project.id}
                  onOpenProject={() => {
                    const projectFlowHref = getProjectFlowHref(project.id);
                    if (projectFlowHref) router.push(projectFlowHref);
                    else openProjectPanel(project.id);
                  }}
                  onOpenDetails={() => openProjectPanel(project.id)}
                  onOpenLatestActions={() => openProjectPanel(project.id, "push", true)}
                />
              ))}
            </tbody>
          </table>
          {filteredProjects.length === 0 ? (
            projects.length === 0 ? (
              <div className="active-videos-empty is-first-video">
                <span className="active-videos-empty-icon" aria-hidden="true"><DsIcon name="video-camera-ds" size={28} /></span>
                <h2 className="headings-xs-bold">
                  {selectedRole === "Studio Freelancer" ? "No invited videos yet" : "No videos yet"}
                </h2>
                <p className="paragraph-s">
                  {selectedRole === "Studio Freelancer"
                    ? "Videos will appear here when a Studio adds you to the team."
                    : selectedRole === "Customer"
                      ? "Videos shared by your Studio will appear in your Client dashboard."
                      : "Add a Client, then start their first video."}
                </p>
                <div className="active-videos-empty-actions">
                  <Link className="active-videos-empty-primary label-s-semibold" href={selectedRole === "Studio Freelancer" ? "/chat" : selectedRole === "Customer" ? "/customer-dashboard" : "/clients"}>
                    {selectedRole === "Studio Freelancer" ? "Open Chat" : selectedRole === "Customer" ? "Back to dashboard" : "Add Client"}
                  </Link>
                </div>
              </div>
            ) : (
              <div className="active-videos-empty is-filtered">
                <span className="active-videos-empty-icon" aria-hidden="true"><DsIcon name="search" size={28} /></span>
                <h2 className="headings-xs-bold">No videos match these controls</h2>
                <p className="paragraph-s">Try another search, status or production-stage filter.</p>
                <button className="active-videos-empty-secondary label-s-semibold" type="button" onClick={clearControls}>Clear controls</button>
              </div>
            )
          ) : null}
        </div>
      </section>
      {dropIndicatorStyle ? <span className="column-drop-indicator" style={dropIndicatorStyle} aria-hidden="true" /> : null}
      {columnDrag?.isDragging ? <ColumnDragGhost state={columnDrag} label={columnConfig[columnDrag.columnKey].label} /> : null}
      {settlingGhost ? <ColumnSettlingGhost state={settlingGhost} /> : null}
      {columnContextMenu ? (
        <ColumnHeaderMenu
          state={columnContextMenu}
          columnOrder={columnOrder}
          hiddenColumns={hiddenColumns}
          onMoveLeft={(columnKey) => moveColumnByStep(columnKey, -1)}
          onMoveRight={(columnKey) => moveColumnByStep(columnKey, 1)}
          onPin={pinColumn}
          onHide={hideColumn}
          onClose={() => setColumnContextMenu(null)}
        />
      ) : null}
      {panelProject ? (
        <ProjectDetailPanel
          project={panelProject}
          tags={projectTags[panelProject.id] ?? []}
          tagClasses={tagClasses}
          deadline={projectDeadlines[panelProject.id]}
          isOpen={isProjectPanelOpen}
          isSwitching={isPanelContentSwitching}
          selectedRole={selectedRole}
          latestActionsOpenRequest={
            latestActionsOpenRequest?.projectId === panelProject.id
              ? latestActionsOpenRequest.requestId
              : null
          }
          onClose={() => closeProjectPanel()}
          onSaveDeadline={(deadline) => saveProjectDeadline(panelProject.id, deadline)}
        />
      ) : null}
      </div>
    </main>
  );
}

function TableHeaderCell({
  columnKey,
  columnIndex,
  dropIndex,
  isDragging,
  isDropped,
  shiftDirection,
  setHeaderRef,
  onPointerDown,
  onContextMenu,
}: {
  columnKey: TableColumnKey;
  columnIndex: number;
  dropIndex: number | null;
  isDragging: boolean;
  isDropped: boolean;
  shiftDirection: "left" | "right" | null;
  setHeaderRef: (element: HTMLTableCellElement | null) => void;
  onPointerDown: (event: ReactPointerEvent<HTMLTableCellElement>, columnKey: DataColumnKey) => void;
  onContextMenu: (event: ReactMouseEvent<HTMLTableCellElement>, columnKey: DataColumnKey) => void;
}) {
  const showsDropBefore = dropIndex === columnIndex && columnKey !== "project";
  const showsDropAfter = dropIndex === columnIndex + 1 && columnKey !== "project";

  if (columnKey === "project") {
    return (
      <th
        className={`column-project ${showsDropAfter ? "has-drop-indicator-after" : ""}`}
        scope="col"
        ref={setHeaderRef}
      >
        <span className="table-heading label-s-semibold">
          Project
          <DsIcon name="caret-down" size={12} />
        </span>
      </th>
    );
  }

  const headerClassName = [
    `column-${columnKey}`,
    "draggable-column-header",
    isDragging ? "column-is-dragging" : "",
    isDropped ? "column-was-dropped" : "",
    shiftDirection ? `column-shift-${shiftDirection}` : "",
    showsDropBefore ? "has-drop-indicator-before" : "",
    showsDropAfter ? "has-drop-indicator-after" : "",
  ]
    .filter(Boolean)
    .join(" ");

  if (columnKey === "status") {
    return (
      <th
        className={headerClassName}
        scope="col"
        ref={setHeaderRef}
        onPointerDown={(event) => onPointerDown(event, columnKey)}
        onContextMenu={(event) => onContextMenu(event, columnKey)}
      >
        <span className="table-heading label-s-semibold">
          Status
          <DsIcon name="caret-down" size={12} />
        </span>
      </th>
    );
  }

  if (columnKey === "actions") {
    return (
      <th
        className={`column-${columnKey} column-actions-fixed ${isDropped ? "column-was-dropped" : ""}`}
        scope="col"
        ref={setHeaderRef}
      >
        <span className="sr-only">Actions</span>
      </th>
    );
  }

  return (
    <th
      className={headerClassName}
      scope="col"
      ref={setHeaderRef}
      onPointerDown={(event) => onPointerDown(event, columnKey)}
      onContextMenu={(event) => onContextMenu(event, columnKey)}
    >
      {columnConfig[columnKey].label}
    </th>
  );
}

function ColumnDragGhost({ state, label }: { state: ColumnDragState; label: string }) {
  const left = state.originLeft + state.currentX - state.startX;

  return (
    <div
      className="column-drag-ghost label-s-semibold"
      style={
        {
          left,
          top: state.originTop,
          width: state.originWidth,
          height: state.originHeight,
        } as CSSProperties
      }
    >
      {label}
    </div>
  );
}

function ColumnSettlingGhost({ state }: { state: ColumnSettlingGhostState }) {
  return (
    <div
      className="column-drag-ghost column-drag-ghost-settling label-s-semibold"
      style={
        {
          "--ghost-start-x": `${state.startLeft - state.endLeft}px`,
          left: state.endLeft,
          top: state.top,
          width: state.width,
          height: state.height,
        } as CSSProperties
      }
    >
      {state.label}
    </div>
  );
}

function FilterDropdown({
  filterKey,
  label,
  value,
  options,
  tagClasses,
  isOpen,
  onToggle,
  onSelect,
}: {
  filterKey: FilterKey;
  label: string;
  value: string | string[] | null;
  options: string[];
  tagClasses: Record<string, TagClass>;
  isOpen: boolean;
  onToggle: () => void;
  onSelect: (value: string | null) => void;
}) {
  const selectedValues = Array.isArray(value) ? value : value ? [value] : [];
  const hasValue = selectedValues.length > 0;
  const buttonLabel =
    filterKey === "tags" && selectedValues.length > 1 ? `${selectedValues.length} tags` : selectedValues[0] ?? label;

  return (
    <div className="active-filter-wrap">
      <button
        className={`active-filter-button label-s-semibold ${hasValue ? "has-value" : ""}`}
        type="button"
        aria-expanded={isOpen}
        onClick={onToggle}
      >
        <span>{buttonLabel}</span>
        <DsIcon name="caret-down" size={14} />
      </button>
      {isOpen ? (
        <div className={`active-filter-menu active-filter-menu-${filterKey}`}>
          {options.map((option) => {
            const isSelected = selectedValues.includes(option);

            return (
              <button
                className="active-filter-option label-s"
                type="button"
                key={option}
                aria-pressed={filterKey === "tags" ? isSelected : undefined}
                onClick={() => onSelect(option)}
              >
                <span className={`filter-checkbox ${isSelected ? "checked" : ""}`}>
                  {isSelected ? <DsIcon name="check" size={12} /> : null}
                </span>
                <span className={filterKey === "tags" ? `tag-option ${getTagClass(option, tagClasses)}` : ""}>
                  {option}
                </span>
              </button>
            );
          })}
          {hasValue ? (
            <button className="active-filter-clear label-s-semibold" type="button" onClick={() => onSelect(null)}>
              Clear filter
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function ColumnHeaderMenu({
  state,
  columnOrder,
  hiddenColumns,
  onMoveLeft,
  onMoveRight,
  onPin,
  onHide,
  onClose,
}: {
  state: ColumnContextMenuState;
  columnOrder: DataColumnKey[];
  hiddenColumns: DataColumnKey[];
  onMoveLeft: (columnKey: DataColumnKey) => void;
  onMoveRight: (columnKey: DataColumnKey) => void;
  onPin: (columnKey: DataColumnKey) => void;
  onHide: (columnKey: DataColumnKey) => void;
  onClose: () => void;
}) {
  const visibleColumnOrder = columnOrder.filter((columnKey) => !hiddenColumns.includes(columnKey));
  const columnIndex = visibleColumnOrder.indexOf(state.columnKey);
  const canMoveLeft = columnIndex > 0;
  const canMoveRight = columnIndex >= 0 && columnIndex < visibleColumnOrder.length - 1;

  useEffect(() => {
    const closeMenu = () => onClose();

    window.addEventListener("click", closeMenu);
    window.addEventListener("keydown", closeMenu);

    return () => {
      window.removeEventListener("click", closeMenu);
      window.removeEventListener("keydown", closeMenu);
    };
  }, [onClose]);

  return (
    <div
      className="column-header-menu"
      style={{ left: state.x, top: state.y } as CSSProperties}
      onClick={(event) => event.stopPropagation()}
    >
      <button
        className="label-s-semibold"
        type="button"
        disabled={!canMoveLeft}
        onClick={() => {
          onMoveLeft(state.columnKey);
          onClose();
        }}
      >
        Move left
      </button>
      <button
        className="label-s-semibold"
        type="button"
        disabled={!canMoveRight}
        onClick={() => {
          onMoveRight(state.columnKey);
          onClose();
        }}
      >
        Move right
      </button>
      <button
        className="label-s-semibold"
        type="button"
        onClick={() => {
          onPin(state.columnKey);
          onClose();
        }}
      >
        Pin column
      </button>
      <button
        className="label-s-semibold"
        type="button"
        onClick={() => {
          onHide(state.columnKey);
          onClose();
        }}
      >
        Hide column
      </button>
    </div>
  );
}

function ColumnVisibilityMenu({
  availableColumns,
  isOpen,
  hiddenColumns,
  visibleColumnCount,
  onToggleOpen,
  onToggleColumn,
  onReset,
}: {
  availableColumns: readonly DataColumnKey[];
  isOpen: boolean;
  hiddenColumns: DataColumnKey[];
  visibleColumnCount: number;
  onToggleOpen: () => void;
  onToggleColumn: (columnKey: DataColumnKey) => void;
  onReset: () => void;
}) {
  return (
    <div className="active-columns-wrap">
      <button
        className="active-columns-button label-s-semibold"
        type="button"
        aria-expanded={isOpen}
        onClick={onToggleOpen}
      >
        <DsIcon name="columns" size={14} />
        <span>Columns</span>
        <DsIcon name="caret-down" size={14} />
      </button>
      {isOpen ? (
        <div className="active-columns-menu">
          <div className="active-columns-option is-locked label-s">
            <span className="filter-checkbox checked">
              <DsIcon name="check" size={12} />
            </span>
            <span>Project</span>
            <span className="active-columns-lock label-xs">Locked</span>
          </div>
          {availableColumns.map((columnKey) => {
            const isHidden = hiddenColumns.includes(columnKey);
            const isLastVisible = !isHidden && visibleColumnCount <= 1;
            const isFixedEndColumn = columnKey === fixedEndColumn;

            return (
              <button
                className={`active-columns-option label-s ${isFixedEndColumn ? "is-locked" : ""}`}
                type="button"
                key={columnKey}
                disabled={isLastVisible || isFixedEndColumn}
                onClick={() => onToggleColumn(columnKey)}
              >
                <span className={`filter-checkbox ${isHidden && !isFixedEndColumn ? "" : "checked"}`}>
                  {isHidden && !isFixedEndColumn ? null : <DsIcon name="check" size={12} />}
                </span>
                <span>{columnConfig[columnKey].label}</span>
                {isFixedEndColumn ? <span className="active-columns-lock label-xs">Fixed</span> : null}
              </button>
            );
          })}
          <button
            className="active-columns-reset label-s-semibold"
            type="button"
            onClick={() => {
              onReset();
              onToggleOpen();
            }}
          >
            Reset columns
          </button>
        </div>
      ) : null}
    </div>
  );
}

export function ProjectDetailsSidebar({
  project,
  isOpen,
  onClose,
}: {
  project: Project;
  isOpen: boolean;
  onClose: () => void;
}) {
  const { selectedRole } = usePrototypeRole();
  const [deadline, setDeadline] = useState<ProjectDeadline | undefined>(project.deadline);

  useEffect(() => {
    setDeadline(project.deadline);
  }, [project.deadline, project.id]);

  return (
    <ProjectDetailPanel
      project={project}
      tags={project.tags ?? []}
      tagClasses={defaultTagClasses}
      deadline={deadline}
      isOpen={isOpen}
      isSwitching={false}
      selectedRole={selectedRole}
      latestActionsOpenRequest={null}
      onClose={onClose}
      onSaveDeadline={setDeadline}
    />
  );
}

function ProjectDetailPanel({
  project,
  tags,
  tagClasses,
  deadline,
  isOpen,
  isSwitching,
  selectedRole,
  latestActionsOpenRequest,
  onClose,
  onSaveDeadline,
}: {
  project: Project;
  tags: string[];
  tagClasses: Record<string, TagClass>;
  deadline: ProjectDeadline | undefined;
  isOpen: boolean;
  isSwitching: boolean;
  selectedRole: PrototypeRole;
  latestActionsOpenRequest: number | null;
  onClose: () => void;
  onSaveDeadline: (deadline: ProjectDeadline | undefined) => void;
}) {
  const projectFlowHref = getProjectFlowHref(project.id);
  const unreadMessages = project.unreadMessages ?? 0;
  const [panelStatus, setPanelStatus] = useState<Project["status"]>(project.status);
  const [isStatusMenuOpen, setIsStatusMenuOpen] = useState(false);
  const [hasCopiedLink, setHasCopiedLink] = useState(false);
  const [notes, setNotes] = useState<string[]>([]);
  const [draftNote, setDraftNote] = useState("");
  const [isTimeSpentOpen, setIsTimeSpentOpen] = useState(false);
  const clientContact = getClientContact(project);
  const tagsKey = tags.join("\u0001");
  const loggedHours = getProjectLoggedHours(project.team, project.timeEntries);
  const estimatedHours = getProjectEstimatedHours(project.team);
  const timeEntries = getProjectTimeEntries(project);
  const teamAccess = getTeamPanelAccess(selectedRole);
  const staffViewerPersonId = getFirstTeamPersonForType(project.team, "Studio Staff")?.id;
  const freelancerViewerPersonId = getFirstTeamPersonForType(project.team, "Studio Freelancer")?.id;
  const [editingSection, setEditingSection] = useState<ProjectPanelEditSection | null>(null);
  const [panelEstimatedHours, setPanelEstimatedHours] = useState(estimatedHours);
  const [draftEstimatedHours, setDraftEstimatedHours] = useState(String(estimatedHours));
  const [panelClientName, setPanelClientName] = useState(clientContact.name);
  const [panelClientRole, setPanelClientRole] = useState(clientContact.role);
  const [panelClientEmail, setPanelClientEmail] = useState(clientContact.email);
  const [draftClientName, setDraftClientName] = useState(clientContact.name);
  const [draftClientRole, setDraftClientRole] = useState(clientContact.role);
  const [draftClientEmail, setDraftClientEmail] = useState(clientContact.email);
  const [panelTags, setPanelTags] = useState(tags);
  const [draftPanelTag, setDraftPanelTag] = useState("");

  useEffect(() => {
    setPanelStatus(project.status);
    setIsStatusMenuOpen(false);
    setHasCopiedLink(false);
    setIsTimeSpentOpen(false);
    setNotes([]);
    setDraftNote("");
    setEditingSection(null);
    setPanelEstimatedHours(estimatedHours);
    setDraftEstimatedHours(String(estimatedHours));
    setPanelClientName(clientContact.name);
    setPanelClientRole(clientContact.role);
    setPanelClientEmail(clientContact.email);
    setDraftClientName(clientContact.name);
    setDraftClientRole(clientContact.role);
    setDraftClientEmail(clientContact.email);
    setPanelTags(tags);
    setDraftPanelTag("");
  }, [
    clientContact.email,
    clientContact.name,
    clientContact.role,
    estimatedHours,
    project.id,
    project.status,
    tagsKey,
  ]);

  const copyProjectLink = () => {
    if (!projectFlowHref) return;

    if (typeof window !== "undefined" && navigator.clipboard) {
      void navigator.clipboard.writeText(`${window.location.origin}${projectFlowHref}`);
    }
    setHasCopiedLink(true);
    window.setTimeout(() => setHasCopiedLink(false), 1400);
  };

  const addNote = () => {
    const trimmedNote = draftNote.trim();

    if (!trimmedNote) {
      return;
    }

    setNotes((currentNotes) => [trimmedNote, ...currentNotes]);
    setDraftNote("");
  };

  const cancelPanelEdit = () => {
    setEditingSection(null);
    setDraftEstimatedHours(String(panelEstimatedHours || ""));
    setDraftClientName(panelClientName);
    setDraftClientRole(panelClientRole);
    setDraftClientEmail(panelClientEmail);
    setDraftPanelTag("");
    setDraftNote("");
  };

  const saveHoursEdit = () => {
    const nextEstimatedHours = Number.parseInt(draftEstimatedHours, 10);

    setPanelEstimatedHours(Number.isFinite(nextEstimatedHours) && nextEstimatedHours > 0 ? nextEstimatedHours : 0);
    setEditingSection(null);
  };

  const saveClientEdit = () => {
    setPanelClientName(draftClientName.trim() || panelClientName);
    setPanelClientRole(draftClientRole.trim() || panelClientRole);
    setPanelClientEmail(draftClientEmail.trim() || panelClientEmail);
    setEditingSection(null);
  };

  const saveTagsEdit = () => {
    const nextTag = draftPanelTag.trim();

    if (nextTag && !panelTags.includes(nextTag)) {
      setPanelTags((currentTags) => [...currentTags, nextTag]);
    }

    setDraftPanelTag("");
    setEditingSection(null);
  };

  const saveNotesEdit = () => {
    addNote();
    setEditingSection(null);
  };

  const handleInlineEditKeyDown = (event: ReactKeyboardEvent<HTMLInputElement | HTMLTextAreaElement>, onSave: () => void) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      onSave();
    }

    if (event.key === "Escape") {
      event.preventDefault();
      cancelPanelEdit();
    }
  };

  useEffect(() => {
    if (!isTimeSpentOpen) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsTimeSpentOpen(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isTimeSpentOpen]);

  return (
    <aside
      className={`project-detail-panel ${isOpen ? "open" : ""}`}
      aria-label={`${project.name} project details`}
      aria-hidden={!isOpen}
    >
      <div className="project-detail-panel-header">
        <div className="project-detail-heading">
          <span className="project-detail-inline-client-tag label-xs-semibold">{project.clientBadge}</span>
          <h2 className="project-detail-title heading-3xs">{project.name}</h2>
          <div className="project-detail-status-row">
            <div className="project-panel-status-wrap">
              <button
                className={`status-pill status-${panelStatus.toLowerCase().replace(/\s+/g, "-")} project-detail-status-trigger label-s-semibold`}
                type="button"
                aria-expanded={isStatusMenuOpen}
                onClick={() => setIsStatusMenuOpen((currentValue) => !currentValue)}
              >
                {getStatusLabel(panelStatus)}
              </button>
              {isStatusMenuOpen ? (
                <div className="project-detail-status-menu" role="menu" aria-label="Change project status">
                  {statusTabs
                    .filter((status): status is Project["status"] => status !== "All")
                    .map((status) => (
                      <button
                        className={`project-detail-status-menu-item label-s-semibold ${panelStatus === status ? "selected" : ""}`}
                        type="button"
                        role="menuitem"
                        key={status}
                        onClick={() => {
                          setPanelStatus(status);
                          setIsStatusMenuOpen(false);
                        }}
                      >
                        <span className={`status-pill status-${status.toLowerCase().replace(/\s+/g, "-")} label-s-semibold`}>
                          {getStatusLabel(status)}
                        </span>
                      </button>
                    ))}
                </div>
              ) : null}
            </div>
          </div>
        </div>
        <button className="project-detail-close" type="button" aria-label="Close project details" onClick={onClose}>
          <DsIcon name="x-close-cross" size={16} />
        </button>
      </div>

      <div className={`project-detail-panel-body ${isSwitching ? "switching" : ""}`}>
        <section className="project-detail-section">
          <div className="project-detail-actions">
            {projectFlowHref ? (
              <a className="project-detail-action-button project-detail-action-primary label-s-semibold" href={projectFlowHref}>
                Open full project
              </a>
            ) : (
              <span className="project-detail-action-button project-detail-action-primary is-disabled label-s-semibold" aria-disabled="true">
                Demo not available
              </span>
            )}
            <a className="project-detail-action-button label-s-semibold" href={`/chat?project=${encodeURIComponent(project.id)}`}>
              <span className="project-detail-action-icon">
                <DsIcon name="chats" size={20} />
                <CommentCountBadge count={unreadMessages} label={`${unreadMessages} unread messages`} />
              </span>
              Open chat
            </a>
            <span className="project-detail-action-button is-disabled label-s-semibold" aria-disabled="true" title="Demo not available">
              <span className="project-detail-action-icon">
                <DsIcon name="queue" size={20} />
              </span>
              Client queue
            </span>
          </div>
        </section>

        <section className="project-detail-section">
          <div className="project-detail-section-heading">
            <h3 className="project-detail-section-title label-s-semibold">Project flow</h3>
            <ProjectFlowAdjuster project={project} />
          </div>
          <div className="project-panel-progress-track">
            <StageProgress
              projectId={project.id}
              projectName={project.name}
              stages={project.stages}
              studioName="North Star Films"
              customerName={project.clientName}
              videoType={project.videoType}
            />
          </div>
        </section>

        <section className="project-detail-section">
          <ProjectDetailEditableHeader title="Hours" onEdit={() => setEditingSection("hours")} />
          <div className="project-detail-metric">
            <button
              className="project-detail-hours-total heading-3xs"
              type="button"
              aria-haspopup="dialog"
              aria-expanded={isTimeSpentOpen}
              onClick={() => setIsTimeSpentOpen(true)}
            >
              {loggedHours}h
            </button>
            {editingSection === "hours" ? (
              <div className="project-detail-edit-stack">
                <label className="project-detail-field-label label-xs-semibold" htmlFor={`project-hours-estimate-${project.id}`}>
                  Budgeted hours
                </label>
                <input
                  className="project-detail-inline-input label-s"
                  id={`project-hours-estimate-${project.id}`}
                  inputMode="numeric"
                  min="0"
                  type="number"
                  value={draftEstimatedHours}
                  onChange={(event) => setDraftEstimatedHours(event.target.value)}
                  onKeyDown={(event) => handleInlineEditKeyDown(event, saveHoursEdit)}
                />
                <ProjectDetailInlineActions onCancel={cancelPanelEdit} onSave={saveHoursEdit} />
              </div>
            ) : (
              <>
                <span className="label-s">logged of {panelEstimatedHours || 0}h estimated</span>
                <Link className="project-detail-text-link label-s-semibold" href="/today">
                  Log hours
                </Link>
              </>
            )}
          </div>
        </section>

        <TeamPanel
          projectId={project.id}
          projectName={project.name}
          videoType={project.videoType}
          videoLengthSeconds={project.videoLengthSeconds}
          initialTeam={project.team}
          timeEntries={project.timeEntries}
          access={teamAccess}
          viewerPersonId={selectedRole === "Studio Freelancer" ? freelancerViewerPersonId : selectedRole === "Studio Staff" ? staffViewerPersonId : undefined}
        />

        <section className="project-detail-section">
          <ProjectDetailEditableHeader title="Deadline" onEdit={() => setEditingSection("deadline")} />
          <ProjectPanelDeadline
            project={project}
            deadline={deadline}
            isEditing={editingSection === "deadline"}
            onCancel={cancelPanelEdit}
            onDone={() => setEditingSection(null)}
            onSave={onSaveDeadline}
          />
        </section>

        <ProjectDetailCollapsibleSection
          title="Latest actions"
          openRequest={latestActionsOpenRequest}
          resetKey={project.id}
        >
          <ProjectLatestActionsList
            projectId={project.id}
            role={selectedRole}
            freelancerHasProjectAccess={freelancerViewerPersonId !== undefined}
          />
        </ProjectDetailCollapsibleSection>

        <ProjectDetailCollapsibleSection title="Client" onEdit={() => setEditingSection("client")}>
          {editingSection === "client" ? (
            <div className="project-detail-edit-stack">
              <ProjectDetailInlineField
                id={`project-client-name-${project.id}`}
                label="Name"
                value={draftClientName}
                onChange={setDraftClientName}
                onKeyDown={(event) => handleInlineEditKeyDown(event, saveClientEdit)}
              />
              <ProjectDetailInlineField
                id={`project-client-role-${project.id}`}
                label="Role"
                value={draftClientRole}
                onChange={setDraftClientRole}
                onKeyDown={(event) => handleInlineEditKeyDown(event, saveClientEdit)}
              />
              <ProjectDetailInlineField
                id={`project-client-email-${project.id}`}
                label="Email"
                value={draftClientEmail}
                onChange={setDraftClientEmail}
                onKeyDown={(event) => handleInlineEditKeyDown(event, saveClientEdit)}
              />
              <ProjectDetailInlineActions onCancel={cancelPanelEdit} onSave={saveClientEdit} />
            </div>
          ) : (
            <div className="project-detail-client-card">
              <div className="project-detail-client-contact">
                <span className="project-detail-client-name label-s-semibold">{panelClientName}</span>
                <span className="project-detail-client-role label-xs">{panelClientRole}</span>
              </div>
              <a className="project-detail-client-link label-s-semibold" href={`mailto:${panelClientEmail}`}>
                {panelClientEmail}
              </a>
              <span className="project-detail-client-link is-disabled label-s-semibold" aria-disabled="true" title="Demo not available">
                Open client portal
              </span>
              <span className="project-detail-client-meta label-xs">
                Last contact {formatWorkingAge(clientContact.lastContactAt, latestUpdateReferenceDate)}
              </span>
            </div>
          )}
        </ProjectDetailCollapsibleSection>

        <ProjectDetailCollapsibleSection title="Tags" onEdit={() => setEditingSection("tags")}>
          <div className="project-detail-tags">
            {panelTags.length > 0 ? (
              panelTags.map((tag) => (
                <span className={`project-tag-chip tag-option ${getTagClass(tag, tagClasses)} label-s-semibold`} key={tag}>
                  {tag}
                </span>
              ))
            ) : (
              <span className="label-s">No tags yet.</span>
            )}
          </div>
          {editingSection === "tags" ? (
            <div className="project-detail-edit-stack">
              <ProjectDetailInlineField
                id={`project-panel-tag-${project.id}`}
                label="New tag"
                value={draftPanelTag}
                onChange={setDraftPanelTag}
                onKeyDown={(event) => handleInlineEditKeyDown(event, saveTagsEdit)}
              />
              <ProjectDetailInlineActions onCancel={cancelPanelEdit} onSave={saveTagsEdit} />
            </div>
          ) : null}
        </ProjectDetailCollapsibleSection>

        <ProjectDetailCollapsibleSection title="Notes" onEdit={() => setEditingSection("notes")}>
          <div className="project-detail-notes-panel">
            {notes.length > 0 ? (
              <div className="project-detail-notes-list">
                {notes.map((note, index) => (
                  <p className="project-detail-note label-s" key={`${project.id}-note-${index}`}>
                    {note}
                  </p>
                ))}
              </div>
            ) : (
              <div className="project-detail-notes label-s">No notes yet.</div>
            )}
            {editingSection === "notes" ? (
              <>
                <label className="sr-only" htmlFor={`project-note-${project.id}`}>
                  Add a note
                </label>
                <textarea
                  className="project-detail-note-input label-s"
                  id={`project-note-${project.id}`}
                  placeholder="Add a note..."
                  value={draftNote}
                  onChange={(event) => setDraftNote(event.target.value)}
                  onKeyDown={(event) => handleInlineEditKeyDown(event, saveNotesEdit)}
                />
                <ProjectDetailInlineActions onCancel={cancelPanelEdit} onSave={saveNotesEdit} />
              </>
            ) : null}
          </div>
        </ProjectDetailCollapsibleSection>
      </div>

      <div className="project-detail-panel-footer">
        <button className="project-detail-copy-link label-s-semibold" type="button" disabled={!projectFlowHref} onClick={copyProjectLink}>
          {projectFlowHref ? (hasCopiedLink ? "Copied" : "Copy link") : "Demo not available"}
        </button>
        <button className="project-detail-footer-button label-s-semibold" type="button">
          Mark complete
        </button>
        <button className="project-detail-footer-button label-s-semibold" type="button">
          Archive
        </button>
      </div>

      {isTimeSpentOpen ? (
        <TimeSpentModal
          project={project}
          totalHours={loggedHours}
          entries={timeEntries}
          onClose={() => setIsTimeSpentOpen(false)}
        />
      ) : null}

    </aside>
  );
}

function TimeSpentModal({
  project,
  totalHours,
  entries,
  onClose,
}: {
  project: Project;
  totalHours: number;
  entries: ProjectTimeEntry[];
  onClose: () => void;
}) {
  return (
    <div className="time-spent-modal-backdrop" role="presentation" onClick={onClose}>
      <section
        className="time-spent-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby={`time-spent-title-${project.id}`}
        onClick={(event) => event.stopPropagation()}
      >
        <button className="time-spent-close" type="button" aria-label="Close time spent" onClick={onClose}>
          <DsIcon name="x-close-cross" size={20} />
        </button>
        <div className="time-spent-summary">
          <span className="time-spent-eyebrow label-s-semibold">Time spent</span>
          <strong className="time-spent-total" id={`time-spent-title-${project.id}`}>
            {totalHours}h
          </strong>
        </div>
        <h3 className="time-spent-project heading-3xs">{project.name}</h3>
        <div className="time-spent-list" aria-label={`${project.name} time entries`}>
          {entries.map((entry) => (
            <article className="time-spent-entry" key={entry.id}>
              <div className="time-spent-entry-header">
                <div className="time-spent-entry-person">
                  <strong className="heading-3xs">{entry.person}</strong>
                  <span className="label-s">{entry.dateLabel}</span>
                </div>
                <div className="time-spent-entry-hours">
                  <strong className="heading-3xs">{formatHours(entry.hours)}</strong>
                  <button className="time-spent-entry-edit" type="button" aria-label={`Edit ${entry.person} time entry`}>
                    <DsIcon name="pencil-simple-ds" size={18} />
                  </button>
                </div>
              </div>
              <div className="time-spent-entry-detail label-s">
                <span className="time-spent-stage label-s-semibold">{getStageLabel(entry.stage)}</span>
                {entry.note ? <span>{entry.note}</span> : null}
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}

function ProjectDetailEditableHeader({ title, onEdit }: { title: string; onEdit: () => void }) {
  return (
    <div className="project-detail-section-heading">
      <h3 className="project-detail-section-title label-s-semibold">
        <button className="project-detail-section-title-button label-s-semibold" type="button" onClick={onEdit}>
          {title}
        </button>
      </h3>
    </div>
  );
}

function ProjectDetailInlineActions({ onCancel, onSave }: { onCancel: () => void; onSave: () => void }) {
  return (
    <div className="project-detail-inline-actions">
      <button className="project-detail-inline-cancel label-xs-semibold" type="button" onClick={onCancel}>
        Cancel
      </button>
      <button className="project-detail-inline-save label-xs-semibold" type="button" onClick={onSave}>
        Save
      </button>
    </div>
  );
}

function ProjectDetailInlineField({
  id,
  label,
  value,
  onChange,
  onKeyDown,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  onKeyDown: (event: ReactKeyboardEvent<HTMLInputElement>) => void;
}) {
  return (
    <div className="project-detail-field">
      <label className="project-detail-field-label label-xs-semibold" htmlFor={id}>
        {label}
      </label>
      <input
        className="project-detail-inline-input label-s"
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={onKeyDown}
      />
    </div>
  );
}

function ProjectDetailCollapsibleSection({
  title,
  children,
  onEdit,
  openRequest = null,
  resetKey,
}: {
  title: string;
  children: ReactNode;
  onEdit?: () => void;
  openRequest?: number | null;
  resetKey?: string;
}) {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (resetKey !== undefined) {
      setIsOpen(false);
    }
  }, [resetKey]);

  useEffect(() => {
    if (openRequest !== null) {
      setIsOpen(true);
    }
  }, [openRequest]);

  return (
    <section className={`project-detail-section project-detail-collapsible ${isOpen ? "open" : ""}`}>
      <div className="project-detail-collapsible-header">
        <button
          className="project-detail-collapsible-title-button label-s-semibold"
          type="button"
          onClick={() => {
            if (onEdit) {
              setIsOpen(true);
              onEdit();
              return;
            }

            setIsOpen((currentValue) => !currentValue);
          }}
        >
          {title}
        </button>
        <button
          className="project-detail-collapsible-disclosure"
          type="button"
          aria-label={`${isOpen ? "Collapse" : "Expand"} ${title}`}
          aria-expanded={isOpen}
          onClick={() => setIsOpen((currentValue) => !currentValue)}
        >
          <DsIcon name="caret-down" size={16} />
        </button>
      </div>
      {isOpen ? <div className="project-detail-collapsible-content">{children}</div> : null}
    </section>
  );
}

type DeadlineEditField = "stage" | "final";

function DeadlineReadFirstEditor({
  project,
  deadline,
  onSave,
}: {
  project: Project;
  deadline: ProjectDeadline | undefined;
  onSave: (deadline: ProjectDeadline | undefined) => void;
}) {
  const [editingField, setEditingField] = useState<DeadlineEditField | null>(null);
  const [draftDueAt, setDraftDueAt] = useState("");
  const [draftFinalDueAt, setDraftFinalDueAt] = useState("");
  const stageKey = deadline?.stage ?? inferCurrentStage(project);
  const stageLabel = getStageLabel(stageKey);
  const dueHelper = getDeadlineHelper(deadline?.dueAt);
  const finalHelper = getDeadlineHelper(deadline?.finalDueAt);
  const draftDueHelper = getDeadlineHelper(fromDateTimeInputValue(draftDueAt));
  const draftFinalHelper = getDeadlineHelper(fromDateTimeInputValue(draftFinalDueAt));
  const editingFieldRef = useRef<DeadlineEditField | null>(editingField);
  const draftDueAtRef = useRef(draftDueAt);
  const draftFinalDueAtRef = useRef(draftFinalDueAt);
  const onSaveRef = useRef(onSave);

  const buildDeadline = (dueDraft: string, finalDraft: string): ProjectDeadline | undefined => {
    const dueAt = fromDateTimeInputValue(dueDraft);
    const finalDueAt = fromDateTimeInputValue(finalDraft);

    if (!dueAt && !finalDueAt) {
      return undefined;
    }

    return {
      stage: dueAt ? stageKey : undefined,
      dueAt,
      timerStartedAt: dueAt ? deadline?.timerStartedAt ?? deadlineReferenceDate.toISOString() : undefined,
      finalDueAt,
    };
  };

  useEffect(() => {
    const nextDueAt = toDateTimeInputValue(deadline?.dueAt);
    const nextFinalDueAt = toDateTimeInputValue(deadline?.finalDueAt);

    setDraftDueAt(nextDueAt);
    setDraftFinalDueAt(nextFinalDueAt);
    draftDueAtRef.current = nextDueAt;
    draftFinalDueAtRef.current = nextFinalDueAt;
    setEditingField(null);
    editingFieldRef.current = null;
  }, [deadline?.dueAt, deadline?.finalDueAt, project.id]);

  useEffect(() => {
    editingFieldRef.current = editingField;
    draftDueAtRef.current = draftDueAt;
    draftFinalDueAtRef.current = draftFinalDueAt;
    onSaveRef.current = onSave;
  }, [draftDueAt, draftFinalDueAt, editingField, onSave]);

  useEffect(() => {
    return () => {
      if (!editingFieldRef.current) {
        return;
      }

      onSaveRef.current(buildDeadline(draftDueAtRef.current, draftFinalDueAtRef.current));
    };
  }, []);

  const saveDeadline = () => {
    onSave(buildDeadline(draftDueAt, draftFinalDueAt));
    editingFieldRef.current = null;
    setEditingField(null);
  };

  const cancelEdit = () => {
    const nextDueAt = toDateTimeInputValue(deadline?.dueAt);
    const nextFinalDueAt = toDateTimeInputValue(deadline?.finalDueAt);

    setDraftDueAt(nextDueAt);
    setDraftFinalDueAt(nextFinalDueAt);
    draftDueAtRef.current = nextDueAt;
    draftFinalDueAtRef.current = nextFinalDueAt;
    editingFieldRef.current = null;
    setEditingField(null);
  };

  const handleInputKeyDown = (event: ReactKeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      event.preventDefault();
      saveDeadline();
    }

    if (event.key === "Tab") {
      saveDeadline();
    }

    if (event.key === "Escape") {
      event.preventDefault();
      cancelEdit();
    }
  };

  return (
    <div className="deadline-read-list">
      <DeadlineReadFirstRow
        field="stage"
        label="Stage deadline"
        value={deadline?.dueAt ? formatDeadlineReadDate(deadline.dueAt, "stage") : "To be set"}
        helper={dueHelper}
        draftValue={draftDueAt}
        inputType="datetime-local"
        isEditing={editingField === "stage"}
        onChange={(value) => setDraftDueAt(value)}
        onEdit={() => setEditingField("stage")}
        onSave={saveDeadline}
        onCancel={cancelEdit}
        onKeyDown={handleInputKeyDown}
        draftHelper={draftDueHelper}
      />
      <DeadlineReadFirstRow
        field="final"
        label="Final delivery"
        value={deadline?.finalDueAt ? formatDeadlineReadDate(deadline.finalDueAt, "final") : "To be set"}
        helper={finalHelper}
        draftValue={draftFinalDueAt}
        inputType="datetime-local"
        isEditing={editingField === "final"}
        onChange={(value) => setDraftFinalDueAt(value)}
        onEdit={() => setEditingField("final")}
        onSave={saveDeadline}
        onCancel={cancelEdit}
        onKeyDown={handleInputKeyDown}
        draftHelper={draftFinalHelper}
      />
      <span className="sr-only">{stageLabel}</span>
    </div>
  );
}

function DeadlineReadFirstRow({
  field,
  label,
  value,
  helper,
  draftValue,
  inputType,
  isEditing,
  onChange,
  onEdit,
  onSave,
  onCancel,
  onKeyDown,
  draftHelper,
}: {
  field: DeadlineEditField;
  label: string;
  value: string;
  helper: { label: string; categoryClass: string } | null;
  draftValue: string;
  inputType: "datetime-local";
  isEditing: boolean;
  onChange: (value: string) => void;
  onEdit: () => void;
  onSave: () => void;
  onCancel: () => void;
  onKeyDown: (event: ReactKeyboardEvent<HTMLInputElement>) => void;
  draftHelper?: { label: string; categoryClass: string } | null;
}) {
  const helperToShow = isEditing ? draftHelper ?? helper : helper;

  return (
    <div className={`deadline-read-row-v2 ${isEditing ? "editing" : ""}`}>
      <div className="deadline-read-copy">
        <span className="deadline-read-label label-xs-semibold">{label}</span>
        {isEditing ? (
          <input
            className="deadline-inline-input label-s"
            type={inputType}
            value={draftValue}
            aria-label={label}
            onChange={(event) => onChange(event.target.value)}
            onKeyDown={onKeyDown}
          />
        ) : (
          <span className="deadline-read-date label-s-semibold">{value}</span>
        )}
        {helperToShow ? (
          <span className={`deadline-helper deadline-text-${helperToShow.categoryClass} label-xs-semibold`}>{helperToShow.label}</span>
        ) : null}
      </div>
      {isEditing ? (
        <div className="deadline-inline-actions">
          <button className="deadline-inline-cancel label-xs-semibold" type="button" onClick={onCancel}>
            Cancel
          </button>
          <button className="deadline-inline-save label-xs-semibold" type="button" onClick={onSave}>
            Save
          </button>
        </div>
      ) : (
        <button className="deadline-edit-link label-xs-semibold" type="button" onClick={onEdit}>
          Edit
        </button>
      )}
      <span className="sr-only">{field}</span>
    </div>
  );
}

function ProjectPanelDeadline({
  project,
  deadline,
  isEditing,
  onCancel,
  onDone,
  onSave,
}: {
  project: Project;
  deadline: ProjectDeadline | undefined;
  isEditing: boolean;
  onCancel: () => void;
  onDone: () => void;
  onSave: (deadline: ProjectDeadline | undefined) => void;
}) {
  const stageKey = deadline?.stage ?? inferCurrentStage(project);
  const [draftDueAt, setDraftDueAt] = useState("");
  const [draftFinalDueAt, setDraftFinalDueAt] = useState("");
  const dueHelper = getDeadlineHelper(deadline?.dueAt);
  const finalHelper = getDeadlineHelper(deadline?.finalDueAt);
  const draftDueHelper = getDeadlineHelper(fromDateTimeInputValue(draftDueAt));
  const draftFinalHelper = getDeadlineHelper(fromDateTimeInputValue(draftFinalDueAt));

  useEffect(() => {
    setDraftDueAt(toDateTimeInputValue(deadline?.dueAt));
    setDraftFinalDueAt(toDateTimeInputValue(deadline?.finalDueAt));
  }, [deadline?.dueAt, deadline?.finalDueAt, project.id]);

  const buildDeadline = (): ProjectDeadline | undefined => {
    const dueAt = fromDateTimeInputValue(draftDueAt);
    const finalDueAt = fromDateTimeInputValue(draftFinalDueAt);

    if (!dueAt && !finalDueAt) {
      return undefined;
    }

    return {
      stage: dueAt ? stageKey : undefined,
      dueAt,
      timerStartedAt: dueAt ? deadline?.timerStartedAt ?? deadlineReferenceDate.toISOString() : undefined,
      finalDueAt,
    };
  };

  const saveDeadline = () => {
    onSave(buildDeadline());
    onDone();
  };

  const cancelDeadline = () => {
    setDraftDueAt(toDateTimeInputValue(deadline?.dueAt));
    setDraftFinalDueAt(toDateTimeInputValue(deadline?.finalDueAt));
    onCancel();
  };

  const handleDeadlineKeyDown = (event: ReactKeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      event.preventDefault();
      saveDeadline();
    }

    if (event.key === "Escape") {
      event.preventDefault();
      cancelDeadline();
    }
  };

  return (
    <div className="deadline-read-list">
      <div className="deadline-read-row-v2">
        <div className="deadline-read-copy">
          <span className="deadline-read-label label-xs-semibold">Stage deadline</span>
          {isEditing ? (
            <input
              className="deadline-inline-input label-s"
              type="datetime-local"
              value={draftDueAt}
              aria-label="Stage deadline"
              onChange={(event) => setDraftDueAt(event.target.value)}
              onKeyDown={handleDeadlineKeyDown}
            />
          ) : (
            <span className="deadline-read-date label-s-semibold">
              {deadline?.dueAt ? formatDeadlineReadDate(deadline.dueAt, "stage") : "To be set"}
            </span>
          )}
          {(isEditing ? draftDueHelper ?? dueHelper : dueHelper) ? (
            <span className={`deadline-helper deadline-text-${(isEditing ? draftDueHelper ?? dueHelper : dueHelper)?.categoryClass} label-xs-semibold`}>
              {(isEditing ? draftDueHelper ?? dueHelper : dueHelper)?.label}
            </span>
          ) : null}
        </div>
      </div>
      <div className="deadline-read-row-v2">
        <div className="deadline-read-copy">
          <span className="deadline-read-label label-xs-semibold">Final delivery</span>
          {isEditing ? (
            <input
              className="deadline-inline-input label-s"
              type="datetime-local"
              value={draftFinalDueAt}
              aria-label="Final delivery"
              onChange={(event) => setDraftFinalDueAt(event.target.value)}
              onKeyDown={handleDeadlineKeyDown}
            />
          ) : (
            <span className="deadline-read-date label-s-semibold">
              {deadline?.finalDueAt ? formatDeadlineReadDate(deadline.finalDueAt, "final") : "To be set"}
            </span>
          )}
          {(isEditing ? draftFinalHelper ?? finalHelper : finalHelper) ? (
            <span className={`deadline-helper deadline-text-${(isEditing ? draftFinalHelper ?? finalHelper : finalHelper)?.categoryClass} label-xs-semibold`}>
              {(isEditing ? draftFinalHelper ?? finalHelper : finalHelper)?.label}
            </span>
          ) : null}
        </div>
      </div>
      {isEditing ? <ProjectDetailInlineActions onCancel={cancelDeadline} onSave={saveDeadline} /> : null}
    </div>
  );
}

function ProjectRow({
  project,
  fileLocations,
  hasLoadedRole,
  selectedRole,
  costSummary,
  tags,
  tagOptions,
  tagClasses,
  isTagMenuOpen,
  onToggleTagMenu,
  onAddTag,
  onRemoveTag,
  onCreateTag,
  deadline,
  isDeadlineOpen,
  onToggleDeadline,
  onSaveDeadline,
  visibleColumns,
  visibleTableColumns,
  columnDrag,
  draggedColumn,
  droppedColumn,
  isSelected,
  onOpenDetails,
  onOpenLatestActions,
  onOpenProject,
}: {
  project: ScopedProject;
  fileLocations: ProjectFileLocation[];
  hasLoadedRole: boolean;
  selectedRole: PrototypeRole;
  costSummary: ProjectCostSummary;
  tags: string[];
  tagOptions: string[];
  tagClasses: Record<string, TagClass>;
  isTagMenuOpen: boolean;
  onToggleTagMenu: () => void;
  onAddTag: (tag: string) => void;
  onRemoveTag: (tag: string) => void;
  onCreateTag: (tag: string, tagClass: TagClass) => void;
  deadline: ProjectDeadline | undefined;
  isDeadlineOpen: boolean;
  onToggleDeadline: () => void;
  onSaveDeadline: (deadline: ProjectDeadline | undefined) => void;
  visibleColumns: DataColumnKey[];
  visibleTableColumns: TableColumnKey[];
  columnDrag: ColumnDragState | null;
  draggedColumn: DataColumnKey | null;
  droppedColumn: DataColumnKey | null;
  isSelected: boolean;
  onOpenDetails: () => void;
  onOpenLatestActions: () => void;
  onOpenProject: () => void;
}) {
  const projectFlowHref = getProjectFlowHref(project.id);
  const latestUpdateFullDate = formatFullTimestamp(project.latestUpdate.timestamp);
  const latestUpdateAccessibleLabel = `${project.latestUpdate.label} · ${latestUpdateFullDate}`;

  return (
    <tr
      className={`active-project-row ${isSelected ? "selected" : ""}`}
      onClick={(event) => {
        const target = event.target;

        if (
          target instanceof HTMLElement &&
          target.closest("a, button, input, [role='button'], .project-tag-menu, .deadline-popover, .status-pill")
        ) {
          return;
        }

        const cell = target instanceof HTMLElement ? target.closest("td") : null;

        if (cell?.classList.contains("project-cell") || cell?.classList.contains("column-progress")) {
          onOpenProject();
          return;
        }

        onOpenDetails();
      }}
    >
      <ProjectCell
        project={project}
        fileLocations={fileLocations}
        hasLoadedRole={hasLoadedRole}
        projectFlowHref={projectFlowHref}
        selectedRole={selectedRole}
        tags={tags}
        tagOptions={tagOptions}
        tagClasses={tagClasses}
        isTagMenuOpen={isTagMenuOpen}
        onToggleTagMenu={onToggleTagMenu}
        onAddTag={onAddTag}
        onRemoveTag={onRemoveTag}
        onCreateTag={onCreateTag}
      />
      {visibleColumns.map((columnKey) => (
        <ProjectDataCell
          key={columnKey}
          columnKey={columnKey}
          project={project}
          costSummary={costSummary}
          isDragging={draggedColumn === columnKey}
          isDropped={droppedColumn === columnKey}
          shiftDirection={getColumnShiftDirection(columnKey, visibleTableColumns, columnDrag)}
          latestUpdateFullDate={latestUpdateFullDate}
          latestUpdateAccessibleLabel={latestUpdateAccessibleLabel}
          deadline={deadline}
          isDeadlineOpen={isDeadlineOpen}
          onToggleDeadline={onToggleDeadline}
          onSaveDeadline={onSaveDeadline}
          onOpenDetails={onOpenDetails}
          onOpenLatestActions={onOpenLatestActions}
        />
      ))}
    </tr>
  );
}

function ProjectCell({
  project,
  fileLocations,
  hasLoadedRole,
  projectFlowHref,
  selectedRole,
  tags,
  tagOptions,
  tagClasses,
  isTagMenuOpen,
  onToggleTagMenu,
  onAddTag,
  onRemoveTag,
  onCreateTag,
}: {
  project: ScopedProject;
  fileLocations: ProjectFileLocation[];
  hasLoadedRole: boolean;
  projectFlowHref: string | null;
  selectedRole: PrototypeRole;
  tags: string[];
  tagOptions: string[];
  tagClasses: Record<string, TagClass>;
  isTagMenuOpen: boolean;
  onToggleTagMenu: () => void;
  onAddTag: (tag: string) => void;
  onRemoveTag: (tag: string) => void;
  onCreateTag: (tag: string, tagClass: TagClass) => void;
}) {
  const [isCreatingTag, setIsCreatingTag] = useState(false);
  const [draftTagName, setDraftTagName] = useState("");
  const [draftTagClass, setDraftTagClass] = useState<TagClass>("critical");
  const unreadMessages = project.unreadMessages ?? 0;
  const availableTags = tagOptions.filter((tag) => !tags.includes(tag));
  const chatTooltip =
    unreadMessages > 0
      ? `Open chat (${unreadMessages} unread)`
      : "Open chat";
  const primaryFileLocation = fileLocations[0];
  const fileTooltip = primaryFileLocation
    ? fileLocations.length > 1
      ? `Open project files (${fileLocations.length} locations)`
      : getFileLocationTooltip(primaryFileLocation)
    : "";

  useEffect(() => {
    if (!isTagMenuOpen) {
      setIsCreatingTag(false);
      setDraftTagName("");
      setDraftTagClass("critical");
    }
  }, [isTagMenuOpen]);

  const submitNewTag = () => {
    const trimmedTagName = draftTagName.trim();

    if (!trimmedTagName) {
      return;
    }

    onCreateTag(trimmedTagName, draftTagClass);
    setIsCreatingTag(false);
    setDraftTagName("");
    setDraftTagClass("critical");
  };

  return (
    <td className={`project-cell ${isTagMenuOpen ? "project-cell-tag-menu-open" : ""}`}>
      <div className="project-cell-inner">
        <span className="client-badge label-xs-semibold">{project.clientBadge}</span>
        <div className="project-title-row">
          {projectFlowHref ? (
            <a className="project-title heading-3xs" href={projectFlowHref} onClick={(event) => event.stopPropagation()}>
              {project.name}
            </a>
          ) : (
            <span className="project-title is-static heading-3xs" title="Demo not available">
              {project.name}
              <small className="project-demo-unavailable label-xs">Demo not available</small>
            </span>
          )}
          <div className="project-quick-actions" aria-label={`Quick actions for ${project.name}`}>
            <a
              className="project-quick-action"
              href={`/chat?project=${encodeURIComponent(project.id)}`}
              aria-label={chatTooltip}
              data-tooltip={chatTooltip}
              onClick={(event) => event.stopPropagation()}
            >
              <DsIcon name="chats" size={20} />
              <CommentCountBadge count={unreadMessages} label={`${unreadMessages} unread messages`} />
            </a>
            {hasLoadedRole && selectedRole !== "Customer" && primaryFileLocation ? (
              fileLocations.length === 1 ? (
                <a
                  className="project-quick-action"
                  href={getFileLocationHref(primaryFileLocation.url)}
                  target="_blank"
                  rel="noopener"
                  aria-label={fileTooltip}
                  data-tooltip={fileTooltip}
                  onClick={(event) => event.stopPropagation()}
                >
                  <DsIcon name="folder" size={20} />
                </a>
              ) : (
                <details className="project-files-quick-menu" onClick={(event) => event.stopPropagation()}>
                  <summary
                    className="project-quick-action"
                    aria-label={fileTooltip}
                    data-tooltip={fileTooltip}
                  >
                    <DsIcon name="folder" size={20} />
                  </summary>
                  <div className="project-files-quick-popover" aria-label="Project file locations">
                    <span className="project-files-quick-heading label-xs-semibold">Project Files</span>
                    {fileLocations.map((location, index) => (
                      <a
                        className="project-files-quick-location"
                        href={getFileLocationHref(location.url)}
                        target="_blank"
                        rel="noopener"
                        key={`${location.created_at}-${index}`}
                      >
                        <DsIcon name="folder-open" size={16} />
                        <span>
                          <strong className="label-s-semibold">{getFileLocationDisplayLabel(location)}</strong>
                          <small className="label-xs">{getFileLocationTooltip(location)}</small>
                        </span>
                      </a>
                    ))}
                  </div>
                </details>
              )
            ) : null}
            <a
              className="project-quick-action"
              href={`/workspaces/${encodeURIComponent(project.workspaceId)}/clients/${encodeURIComponent(project.clientId)}/portal?studio-preview=1`}
              aria-label="Go to Client portal"
              data-tooltip="Go to Client portal"
              onClick={(event) => event.stopPropagation()}
            >
              <DsIcon name="queue" size={20} />
            </a>
          </div>
        </div>
        <div className="project-meta-row">
          {tags.map((tag) => (
            <span className={`project-tag-chip tag-option ${getTagClass(tag, tagClasses)} label-s-semibold`} key={tag}>
              {tag}
              <button
                className="project-tag-remove"
                type="button"
                aria-label={`Remove ${tag} tag from ${project.name}`}
                onClick={(event) => {
                  event.stopPropagation();
                  onRemoveTag(tag);
                }}
              >
                ×
              </button>
            </span>
          ))}
          <button
            className="project-plus-action label-s"
            type="button"
            aria-label={`Add tag to ${project.name}`}
            aria-expanded={isTagMenuOpen}
            onClick={(event) => {
              event.stopPropagation();
              onToggleTagMenu();
            }}
          >
            +
          </button>
          {isTagMenuOpen ? (
            <div className="project-tag-menu" onClick={(event) => event.stopPropagation()}>
              <span className="project-tag-menu-title label-s-semibold">Select a tag</span>
              {availableTags.length > 0 ? (
                availableTags.map((tag) => (
                  <button
                    className="project-tag-menu-option label-s"
                    type="button"
                    key={tag}
                    onClick={(event) => {
                      event.stopPropagation();
                      onAddTag(tag);
                    }}
                  >
                    <span className={`tag-option ${getTagClass(tag, tagClasses)}`}>{tag}</span>
                  </button>
                ))
              ) : (
                <span className="project-tag-menu-empty label-s">All tags are added.</span>
              )}
              {isCreatingTag ? (
                <div className="project-tag-create-form">
                  <input
                    className="project-tag-input label-s"
                    type="text"
                    value={draftTagName}
                    placeholder="Tag name..."
                    autoFocus
                    onChange={(event) => setDraftTagName(event.target.value)}
                    onClick={(event) => event.stopPropagation()}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        event.preventDefault();
                        submitNewTag();
                      }

                      if (event.key === "Escape") {
                        event.preventDefault();
                        setIsCreatingTag(false);
                        setDraftTagName("");
                      }
                    }}
                  />
                  <div className="project-tag-colour-grid" aria-label="Tag colour">
                    {tagColourOptions.map((tagColour) => (
                      <button
                        className={`project-tag-colour-swatch tag-option ${tagColour.className} ${
                          draftTagClass === tagColour.className ? "selected" : ""
                        }`}
                        type="button"
                        key={tagColour.className}
                        aria-label={tagColour.label}
                        aria-pressed={draftTagClass === tagColour.className}
                        onClick={(event) => {
                          event.stopPropagation();
                          setDraftTagClass(tagColour.className);
                        }}
                      />
                    ))}
                  </div>
                  <div className="project-tag-create-actions">
                    <button
                      className="project-tag-create-submit label-s-semibold"
                      type="button"
                      disabled={draftTagName.trim().length === 0}
                      onClick={(event) => {
                        event.stopPropagation();
                        submitNewTag();
                      }}
                    >
                      Create
                    </button>
                    <button
                      className="project-tag-create-cancel label-s-semibold"
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        setIsCreatingTag(false);
                        setDraftTagName("");
                      }}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  className="project-tag-create label-s-semibold"
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    setIsCreatingTag(true);
                  }}
                >
                  <span aria-hidden="true">+</span>
                  Create new tag
                </button>
              )}
            </div>
          ) : null}
        </div>
      </div>
    </td>
  );
}

function ProjectDataCell({
  columnKey,
  project,
  costSummary,
  isDragging,
  isDropped,
  shiftDirection,
  latestUpdateFullDate,
  latestUpdateAccessibleLabel,
  deadline,
  isDeadlineOpen,
  onToggleDeadline,
  onSaveDeadline,
  onOpenDetails,
  onOpenLatestActions,
}: {
  columnKey: DataColumnKey;
  project: Project;
  costSummary: ProjectCostSummary;
  isDragging: boolean;
  isDropped: boolean;
  shiftDirection: "left" | "right" | null;
  latestUpdateFullDate: string;
  latestUpdateAccessibleLabel: string;
  deadline: ProjectDeadline | undefined;
  isDeadlineOpen: boolean;
  onToggleDeadline: () => void;
  onSaveDeadline: (deadline: ProjectDeadline | undefined) => void;
  onOpenDetails: () => void;
  onOpenLatestActions: () => void;
}) {
  const router = useRouter();
  const columnClassName = [
    `column-${columnKey}`,
    isDragging ? "column-is-dragging" : "",
    isDropped ? "column-was-dropped" : "",
    shiftDirection ? `column-shift-${shiftDirection}` : "",
  ]
    .filter(Boolean)
    .join(" ");

  if (columnKey === "progress") {
    return (
      <td className={columnClassName}>
        <div className="project-progress-cell">
          <StageProgress
            projectId={project.id}
            projectName={project.name}
            stages={project.stages}
            studioName="North Star Films"
            customerName={project.clientName}
            videoType={project.videoType}
          />
          {project.status === "Completed" && project.deliveredAt ? (
            <span className="project-delivered-date label-xs-semibold">Delivered {formatDeliveredDate(project.deliveredAt)}</span>
          ) : null}
        </div>
      </td>
    );
  }

  if (columnKey === "latestUpdate") {
    return (
      <td className={columnClassName}>
        <LatestUpdateCell
          label={project.latestUpdate.label}
          timestamp={project.latestUpdate.timestamp}
          fullDate={latestUpdateFullDate}
          accessibleLabel={latestUpdateAccessibleLabel}
          onOpenLatestActions={onOpenLatestActions}
        />
      </td>
    );
  }

  if (columnKey === "status") {
    return (
      <td className={columnClassName}>
        <span className={`status-pill status-${project.status.toLowerCase().replace(/\s+/g, "-")} label-s-semibold`}>
          {getStatusLabel(project.status)}
        </span>
      </td>
    );
  }

  if (columnKey === "deadline") {
    return (
      <td className={`${columnClassName} ${isDeadlineOpen ? "deadline-column-open" : ""}`}>
        <DeadlineCell
          project={project}
          deadline={deadline}
          isOpen={isDeadlineOpen}
          onToggle={onToggleDeadline}
          onSave={onSaveDeadline}
        />
      </td>
    );
  }

  if (columnKey === "hours") {
    const estimatedHours = getProjectEstimatedHours(project.team);
    const loggedHours = getProjectLoggedHours(project.team, project.timeEntries);

    return (
      <td className={columnClassName}>
        <div className="hours-cell">
          {estimatedHours > 0 ? (
            <>
              <span className="hours-copy label-s-semibold">
                {formatHours(loggedHours)} <span>/</span> {formatHours(estimatedHours)}
              </span>
              <button
                className="hours-button label-s-semibold"
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  router.push("/today");
                }}
              >
                + Log
              </button>
            </>
          ) : (
            <button className="hours-button add label-s-semibold" type="button" onClick={(event) => event.stopPropagation()}>
              + Add
            </button>
          )}
        </div>
      </td>
    );
  }

  if (columnKey === "costs") {
    const invoiceLabel = costSummary.outstandingInvoiceCount === 1 ? "1 unpaid invoice" : `${costSummary.outstandingInvoiceCount} unpaid invoices`;

    return (
      <td className={columnClassName}>
        <Link
          className="project-costs-cell"
          href={`/projects/${project.id}/costs`}
          aria-label={`Open Project costs for ${project.name}. ${costSummary.totalLabel}, ${invoiceLabel}.`}
          onClick={(event) => event.stopPropagation()}
        >
          <strong className="label-s-semibold">{costSummary.totalLabel}</strong>
          <span className="label-xs">{invoiceLabel}</span>
        </Link>
      </td>
    );
  }

  if (columnKey === "team") {
    const person = getPrimaryTeamPerson(project.team);

    return (
      <td className={columnClassName}>
        <span className="team-avatar label-xs-semibold">{person?.initials ?? "ST"}</span>
      </td>
    );
  }

  return (
    <td className={`row-actions-cell ${columnClassName}`}>
      <div className="row-actions-wrap">
        <button
          className="row-open-chevron"
          type="button"
          aria-label={`Open details for ${project.name}`}
          data-tooltip="Open details"
          onClick={(event) => {
            event.stopPropagation();
            onOpenDetails();
          }}
        >
          <DsIcon name="caret-right" size={14} />
        </button>
      </div>
    </td>
  );
}

function DeadlineCell({
  project,
  deadline,
  isOpen,
  onToggle,
  onSave,
}: {
  project: Project;
  deadline: ProjectDeadline | undefined;
  isOpen: boolean;
  onToggle: () => void;
  onSave: (deadline: ProjectDeadline | undefined) => void;
}) {
  const summary = getDeadlineSummary(deadline);
  const stageLabel = getStageLabel(deadline?.stage ?? inferCurrentStage(project));

  return (
    <div className="deadline-cell">
      {deadline?.dueAt || deadline?.finalDueAt ? (
        <button
          className="deadline-display"
          type="button"
          aria-label={`Edit deadline for ${project.name}`}
          aria-expanded={isOpen}
          onClick={(event) => {
            event.stopPropagation();
            onToggle();
          }}
        >
          {summary ? (
            <span className={`deadline-stage-chip deadline-${summary.categoryClass} label-xs-semibold`}>
              {stageLabel} - {summary.label}
            </span>
          ) : null}
          {deadline.finalDueAt ? (
            <span className="deadline-final-text label-xs">Final due - {formatShortDeadlineDate(deadline.finalDueAt)}</span>
          ) : null}
        </button>
      ) : (
        <button
          className="deadline-chip label-s-semibold"
          type="button"
          aria-label={`Set deadline for ${project.name}`}
          aria-expanded={isOpen}
          onClick={(event) => {
            event.stopPropagation();
            onToggle();
          }}
        >
          To be set
        </button>
      )}

      {isOpen ? (
        <div className="deadline-popover" onClick={(event) => event.stopPropagation()}>
          <DeadlineReadFirstEditor project={project} deadline={deadline} onSave={onSave} />
        </div>
      ) : null}
    </div>
  );
}

function LatestUpdateCell({
  label,
  timestamp,
  fullDate,
  accessibleLabel,
  onOpenLatestActions,
}: {
  label: string;
  timestamp: string;
  fullDate: string;
  accessibleLabel: string;
  onOpenLatestActions: () => void;
}) {
  const copyRef = useRef<HTMLSpanElement>(null);
  const [isTruncated, setIsTruncated] = useState(false);
  const labelParts = getLatestUpdateLabelParts(label);

  useEffect(() => {
    const copyElement = copyRef.current;

    if (!copyElement) {
      return;
    }

    const updateTruncatedState = () => {
      setIsTruncated(copyElement.scrollWidth > copyElement.clientWidth + 1);
    };

    updateTruncatedState();

    const resizeObserver = new ResizeObserver(updateTruncatedState);
    resizeObserver.observe(copyElement);

    return () => resizeObserver.disconnect();
  }, [label]);

  return (
    <button
      className="latest-update-cell paragraph-s"
      type="button"
      aria-label={`${accessibleLabel}. Open Latest actions.`}
      data-tooltip={isTruncated ? label : undefined}
      onClick={(event) => {
        event.stopPropagation();
        onOpenLatestActions();
      }}
    >
      <span className="latest-update-copy" ref={copyRef}>
        <strong>{labelParts.action}</strong>
        {labelParts.detail ? ` ${labelParts.detail}` : ""}
      </span>
      <time className="latest-update-time label-xs" dateTime={timestamp} data-tooltip={fullDate}>
        {formatWorkingAge(timestamp, latestUpdateReferenceDate)}
      </time>
    </button>
  );
}

function getFilterOptions(filterKey: FilterKey, clients: string[], teammates: string[], tags: string[]) {
  if (filterKey === "client") {
    return clients;
  }

  if (filterKey === "teammate") {
    return teammates;
  }

  if (filterKey === "tags") {
    return tags;
  }

  if (filterKey === "status") {
    return statusTabs.filter((status): status is Project["status"] => status !== "All");
  }

  return deadlineFilterOptions;
}

function getUniqueOptions(values: string[]) {
  return Array.from(new Set(values)).sort((first, second) => first.localeCompare(second));
}

function getValidProjectId(projectId: string | null) {
  if (!projectId || !activeVideoProjects.some((project) => project.id === projectId)) {
    return null;
  }

  return projectId;
}

function getColumnShiftDirection(
  columnKey: TableColumnKey,
  visibleColumns: TableColumnKey[],
  columnDrag: ColumnDragState | null,
) {
  if (!columnDrag?.isDragging || columnKey === "project" || columnKey === fixedEndColumn || columnKey === columnDrag.columnKey) {
    return null;
  }

  const originIndex = visibleColumns.indexOf(columnDrag.columnKey);
  const currentIndex = visibleColumns.indexOf(columnKey);

  if (originIndex === -1 || currentIndex === -1) {
    return null;
  }

  if (columnDrag.dropIndex > originIndex && currentIndex > originIndex && currentIndex < columnDrag.dropIndex) {
    return "left";
  }

  if (columnDrag.dropIndex < originIndex && currentIndex >= columnDrag.dropIndex && currentIndex < originIndex) {
    return "right";
  }

  return null;
}

function getStatusLabel(status: StatusTab) {
  if (status === "In Production") {
    return "In production";
  }

  return status;
}

function formatDeliveredDate(value: string) {
  return new Intl.DateTimeFormat("en-AU", { day: "numeric", month: "short", year: "numeric" }).format(new Date(value));
}

function getDeadlineCategory(deadline: ProjectDeadline | undefined) {
  return getDeadlineSummary(deadline)?.category ?? null;
}

function getDeadlineSummary(deadline: Pick<ProjectDeadline, "dueAt"> | undefined) {
  if (!deadline?.dueAt) {
    return null;
  }

  const dueDate = new Date(deadline.dueAt);
  const millisecondsRemaining = dueDate.getTime() - deadlineReferenceDate.getTime();
  const oneHour = 1000 * 60 * 60;
  const oneDay = oneHour * 24;

  if (millisecondsRemaining < 0) {
    const overdueMilliseconds = Math.abs(millisecondsRemaining);

    if (isSameDate(dueDate, deadlineReferenceDate) || overdueMilliseconds < oneDay) {
      const hoursOverdue = Math.max(1, Math.ceil(overdueMilliseconds / oneHour));

      return {
        category: "Overdue" as DeadlineCategory,
        categoryClass: "overdue",
        label: `${hoursOverdue}h overdue`,
      };
    }

    const overdueWorkingDays = Math.max(1, countWorkingDaysBetween(dueDate, deadlineReferenceDate));

    return {
      category: "Overdue" as DeadlineCategory,
      categoryClass: "overdue",
      label: `${overdueWorkingDays}d overdue`,
    };
  }

  if (isSameDate(dueDate, deadlineReferenceDate) || millisecondsRemaining < oneDay) {
    const hoursLeft = Math.max(1, Math.ceil(millisecondsRemaining / oneHour));

    return {
      category: "Due Soon" as DeadlineCategory,
      categoryClass: "due-soon",
      label: `${hoursLeft}h left`,
    };
  }

  const workingDaysLeft = Math.max(1, countWorkingDaysUntilDeadline(deadlineReferenceDate, dueDate));
  const category: DeadlineCategory = workingDaysLeft <= 1 ? "Due Soon" : "On Track";

  return {
    category,
    categoryClass: category === "Due Soon" ? "due-soon" : "on-track",
    label: `${workingDaysLeft}d left`,
  };
}

function inferCurrentStage(project: Project): StageKey {
  const waitingStage = stageOrder.find((stage) => {
    const state = project.stages[stage.key].state;

    return state === "waiting" || state === "in_progress";
  });

  if (waitingStage) {
    return waitingStage.key;
  }

  return stageOrder.find((stage) => project.stages[stage.key].state === "not_started")?.key ?? "masters";
}

function getStageLabel(stageKey: StageKey) {
  return stageOrder.find((stage) => stage.key === stageKey)?.label ?? "Stage";
}

function getProjectTimeEntries(project: Project): ProjectTimeEntry[] {
  return project.timeEntries.slice(0, 5).map((entry) => {
    const person = getTeamPerson(entry.personId);

    return {
      id: entry.id,
      person: person?.name ?? "Studio team",
      dateLabel: formatWorkingAge(entry.loggedAt, latestUpdateReferenceDate),
      hours: entry.hours,
      stage: entry.stageId,
      note: entry.note,
    };
  });
}

function getPrimaryRoleSlot(team: RoleSlot[]) {
  return team.find((slot) => slot.role === "producer" && getAcceptedPerson(slot) && !slot.archivedAt) ?? team.find((slot) => getAcceptedPerson(slot) && !slot.archivedAt);
}

function getRoleSlotForLoggedStage(team: RoleSlot[], stage: StageKey) {
  return (
    team.find((slot) => !slot.archivedAt && getAcceptedPerson(slot)?.id === todayCurrentUserId && slot.stages.some((stageAssignment) => stageAssignment.stageId === stage)) ??
    team.find((slot) => !slot.archivedAt && slot.stages.some((stageAssignment) => stageAssignment.stageId === stage)) ??
    getPrimaryRoleSlot(team) ??
    team[0]
  );
}

function getPrimaryTeamPerson(team: RoleSlot[]): TeamPerson | undefined {
  const primarySlot = getPrimaryRoleSlot(team);

  return primarySlot ? getAcceptedPerson(primarySlot) : undefined;
}

function getFirstTeamPersonForType(team: RoleSlot[], personType: TeamPerson["personType"]) {
  const acceptedPerson = team.map(getAcceptedPerson).find((person) => person?.personType === personType);

  if (acceptedPerson) {
    return acceptedPerson;
  }

  const pendingInvitation = team.flatMap((slot) => getVisibleInvitations(slot)).find((invitation) => getTeamPerson(invitation.personId)?.personType === personType);

  return pendingInvitation ? getTeamPerson(pendingInvitation.personId) : undefined;
}

function getTeamPanelAccess(role: PrototypeRole): TeamPanelAccess {
  if (role === "Customer") {
    return "customer";
  }

  if (role === "Studio Freelancer") {
    return "freelancer";
  }

  return "producerAdmin";
}

function getPersonName(initials: string) {
  const personMap: Record<string, string> = {
    AK: "Ava King",
    CT: "Chris Taylor",
    ED: "Emma Davis",
    JL: "Jordan Lee",
    MD: "Maddie Davis",
    RB: "Ruby Bennett",
    SC: "Sarah Chen",
    TE: "Tom Editor",
  };

  return personMap[initials] ?? "Studio team";
}

function getClientContact(project: Project) {
  const contactMap: Record<string, { name: string; role: string; email: string; lastContactAt: string }> = {
    CNVA: {
      name: "Ari Bennett",
      role: "Brand Manager",
      email: "ari@canva.com",
      lastContactAt: "2026-06-18T10:15:00+10:00",
    },
    DEEL: {
      name: "Priya Shah",
      role: "Talent Marketing Lead",
      email: "priya@deel.com",
      lastContactAt: "2026-06-12T16:20:00+10:00",
    },
    HIMS: {
      name: "Marcus Lee",
      role: "Content Director",
      email: "marcus@hims.com",
      lastContactAt: "2026-06-17T14:05:00+10:00",
    },
    LINR: {
      name: "Nina Patel",
      role: "Product Marketing Manager",
      email: "nina@linear.app",
      lastContactAt: "2026-06-16T11:45:00+10:00",
    },
    LOOM: {
      name: "Mia Reynolds",
      role: "Marketing Lead",
      email: "mia@loom.com",
      lastContactAt: "2026-06-16T15:30:00+10:00",
    },
    NOTN: {
      name: "Elliot Grant",
      role: "Developer Relations",
      email: "elliot@notion.so",
      lastContactAt: "2026-06-15T09:40:00+10:00",
    },
    OPEN: {
      name: "Sofia Chen",
      role: "Creative Ops",
      email: "sofia@openai.com",
      lastContactAt: "2026-06-13T13:20:00+10:00",
    },
    PHOG: {
      name: "Jules Morgan",
      role: "Growth Lead",
      email: "jules@posthog.com",
      lastContactAt: "2026-06-09T12:10:00+10:00",
    },
    RAMP: {
      name: "Noah Carter",
      role: "Campaign Manager",
      email: "noah@ramp.com",
      lastContactAt: "2026-06-12T10:05:00+10:00",
    },
  };

  return (
    contactMap[project.clientBadge] ?? {
      name: "Client contact",
      role: "Primary contact",
      email: "client@example.com",
      lastContactAt: project.latestUpdate.timestamp,
    }
  );
}

function formatDeadlineDateTime(timestamp: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(new Date(timestamp));
}

function formatCompactDateTime(timestamp: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(new Date(timestamp));
}

function formatShortDeadlineDate(timestamp: string) {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  }).format(new Date(timestamp));
}

function formatDateInputValue(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function formatDeadlineReadDate(timestamp: string, kind: DeadlineEditField) {
  const date = new Date(timestamp);
  const dateParts = new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: date.getFullYear() === deadlineReferenceDate.getFullYear() ? undefined : "numeric",
  })
    .formatToParts(date)
    .reduce<Record<string, string>>((parts, part) => {
      if (part.type !== "literal") {
        parts[part.type] = part.value;
      }

      return parts;
    }, {});
  const dateText = [dateParts.weekday, dateParts.day, dateParts.month, dateParts.year].filter(Boolean).join(" ");
  const shouldShowTime = kind === "stage" || hasExplicitFinalDeliveryTime(date);

  if (!shouldShowTime) {
    return dateText;
  }

  const timeText = new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  })
    .format(date)
    .toLowerCase();

  return `${dateText} · ${timeText}`;
}

function hasExplicitFinalDeliveryTime(date: Date) {
  const hours = date.getHours();
  const minutes = date.getMinutes();

  return !(minutes === 0 && (hours === 0 || hours === 17));
}

function getDeadlineHelper(timestamp: string | undefined) {
  if (!timestamp) {
    return null;
  }

  const dueDate = new Date(timestamp);
  const millisecondsRemaining = dueDate.getTime() - deadlineReferenceDate.getTime();
  const oneHour = 1000 * 60 * 60;
  const oneDay = oneHour * 24;

  if (millisecondsRemaining < 0) {
    const overdueMilliseconds = Math.abs(millisecondsRemaining);

    if (isSameDate(dueDate, deadlineReferenceDate) || overdueMilliseconds < oneDay) {
      return {
        categoryClass: "overdue",
        label: `${Math.max(1, Math.ceil(overdueMilliseconds / oneHour))}h overdue`,
      };
    }

    return {
      categoryClass: "overdue",
      label: `${Math.max(1, countWorkingDaysBetween(dueDate, deadlineReferenceDate))}d overdue`,
    };
  }

  if (isSameDate(dueDate, deadlineReferenceDate) || millisecondsRemaining < oneDay) {
    return {
      categoryClass: "due-soon",
      label: `${Math.max(1, Math.ceil(millisecondsRemaining / oneHour))}h left`,
    };
  }

  const workingDaysLeft = Math.max(1, countWorkingDaysUntilDeadline(deadlineReferenceDate, dueDate));

  if (workingDaysLeft < 7) {
    return {
      categoryClass: "due-soon",
      label: `${workingDaysLeft}d left`,
    };
  }

  return null;
}

function toDateTimeInputValue(timestamp: string | undefined) {
  if (!timestamp) {
    return "";
  }

  const date = new Date(timestamp);

  return `${date.getFullYear()}-${padDatePart(date.getMonth() + 1)}-${padDatePart(date.getDate())}T${padDatePart(
    date.getHours(),
  )}:${padDatePart(date.getMinutes())}`;
}

function toDateInputValue(timestamp: string | undefined) {
  if (!timestamp) {
    return "";
  }

  const date = new Date(timestamp);

  return `${date.getFullYear()}-${padDatePart(date.getMonth() + 1)}-${padDatePart(date.getDate())}`;
}

function fromDateTimeInputValue(value: string) {
  return value ? `${value}:00+10:00` : undefined;
}

function fromDateInputValue(value: string) {
  return value ? `${value}T17:00:00+10:00` : undefined;
}

function padDatePart(value: number) {
  return value.toString().padStart(2, "0");
}

function formatFullTimestamp(timestamp: string) {
  const date = new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(timestamp));
  const time = new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(new Date(timestamp));

  return `${date} at ${time}`;
}

function getProjectCostSummary(
  projectId: string,
  offers: ContractorOffer[],
  invoices: ContractorInvoice[],
): ProjectCostSummary {
  const acceptedOffers = offers.filter(
    (offerItem) => offerItem.projectId === projectId && offerItem.state === "Accepted",
  );
  const outstandingInvoices = invoices.filter(
    (invoiceItem) => invoiceItem.projectId === projectId && invoiceItem.state !== "Paid",
  );

  return {
    totalLabel: formatCurrencyTotals(
      acceptedOffers.map((offerItem) => ({ amount: offerItem.agreedRate, currency: offerItem.currency })),
    ),
    outstandingInvoiceCount: outstandingInvoices.length,
  };
}

function formatCurrencyTotals(items: Array<{ amount: number; currency: CostCurrency }>) {
  if (!items.length) {
    return formatCostAmount(0, "AUD");
  }

  const totals = items.reduce<Partial<Record<CostCurrency, number>>>((current, item) => ({
    ...current,
    [item.currency]: (current[item.currency] ?? 0) + item.amount,
  }), {});

  return Object.entries(totals)
    .map(([currency, amount]) => formatCostAmount(amount ?? 0, currency as CostCurrency))
    .join(" + ");
}

function formatWorkingAge(timestamp: string, referenceDate: Date) {
  const eventDate = new Date(timestamp);
  const millisecondsAgo = referenceDate.getTime() - eventDate.getTime();

  if (millisecondsAgo < 0) {
    return "Today";
  }

  if (isSameDate(eventDate, referenceDate)) {
    const hoursAgo = Math.floor(millisecondsAgo / (1000 * 60 * 60));

    if (hoursAgo >= 1) {
      return `${hoursAgo}h ago`;
    }

    const minutesAgo = Math.floor(millisecondsAgo / (1000 * 60));

    if (minutesAgo >= 1) {
      return `${minutesAgo}m ago`;
    }

    return "Just now";
  }

  const workingDaysAgo = countWorkingDaysBetween(eventDate, referenceDate);

  if (workingDaysAgo <= 0) {
    return "Today";
  }

  if (workingDaysAgo === 1) {
    return "1d ago";
  }

  return `${workingDaysAgo}d ago`;
}

function isSameDate(firstDate: Date, secondDate: Date) {
  return (
    firstDate.getFullYear() === secondDate.getFullYear() &&
    firstDate.getMonth() === secondDate.getMonth() &&
    firstDate.getDate() === secondDate.getDate()
  );
}

function countWorkingDaysBetween(startDate: Date, endDate: Date) {
  const cursor = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
  const finalDate = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate());
  let workingDays = 0;

  cursor.setDate(cursor.getDate() + 1);

  while (cursor <= finalDate) {
    const day = cursor.getDay();

    if (day !== 0 && day !== 6) {
      workingDays += 1;
    }

    cursor.setDate(cursor.getDate() + 1);
  }

  return workingDays;
}

function countWorkingDaysUntilDeadline(startDate: Date, endDate: Date) {
  const cursor = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
  const finalDate = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate());
  let workingDays = 0;

  cursor.setDate(cursor.getDate() + 1);

  while (cursor < finalDate) {
    const day = cursor.getDay();

    if (day !== 0 && day !== 6) {
      workingDays += 1;
    }

    cursor.setDate(cursor.getDate() + 1);
  }

  return workingDays;
}

function getLatestUpdateLabelParts(label: string) {
  const words = label.split(" ");

  if (words.length < 2) {
    return { action: label, detail: "" };
  }

  return {
    action: words.slice(0, 2).join(" "),
    detail: words.slice(2).join(" "),
  };
}

function getTagClass(option: string, tagClasses: Record<string, TagClass>) {
  return tagClasses[option] ?? "in-review";
}
