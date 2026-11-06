"use client";

import { EditingDialog } from "../../../Brisk DS/src/app/components/EditingDialog";
import { useInvitations } from "@/components/invitations/InvitationContext";
import { readSharedReviewActivity, sharedReviewActivityStorageKey } from "@/data/share-review-activity";
import { Button } from "../../../Brisk DS/src/app/components/Button";
import { IconButton } from "../../../Brisk DS/src/app/components/IconButton";
import { FilterButton, FilterGroup } from "../../../Brisk DS/src/app/components/FilterGroup";
import { BriskSelect, type BriskSelectOption } from "../../../Brisk DS/src/app/components/Select";
import type { DragEvent as ReactDragEvent } from "react";
import { useEffect, useId, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ClientVideoTags } from "@/components/project/ClientVideoTags";
import { ProjectTitleRow, StartProductionAction } from "@/components/project/ProjectTitleRow";
import { StageProgress, stageOrder } from "@/components/active-videos/StageProgress";
import { CommentCountBadge } from "@/components/CommentCountBadge";
import { DeferredChatPage as ChatPage } from "@/components/chat/DeferredChatPage";
import {
  openCustomerGlobalChatEventName,
  openCustomerLatestActivityEventName,
} from "@/components/navigation/GlobalHeaderActions";
import { usePrototypeRole } from "@/components/navigation/PrototypeRoleContext";
import { usePrototypeState } from "@/components/prototype-state/PrototypeStateContext";
import { usePrototypeViewer } from "@/components/prototype-state/usePrototypeViewer";
import { useProjectStageStatus } from "@/components/project/ProjectStageStatusContext";
import { canActOnProject, canViewProject } from "@/data/prototype-access";
import { useStudioSettings } from "@/components/settings/StudioSettingsContext";
import { DsIcon, type DsIconName } from "@/components/video-review/DsIcon";
import { getProjectEntryHref, getProjectStageHref } from "@/data/project-fixtures";
import {
  customerDashboardActivity,
  appendClientVideoHistory,
  readClientVideoHistory,
  customerDashboardProjects,
  customerDashboardSeries,
  withSavedClientStageStatus,
  type CustomerDashboardActivity,
  type CustomerDashboardProject,
  type CustomerDashboardSeries,
  type CustomerDashboardStatus,
} from "@/data/customer-dashboard";
import { usePrototypeScenario } from "@/components/prototype-scenarios/PrototypeScenarioContext";
import { ClientPortalPreviewBanner } from "@/components/client-portal/ClientPortalPreviewBanner";
import { ClientAvatar } from "@/components/clients/ClientPrimitives";
import { AskBriskInsight } from "@/components/ai/AskBriskInsight";
import { ShareActionRow } from "@/components/share/ShareActionRow";
import { getClientDashboardBriefing, type ClientDashboardBriefingPart } from "@/data/client-dashboard-briefing";

type QueueTab = "All" | "Active" | "Queued" | "Completed" | "Paused" | "Archived";
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

type CustomerDashboardProps = {
  activity?: CustomerDashboardActivity[];
  clientId?: string;
  clientName?: string;
  initialProjects?: CustomerDashboardProject[];
  initialSeries?: CustomerDashboardSeries[];
  samplePreview?: boolean;
  storageScopeKey?: string;
  studioName?: string;
  studioPreview?: boolean;
};

const queueTabs: QueueTab[] = ["All", "Active", "Queued", "Completed", "Paused", "Archived"];
const queueTabDescriptions: Record<QueueTab, string> = {
  All: "Every video shared with you.",
  Active: "Videos currently in production.",
  Queued: "Planned next. Your Studio has not started work yet.",
  Completed: "Finished videos that have been approved.",
  Paused: "Work is temporarily on hold.",
  Archived: "Kept for reference and no longer active.",
};
const queueScopes: QueueScope[] = ["All videos", "Series only", "Standalone only"];
const projectStatuses: CustomerDashboardStatus[] = ["In Production", "Queued", "Paused", "Completed", "Archived"];
const clientProjectStatuses: CustomerDashboardStatus[] = ["In Production", "Queued", "Paused"];
const projectStatusActions: Record<CustomerDashboardStatus, { icon: DsIconName; label: string }> = {
  "In Production": { icon: "play", label: "Move to In Production" },
  Queued: { icon: "queue", label: "Move to Queue" },
  Paused: { icon: "pause", label: "Pause video" },
  Completed: { icon: "check-circle", label: "Mark completed" },
  Archived: { icon: "folder", label: "Archive video" },
};
const dashboardReferenceDate = new Date("2026-07-27T09:00:00+10:00");

export function CustomerDashboard({
  activity = customerDashboardActivity,
  clientId,
  clientName = "Loom",
  initialProjects = customerDashboardProjects,
  initialSeries = customerDashboardSeries,
  samplePreview = false,
  storageScopeKey = "legacy:loom",
  studioName,
  studioPreview = false,
}: CustomerDashboardProps = {}) {
  const { selectedRole, canManageStudio } = usePrototypeRole();
  const { openInvitePerson } = useInvitations();
  const { state: prototypeState, updateProjectStatus } = usePrototypeState();
  const { getProjectStages } = useProjectStageStatus();
  const viewer = usePrototypeViewer();
  const { activeScenario } = usePrototypeScenario();
  const { studio } = useStudioSettings();
  const router = useRouter();
  const searchParams = useSearchParams();
  const previewState = searchParams.get("preview");
  const isScenarioEmpty = activeScenario?.state === "new";
  const isStudioPreview = samplePreview || (selectedRole !== "Customer"
    && (studioPreview || searchParams.get("studio-preview") === "1"));
  const canManageProjectStatus = (projectId: string) => {
    const project = prototypeState.projects.find((candidate) => candidate.id === projectId);
    if (samplePreview || !project || !canViewProject(viewer, project, prototypeState)) return false;
    return viewer?.role === "Customer" || canActOnProject(viewer, project, prototypeState, "status");
  };
  const isClientView = selectedRole === "Customer" || isStudioPreview;
  const showStandaloneClientBrand = isStudioPreview || (isClientView && !activeScenario);
  const resolvedStudioName = studioName ?? studio.details.name;
  const scopedClient = prototypeState.clients.find((client) => client.id === clientId
    && client.workspaceId === prototypeState.session.activeWorkspaceId);
  const canInviteClient = Boolean(!samplePreview && isStudioPreview && selectedRole === "Studio Staff"
    && canManageStudio && scopedClient && scopedClient.status !== "Archived");
  const initialQueueOrder = useMemo(() => createInitialQueueOrder(initialProjects), [initialProjects]);
  const initialSeriesChildOrder = useMemo(
    () => createInitialSeriesChildOrder(initialProjects, initialSeries),
    [initialProjects, initialSeries],
  );
  const initialExpandedSeriesIds = initialSeries.some((series) => series.id === "wacf-cc") ? ["wacf-cc"] : [];
  const [selectedTab, setSelectedTab] = useState<QueueTab>("All");
  const [queueScope, setQueueScope] = useState<QueueScope>("All videos");
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const groupingFieldId = useId();
  const [queueOrder, setQueueOrder] = useState<string[]>(initialQueueOrder);
  const [seriesChildOrder, setSeriesChildOrder] = useState<Record<string, string[]>>(initialSeriesChildOrder);
  const [expandedSeriesIds, setExpandedSeriesIds] = useState<string[]>(initialExpandedSeriesIds);
  const [dragItem, setDragItem] = useState<DragItem | null>(null);
  const [dropTargetToken, setDropTargetToken] = useState<string | null>(null);
  const [isProductionDropActive, setIsProductionDropActive] = useState(false);
  const [openMenuProjectId, setOpenMenuProjectId] = useState<string | null>(null);
  const [openStatusProjectId, setOpenStatusProjectId] = useState<string | null>(null);
  const [chatProjectId, setChatProjectId] = useState<string | null | undefined>(undefined);
  const [isActivityOpen, setIsActivityOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [loadedPreferenceRole, setLoadedPreferenceRole] = useState<string | null>(null);

  useEffect(() => {
    if (samplePreview || !isStudioPreview || selectedRole !== "Studio Staff" || !scopedClient
      || scopedClient.id !== prototypeState.onboarding.clientId || searchParams.get("client-added") !== "1") return;
    setToast(`${clientName} added`);
    const timeout = window.setTimeout(() => {
      setToast(null);
      const url = new URL(window.location.href);
      url.searchParams.delete("client-added");
      window.history.replaceState(window.history.state, "", url);
    }, 2400);
    return () => window.clearTimeout(timeout);
  }, [clientName, isStudioPreview, prototypeState.onboarding.clientId, samplePreview, scopedClient?.id, searchParams, selectedRole]);

  const preferenceStorageKey = `brisk-customer-dashboard-preferences-v1:${storageScopeKey}:${selectedRole}`;
  useEffect(() => {
    if (samplePreview) return;
    setLoadedPreferenceRole(null);
    const storedPreferences = window.localStorage.getItem(preferenceStorageKey);

    if (storedPreferences) {
      try {
        const preferences = JSON.parse(storedPreferences) as Partial<DashboardPreferences>;

        if (Array.isArray(preferences.queueOrder)) {
          setQueueOrder(normaliseQueueOrder(preferences.queueOrder, initialQueueOrder));
        } else {
          setQueueOrder(initialQueueOrder);
        }

        if (preferences.seriesChildOrder && typeof preferences.seriesChildOrder === "object") {
          setSeriesChildOrder(normaliseSeriesChildOrder(preferences.seriesChildOrder, initialSeries));
        } else {
          setSeriesChildOrder(initialSeriesChildOrder);
        }

        if (Array.isArray(preferences.expandedSeriesIds)) {
          setExpandedSeriesIds(
            preferences.expandedSeriesIds.filter((seriesId) =>
              initialSeries.some((series) => series.id === seriesId),
            ),
          );
        } else {
          setExpandedSeriesIds(initialExpandedSeriesIds);
        }

      } catch {
        window.localStorage.removeItem(preferenceStorageKey);
        setQueueOrder(initialQueueOrder);
        setSeriesChildOrder(initialSeriesChildOrder);
        setExpandedSeriesIds(initialExpandedSeriesIds);
      }
    } else {
      setQueueOrder(initialQueueOrder);
      setSeriesChildOrder(initialSeriesChildOrder);
      setExpandedSeriesIds(initialExpandedSeriesIds);
    }

    setLoadedPreferenceRole(selectedRole);
  }, [preferenceStorageKey, selectedRole]);

  useEffect(() => {
    if (samplePreview) return;
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
    const openLatestActivity = () => {
      setChatProjectId(undefined);
      setOpenMenuProjectId(null);
      setOpenStatusProjectId(null);
      setIsFilterOpen(false);
      setIsActivityOpen(true);
    };
    const openGlobalChat = () => {
      setIsActivityOpen(false);
      setOpenMenuProjectId(null);
      setOpenStatusProjectId(null);
      setIsFilterOpen(false);
      setChatProjectId(null);
    };

    window.addEventListener(openCustomerLatestActivityEventName, openLatestActivity);
    window.addEventListener(openCustomerGlobalChatEventName, openGlobalChat);
    return () => {
      window.removeEventListener(openCustomerLatestActivityEventName, openLatestActivity);
      window.removeEventListener(openCustomerGlobalChatEventName, openGlobalChat);
    };
  }, []);

  useEffect(() => {
    if (!openMenuProjectId && !openStatusProjectId) {
      return;
    }

    const closeMenus = (event: MouseEvent) => {
      const target = event.target;

      if (target instanceof HTMLElement && target.closest(".customer-dashboard-menu, .customer-dashboard-menu-trigger, .brisk-select-menu[data-brisk-select-mode='action']")) {
        return;
      }

      setOpenMenuProjectId(null);
      setOpenStatusProjectId(null);
      setIsFilterOpen(false);
    };

    window.addEventListener("mousedown", closeMenus);
    return () => window.removeEventListener("mousedown", closeMenus);
  }, [openMenuProjectId, openStatusProjectId]);

  const visibleProjects = previewState === "empty" ? [] : initialProjects;
  const displayProjects = visibleProjects.map((project) => {
    const scopedProject = prototypeState.projects.find((candidate) => candidate.id === project.id
      && candidate.workspaceId === prototypeState.session.activeWorkspaceId);
    return scopedProject && !samplePreview
      ? withSavedClientStageStatus({ ...project, status: scopedProject.status,
        statusDetail: getDefaultStatusDetail(scopedProject.status) }, getProjectStages(scopedProject), clientName)
      : project;
  });
  const visibleActivityProjectIds = new Set(displayProjects.filter((project) => {
    const scopedProject = prototypeState.projects.find((candidate) => candidate.id === project.id
      && candidate.workspaceId === prototypeState.session.activeWorkspaceId);
    return scopedProject && canViewProject(viewer, scopedProject, prototypeState);
  }).map((project) => project.id));
  const visibleActivity = activity.filter((item) => visibleActivityProjectIds.has(item.projectId));
  const projectsById = useMemo(() => new Map(displayProjects.map((project) => [project.id, project])), [displayProjects]);
  const seriesById = useMemo(
    () => new Map(initialSeries.map((series) => [series.id, series])),
    [initialSeries],
  );
  const inProductionProjects = displayProjects.filter((project) => project.status === "In Production");
  const needsInputProjects = inProductionProjects.filter((project) => project.statusDetail === "Waiting on you");
  const briefing = !samplePreview && scopedClient ? getClientDashboardBriefing({
    clientName, studioName: resolvedStudioName, isStudio: selectedRole === "Studio Staff", canInviteClient, projects: displayProjects,
    briefsWithContent: prototypeState.projectBriefSnapshots.filter((snapshot) => snapshot.workspaceId === scopedClient.workspaceId
      && snapshot.clientId === scopedClient.id && Object.values(snapshot.fields).some((field) => field.value.trim()))
      .map((snapshot) => snapshot.projectId),
    hasInvitation: prototypeState.invitations.some((invitation) => invitation.workspaceId === scopedClient.workspaceId
      && invitation.clientId === scopedClient.id),
  }) : null;
  const tabProjects = displayProjects.filter((project) => selectedTab === "All"
    || (selectedTab === "Active" ? project.status === "In Production" : project.status === selectedTab));
  const isQueueFilteredEmpty = previewState === "no-results" || (tabProjects.length === 0 && selectedTab !== "All");
  const canReorderQueue = !isStudioPreview && selectedTab === "Queued" && (isClientView || selectedRole === "Studio Staff");
  const visibleQueueEntries = previewState === "no-results" ? [] : queueOrder.reduce<QueueEntry[]>((entries, token) => {
    const [kind, id] = token.split(":", 2);

    if (kind === "series") {
      const series = seriesById.get(id);

      if (!series || queueScope === "Standalone only") {
        return entries;
      }

      const visibleChildren = getSeriesChildren(series, seriesChildOrder, projectsById).filter(
        (project) => selectedTab === "All"
          || (selectedTab === "Active" ? project.status === "In Production" : project.status === selectedTab),
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

    if (selectedTab === "All" || (selectedTab === "Active" ? project.status === "In Production" : project.status === selectedTab)) {
      entries.push({ kind: "project", token, project });
    }

    return entries;
  }, []);

  const clearQueueControls = () => {
    setSelectedTab("All");
    setQueueScope("All videos");
    const url = new URL(window.location.href);
    url.searchParams.delete("preview");
    router.replace(`${url.pathname}${url.search}`);
  };

  const notify = (message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(null), 2400);
  };

  const changeProjectStatus = (projectId: string, status: CustomerDashboardStatus) => {
    if (!canManageProjectStatus(projectId) || (selectedRole === "Customer" && !clientProjectStatuses.includes(status))) return;
    const project = projectsById.get(projectId);

    if (!project) {
      return;
    }

    if (project.status !== status) {
      updateProjectStatus(projectId, status);
      appendClientVideoHistory(prototypeState.session.activeWorkspaceId, projectId, {
        id: `status:${projectId}:${Date.now()}`,
        actor: viewer?.name ?? clientName,
        action: "changed the video status to",
        object: status,
        projectId,
        projectLabel: project.name,
        timestamp: new Date().toISOString(),
        icon: projectStatusActions[status].icon,
        href: getProjectEntryHref(project),
      });
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
    setDropTargetToken(null);
    setIsProductionDropActive(false);
  };

  const startVideoHref = clientId
    ? `/customer-dashboard/start-video?client=${encodeURIComponent(clientId)}`
    : "/customer-dashboard/start-video";
  const startVideo = () => router.push(startVideoHref);

  const inviteClient = (projectId?: string) => {
    if (!canInviteClient || !scopedClient) return;
    openInvitePerson({ role: "Customer", clientId: scopedClient.id, projectIds: projectId ? [projectId] : [] });
  };

  const renderBriefingPart = (part: ClientDashboardBriefingPart, index: number) => {
    if (typeof part === "string") return part;
    const project = "projectId" in part && part.projectId ? projectsById.get(part.projectId) : undefined;
    if ("projectId" in part && part.projectId && !project) return part.label;
    if (part.action === "invite") return canInviteClient
      ? <button key={index} className="ask-brisk-inline-action" type="button" onClick={() => inviteClient(part.projectId)}><strong>{part.label}</strong></button>
      : part.label;
    const href = part.action === "start" ? startVideoHref
      : project ? part.action === "brief" ? getProjectStageHref(project.id, "brief") : getProjectEntryHref(project) : null;
    return href ? <Link key={index} className="ask-brisk-inline-action" href={href}><strong>{part.label}</strong></Link> : part.label;
  };

  return (
    <main className={`customer-dashboard-shell studio-client-accent-purple ${isClientView ? "is-client-view" : ""} ${isStudioPreview ? "is-studio-preview" : ""}`}>
      <div className="customer-dashboard-main">
        {isStudioPreview ? <ClientPortalPreviewBanner clientName={clientName} sample={samplePreview} /> : null}
        <header className="customer-dashboard-header">
          <div className="customer-dashboard-heading">
            {showStandaloneClientBrand ? (
              <div className="customer-dashboard-portal-brand">
                {scopedClient ? <ClientAvatar client={scopedClient} /> : null}
                <strong className="label-m-semibold">{scopedClient?.name ?? clientName}</strong>
              </div>
            ) : null}
            <div className="customer-dashboard-title-row">
              <h1>Your videos</h1>
              <div className="customer-dashboard-heading-actions">
                {!samplePreview ? <>
                  {canInviteClient ? <Button size="S" variant="secondary" onClick={() => inviteClient()}>Invite Client</Button> : null}
                  <Button size="S" variant="primary" className="customer-dashboard-primary-button" type="button" onClick={startVideo}>
                    <DsIcon name="plus" size={16} />
                    Start Video
                  </Button>
                </> : null}
              </div>
            </div>
          </div>
        </header>

        <div className="customer-dashboard-layout">
          <div className="customer-dashboard-content">
            {briefing ? <AskBriskInsight dashboard eyebrow="Your briefing" title={briefing.title}>
              <p className="paragraph-s">{briefing.body.map(renderBriefingPart)}</p>
            </AskBriskInsight> : null}
            {needsInputProjects.length > 0 ? (
              <section className="customer-needs-input-section" aria-labelledby="customer-needs-input-title">
                <div className="customer-section-heading">
                  <div>
                    <h2
                      className="headings-s-bold"
                      data-tooltip={isStudioPreview ? "Waiting for Client input." : "Waiting for your team's input."}
                      id="customer-needs-input-title"
                      tabIndex={0}
                    >
                      {isStudioPreview ? "Waiting on Client" : "Needs your input"} ({needsInputProjects.length})
                    </h2>
                  </div>
                </div>
                <div className={`customer-action-grid action-count-${Math.min(needsInputProjects.length, 2)}`}>
                  {needsInputProjects.map((project) => (
                    <ProductionCard
                      readOnly={samplePreview}
                      clientName={clientName}
                      interactive={!isClientView}
                      canManageTeam={selectedRole === "Studio Staff" && !isStudioPreview}
                      key={project.id}
                      project={project}
                      needsReview
                      series={project.seriesId ? seriesById.get(project.seriesId) : undefined}
                      onOpenChat={() => { setChatProjectId(project.id); setOpenMenuProjectId(null); }}
                      onChangeStatus={canManageProjectStatus(project.id) ? (status) => changeProjectStatus(project.id, status) : undefined}
                      statusOptions={selectedRole === "Customer" ? clientProjectStatuses : projectStatuses}
                      isMenuOpen={openMenuProjectId === `card:${project.id}`}
                      onToggleMenu={() => {
                        setOpenStatusProjectId(null);
                        setIsFilterOpen(false);
                        setOpenMenuProjectId((current) => (current === `card:${project.id}` ? null : `card:${project.id}`));
                      }}
                      studioName={resolvedStudioName}
                    />
                  ))}
                </div>
              </section>
            ) : null}
            <section
              className={`customer-production-section customer-in-progress-section ${isProductionDropActive ? "drop-active" : ""}`}
              aria-labelledby="customer-production-title"
              onDragEnter={isClientView ? undefined : (event) => {
                if (dragItem && "projectId" in dragItem) {
                  event.preventDefault();
                  setIsProductionDropActive(true);
                }
              }}
              onDragOver={isClientView ? undefined : (event) => {
                if (dragItem && "projectId" in dragItem) {
                  event.preventDefault();
                  event.dataTransfer.dropEffect = "move";
                }
              }}
              onDragLeave={isClientView ? undefined : (event) => {
                if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
                  setIsProductionDropActive(false);
                }
              }}
              onDrop={isClientView ? undefined : (event) => {
                event.preventDefault();
                if (dragItem && "projectId" in dragItem) {
                  startProject(dragItem.projectId);
                }
                finishDrag();
              }}
            >
              <div className="customer-production-heading">
                <div className="customer-production-tab">
                  <h2
                    className="headings-s-bold"
                    data-tooltip="Videos currently in production, including those waiting on Client input."
                    id="customer-production-title"
                    tabIndex={0}
                  >
                    In production ({inProductionProjects.length})
                  </h2>
                </div>
                {isProductionDropActive ? (
                  <span className="customer-production-drop-message label-s-semibold">Drop to start this video</span>
                ) : null}
              </div>

              {inProductionProjects.length > 0 ? (
                <div className={`customer-production-grid production-count-${Math.min(inProductionProjects.length, 5)}`}>
                  {inProductionProjects.map((project) => (
                    <ProductionCard
                      readOnly={samplePreview}
                      clientName={clientName}
                      interactive={!isClientView}
                      canManageTeam={selectedRole === "Studio Staff" && !isStudioPreview}
                      key={project.id}
                      project={project}
                      series={project.seriesId ? seriesById.get(project.seriesId) : undefined}
                      onOpenChat={() => { setChatProjectId(project.id); setOpenMenuProjectId(null); }}
                      onChangeStatus={canManageProjectStatus(project.id) ? (status) => changeProjectStatus(project.id, status) : undefined}
                      statusOptions={selectedRole === "Customer" ? clientProjectStatuses : projectStatuses}
                      isMenuOpen={openMenuProjectId === `card:${project.id}`}
                      onToggleMenu={() => {
                        setOpenStatusProjectId(null);
                        setIsFilterOpen(false);
                        setOpenMenuProjectId((current) => (current === `card:${project.id}` ? null : `card:${project.id}`));
                      }}
                      studioName={resolvedStudioName}
                    />
                  ))}
                </div>
              ) : (
                <div className="customer-production-empty">
                  <strong className="headings-2xs-bold">No videos in production</strong>
                  <span className="label-s">{displayProjects.length === 0 ? "Videos appear here when they enter production." : "Your planned videos appear in All videos."}</span>
                  <Button size="S" variant="secondary" className="customer-dashboard-secondary-button" type="button" onClick={() => document.getElementById("customer-all-videos-title")?.scrollIntoView({ behavior: "smooth" })}>View all videos</Button>
                </div>
              )}
            </section>

            <section className="customer-queue-section customer-all-videos-section" aria-labelledby="customer-all-videos-title">
              <div className="customer-queue-heading-row">
                <div>
                  <h2 className="headings-s-bold" id="customer-all-videos-title">All videos ({displayProjects.length})</h2>
                </div>
                <div className="customer-queue-header-actions">
                  <div className="customer-dashboard-filter-wrap">
                    <label className="customer-dashboard-filter-label label-xs-semibold" htmlFor={groupingFieldId}>Video grouping</label>
                    <BriskSelect<QueueScope>
                      id={groupingFieldId}
                      ariaLabel="Video grouping"
                      placeholder="All videos"
                      value={queueScope}
                      options={queueScopes.map((scope) => ({ value: scope, label: scope }))}
                      clearable={false}
                      open={isFilterOpen}
                      onOpenChange={(open) => {
                        setIsFilterOpen(open);
                        if (open) {
                          setOpenMenuProjectId(null);
                          setOpenStatusProjectId(null);
                        }
                      }}
                      onChange={(scope) => {
                        if (scope) setQueueScope(scope);
                        setIsFilterOpen(false);
                      }}
                    />
                  </div>
                </div>
              </div>

              <FilterGroup aria-label="Video status">
                {queueTabs.map((tab) => (
                  <FilterButton
                    key={tab}
                    aria-label={`${tab === "Active" ? "In production" : tab}. ${queueTabDescriptions[tab]}`}
                    selected={selectedTab === tab}
                    count={getTabCount(displayProjects, tab)}
                    data-tooltip={queueTabDescriptions[tab]}
                    onClick={() => setSelectedTab(tab)}
                  >
                    {tab === "Active" ? "In production" : tab}
                  </FilterButton>
                ))}
              </FilterGroup>

              <div className="customer-queue-table" role="table" aria-label={`${selectedTab} videos`}>
                <div className="customer-queue-table-header label-xs-semibold" role="row">
                  <span role="columnheader">Video</span>
                  <span role="columnheader">Progress</span>
                  <span role="columnheader">Status</span>
                  <span role="columnheader">Created</span>
                </div>

                {visibleQueueEntries.map((entry) => {
                  if (entry.kind === "project") {
                    return (
                      <QueueProjectRow
                        readOnly={samplePreview}
                        canManageTeam={selectedRole === "Studio Staff" && !isStudioPreview}
                        clientName={clientName}
                        interactive={canReorderQueue}
                        isDragging={dragItem?.token === entry.token}
                        isDropTarget={dropTargetToken === entry.token}
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
                        onSetDropTarget={() => setDropTargetToken(entry.token)}
                        onOpenChat={() => setChatProjectId(entry.project.id)}
                        onMoveUp={canReorderQueue && visibleQueueEntries.indexOf(entry) > 0
                          ? () => moveTopLevelEntry(entry.token, visibleQueueEntries[visibleQueueEntries.indexOf(entry) - 1].token) : undefined}
                        onMoveDown={canReorderQueue && visibleQueueEntries.indexOf(entry) < visibleQueueEntries.length - 1
                          ? () => moveTopLevelEntry(entry.token, visibleQueueEntries[visibleQueueEntries.indexOf(entry) + 1].token) : undefined}
                        onStart={() => startProject(entry.project.id)}
                        canManageStatus={canManageProjectStatus(entry.project.id)}
                        canStartProduction={canManageProjectStatus(entry.project.id)}
                        isStatusMenuOpen={openStatusProjectId === entry.project.id}
                        statusOptions={selectedRole === "Customer" ? clientProjectStatuses : projectStatuses}
                        onToggleStatusMenu={() => {
                          setOpenMenuProjectId(null);
                          setIsFilterOpen(false);
                          setOpenStatusProjectId((current) => (current === entry.project.id ? null : entry.project.id));
                        }}
                        onChangeStatus={(status) => changeProjectStatus(entry.project.id, status)}
                        isMenuOpen={openMenuProjectId === `row:${entry.project.id}`}
                        onToggleMenu={() => {
                          setOpenStatusProjectId(null);
                          setIsFilterOpen(false);
                          setOpenMenuProjectId((current) => (current === `row:${entry.project.id}` ? null : `row:${entry.project.id}`));
                        }}
                        studioName={resolvedStudioName}
                      />
                    );
                  }

                  const allChildren = getSeriesChildren(entry.series, seriesChildOrder, projectsById);
                  const latestAction = getLatestSeriesAction(allChildren);
                  const isExpanded = expandedSeriesIds.includes(entry.series.id);

                  return (
                    <div className="customer-series-group" role="rowgroup" key={entry.token}>
                      <div
                        role="row"
                        className={`customer-series-row${canReorderQueue ? " is-reorderable" : ""}${dragItem?.token === entry.token ? " is-dragging" : ""}${dropTargetToken === entry.token ? " is-drop-target" : ""}`}
                        draggable={canReorderQueue}
                        onDragStart={canReorderQueue ? (event) => beginDrag(event, { kind: "top-level", token: entry.token }) : undefined}
                        onDragEnter={canReorderQueue ? (event) => {
                          event.preventDefault();
                          setDropTargetToken(entry.token);
                        } : undefined}
                        onDragEnd={canReorderQueue ? finishDrag : undefined}
                        onDragOver={canReorderQueue ? (event) => event.preventDefault() : undefined}
                        onDrop={canReorderQueue ? (event) => {
                          event.preventDefault();
                          if (dragItem?.kind === "top-level" || dragItem?.kind === "project") {
                            moveTopLevelEntry(dragItem.token, entry.token);
                          }
                          finishDrag();
                        } : undefined}
                      >
                        <div className="customer-series-primary" role="cell">
                          <span className="customer-series-tag label-xs-semibold">SERIES</span>
                          <ProjectTitleRow label={`Quick actions for ${entry.series.name}`}
                            title={<strong className="project-title heading-3xs">{entry.series.name}</strong>}
                            actions={<>
                          {canReorderQueue ? <span className="customer-queue-drag" aria-hidden="true">
                            <DsIcon name="dots-six-vertical" size={18} />
                          </span> : null}
                          <button
                            className="project-quick-action"
                            type="button"
                            aria-label={`Open ${entry.series.name} conversations`}
                            onClick={() => setChatProjectId(entry.visibleChildren[0]?.id ?? null)}
                          >
                            <DsIcon name="chats" size={20} />
                          </button>
                          <button
                            className="project-quick-action customer-series-toggle"
                            type="button"
                            aria-expanded={isExpanded}
                            aria-label={`${isExpanded ? "Collapse" : "Expand"} ${entry.series.name} series`}
                            data-tooltip={isExpanded ? "Collapse series" : "Expand series"}
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
                            </>} />
                          <span className="customer-latest-action label-xs">
                            {latestAction.label} · {formatRelativeTime(latestAction.timestamp)}
                          </span>
                        </div>
                        <span className="customer-series-summary" role="cell">
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

                      </div>

                      {isExpanded
                        ? entry.visibleChildren.map((project) => (
                            <QueueProjectRow
                              readOnly={samplePreview}
                              canManageTeam={selectedRole === "Studio Staff" && !isStudioPreview}
                              clientName={clientName}
                              key={project.id}
                              project={project}
                              child
                              interactive={canReorderQueue}
                              isDragging={dragItem?.token === `child:${project.id}`}
                              isDropTarget={dropTargetToken === `child:${project.id}`}
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
                              onSetDropTarget={() => setDropTargetToken(`child:${project.id}`)}
                              onOpenChat={() => setChatProjectId(project.id)}
                              onMoveUp={canReorderQueue && entry.visibleChildren.indexOf(project) > 0
                                ? () => moveSeriesChild(entry.series.id, project.id, entry.visibleChildren[entry.visibleChildren.indexOf(project) - 1].id) : undefined}
                              onMoveDown={canReorderQueue && entry.visibleChildren.indexOf(project) < entry.visibleChildren.length - 1
                                ? () => moveSeriesChild(entry.series.id, project.id, entry.visibleChildren[entry.visibleChildren.indexOf(project) + 1].id) : undefined}
                              onStart={() => startProject(project.id)}
                              canManageStatus={canManageProjectStatus(project.id)}
                              canStartProduction={canManageProjectStatus(project.id)}
                              isStatusMenuOpen={openStatusProjectId === project.id}
                              statusOptions={selectedRole === "Customer" ? clientProjectStatuses : projectStatuses}
                              onToggleStatusMenu={() => {
                                setOpenMenuProjectId(null);
                                setIsFilterOpen(false);
                                setOpenStatusProjectId((current) => (current === project.id ? null : project.id));
                              }}
                              onChangeStatus={(status) => changeProjectStatus(project.id, status)}
                              isMenuOpen={openMenuProjectId === `row:${project.id}`}
                              onToggleMenu={() => {
                                setOpenStatusProjectId(null);
                                setIsFilterOpen(false);
                                setOpenMenuProjectId((current) => (current === `row:${project.id}` ? null : `row:${project.id}`));
                              }}
                              studioName={resolvedStudioName}
                            />
                          ))
                        : null}
                    </div>
                  );
                })}

                {visibleQueueEntries.length === 0 ? (
                  <div className="customer-queue-empty">
                    <span className="customer-queue-empty-icon"><DsIcon name="queue" size={24} /></span>
                    <strong className="headings-2xs-bold">{isQueueFilteredEmpty ? "No videos in this view" : displayProjects.length === 0 ? "No videos yet" : "Plan your next video"}</strong>
                    <p className="paragraph-s">{isQueueFilteredEmpty ? "There are no videos matching this status or filter." : displayProjects.length === 0 ? "Start a video to begin the Brief. Your videos will appear here." : "Add videos here to plan ahead. Drag any into production when you’re ready."}</p>
                    {!samplePreview && (isQueueFilteredEmpty || displayProjects.length > 0) ? <Button size="S" variant={isQueueFilteredEmpty ? "secondary" : "primary"}
                      type="button"
                      onClick={isQueueFilteredEmpty ? clearQueueControls : startVideo}
                    >
                      {isQueueFilteredEmpty ? "Show all videos" : "Start Video"}
                    </Button> : null}
                  </div>
                ) : null}
              </div>
            </section>
          </div>

        </div>
        {isClientView ? <footer className="customer-dashboard-footer label-xs">Powered by Brisk</footer> : null}
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
            <ActivityPanel
              activity={visibleActivity}
              clientName={clientName}
              empty={previewState === "empty" || isScenarioEmpty || visibleActivity.length === 0}
              onClose={() => setIsActivityOpen(false)}
            />
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
              clientName={clientName}
              initialProjectId={chatProjectId}
            />
          </aside>
        </div>
      ) : null}

      {toast ? <div className="customer-dashboard-toast label-s-semibold" role="status">{toast}</div> : null}
    </main>
  );
}

function ActivityPanel({
  projectName,
  activity,
  clientName,
  empty,
  onClose,
}: {
  activity: CustomerDashboardActivity[];
  projectName?: string;
  clientName: string;
  empty: boolean;
  onClose: () => void;
}) {
  return (
    <section className="customer-activity-panel" aria-labelledby="customer-activity-title">
      <div className="customer-activity-heading">
        <div>
          <h2 className="headings-2xs-bold" id="customer-activity-title">Latest activity</h2>
          <span className="label-xs">{projectName ? `Activity for ${projectName}` : `Across all ${clientName} videos`}</span>
        </div>
        <span className="customer-activity-filter label-xs-semibold">All</span>
      </div>
      <div className="customer-activity-list">
        {empty ? (
          <div className="customer-activity-empty">
            <span className="customer-queue-empty-icon" aria-hidden="true"><DsIcon name="clock-clockwise" size={24} /></span>
            <h3 className="headings-2xs-bold">No activity yet</h3>
            <p className="paragraph-s">Approvals, uploads, messages and status changes will appear here.</p>
            <Button size="S" variant="secondary" className="customer-dashboard-secondary-button" type="button" onClick={onClose}>View videos</Button>
          </div>
        ) : (projectName ? activity : activity.slice(0, 10)).map((activity) => {
          const activityContent = (
            <>
              <span className="customer-activity-icon"><DsIcon name={activity.icon} size={16} /></span>
              <span className="customer-activity-copy label-xs">
                <span>
                  <strong>{activity.actor}</strong> {activity.action} {activity.object}
                </span>
                <span>{activity.projectLabel} · {projectName ? new Date(activity.timestamp).toLocaleString("en-AU", { dateStyle: "medium", timeStyle: "short" }) : formatRelativeTime(activity.timestamp)}</span>
              </span>
              <DsIcon name="caret-right" size={13} />
            </>
          );

          return <Link className="customer-activity-row" href={activity.href} key={activity.id}>
            {activityContent}
          </Link>;
        })}
      </div>
    </section>
  );
}

function ProductionCard({
  readOnly = false,
  clientName,
  interactive,
  canManageTeam,
  project,
  needsReview = false,
  series,
  onOpenChat,
  onChangeStatus,
  statusOptions,
  isMenuOpen,
  onToggleMenu,
  studioName,
}: {
  readOnly?: boolean;
  clientName: string;
  interactive: boolean;
  canManageTeam: boolean;
  project: CustomerDashboardProject;
  needsReview?: boolean;
  series?: CustomerDashboardSeries;
  onOpenChat: () => void;
  onChangeStatus?: (status: CustomerDashboardStatus) => void;
  statusOptions?: CustomerDashboardStatus[];
  isMenuOpen: boolean;
  onToggleMenu: () => void;
  studioName: string;
}) {
  const projectHref = getProjectEntryHref(project);

  return (
    <article className="customer-production-card">
      {!readOnly ? (
        <Link
          className="customer-project-surface-link"
          href={projectHref}
          aria-label={`Open ${project.name}`}
          draggable={false}
        />
      ) : null}
      <div className="customer-production-card-top">
        <div className="customer-production-card-copy">
          <span className="customer-project-code label-xs-semibold">{project.code}</span>
          <CustomerProjectDestination className="customer-production-card-title headings-2xs-bold" project={project} />
          {!needsReview ? (
            <span className="customer-project-next-step label-s">{getProgressStatusSentence(project, studioName)}</span>
          ) : null}
          <span className="customer-latest-action label-xs">
            {getLatestActionCopy(project, needsReview)}
          </span>
          {needsReview ? (
            readOnly ? (
              <span className="customer-dashboard-primary-button customer-project-primary-action label-s-semibold">
                {getClientActionLabel(project)}
                <DsIcon name="arrow-right" size={16} />
              </span>
            ) : (
              <Link className="customer-dashboard-primary-button customer-project-primary-action label-s-semibold" href={projectHref}>
                {getClientActionLabel(project)}
                <DsIcon name="arrow-right" size={16} />
              </Link>
            )
          ) : null}
          {series ? (
            <div className="customer-production-card-tags">
              <span className="customer-series-chip label-xs-semibold">Series: {series.name}</span>
            </div>
          ) : null}
        </div>
      </div>
      <div className="customer-production-card-actions">
        {readOnly ? (
          <>
            <span className="customer-dashboard-icon-button" aria-hidden="true">
              <DsIcon name="chats" size={18} />
              <CommentCountBadge count={project.unreadMessages} label={`${project.unreadMessages} unread messages`} />
            </span>
            <span className="customer-dashboard-icon-button customer-dashboard-menu-trigger" aria-hidden="true">
              <DsIcon name="dots-three" size={18} />
            </span>
          </>
        ) : (
          <>
            <button className="customer-dashboard-icon-button" type="button" aria-label={`Open chat for ${project.name}`} onClick={onOpenChat}>
              <DsIcon name="chats" size={18} />
              <CommentCountBadge count={project.unreadMessages} label={`${project.unreadMessages} unread messages`} />
            </button>
            <div className="customer-project-menu-wrap">
                <ProjectActionsMenu
                  isOpen={isMenuOpen}
                  onToggle={onToggleMenu}
                  project={project}
                  canManageTeam={canManageTeam}
                  onOpenChat={onOpenChat}
                  onChangeStatus={onChangeStatus}
                  statusOptions={statusOptions}
                />
            </div>
          </>
        )}
      </div>

      <div className="customer-client-stage-progress" inert={readOnly ? true : undefined}>
        <StageProgress
          showAge={false}
          projectId={project.id}
          projectName={project.name}
          stages={project.stages}
          studioName={studioName}
          customerName={clientName}
        />
      </div>
    </article>
  );
}

function QueueProjectRow({
  readOnly = false,
  canManageStatus,
  canStartProduction,
  canManageTeam,
  clientName,
  project,
  child = false,
  interactive,
  isDragging,
  isDropTarget,
  dragItem,
  onDragStart,
  onDragEnd,
  onDropTopLevel,
  onSetDropTarget,
  onOpenChat,
  onMoveUp,
  onMoveDown,
  onStart,
  isStatusMenuOpen,
  statusOptions,
  onToggleStatusMenu,
  onChangeStatus,
  isMenuOpen,
  onToggleMenu,
  studioName,
}: {
  readOnly?: boolean;
  canManageStatus: boolean;
  canStartProduction: boolean;
  canManageTeam: boolean;
  clientName: string;
  project: CustomerDashboardProject;
  child?: boolean;
  interactive: boolean;
  isDragging: boolean;
  isDropTarget: boolean;
  dragItem: DragItem;
  onDragStart: (event: ReactDragEvent<HTMLElement>, item: DragItem) => void;
  onDragEnd: () => void;
  onDropTopLevel: () => void;
  onSetDropTarget: () => void;
  onOpenChat: () => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  onStart: () => void;
  isStatusMenuOpen: boolean;
  statusOptions: CustomerDashboardStatus[];
  onToggleStatusMenu: () => void;
  onChangeStatus: (status: CustomerDashboardStatus) => void;
  isMenuOpen: boolean;
  onToggleMenu: () => void;
  studioName: string;
}) {
  const projectHref = getProjectEntryHref(project);

  return (
    <div
      className={`customer-queue-row ${child ? "series-child" : ""}${interactive ? " is-reorderable" : ""}${isDragging ? " is-dragging" : ""}${isDropTarget ? " is-drop-target" : ""}`}
      role="row"
      draggable={interactive}
      onDragStart={interactive ? (event) => onDragStart(event, dragItem) : undefined}
      onDragEnd={interactive ? onDragEnd : undefined}
      onDragEnter={interactive ? (event) => {
        event.preventDefault();
        onSetDropTarget();
      } : undefined}
      onDragOver={interactive ? (event) => {
        event.preventDefault();
        event.dataTransfer.dropEffect = "move";
      } : undefined}
      onDrop={interactive ? (event) => {
        event.preventDefault();
        onDropTopLevel();
        onDragEnd();
      } : undefined}
    >
      {!readOnly ? (
        <Link
          className="customer-project-surface-link"
          href={projectHref}
          aria-label={`Open ${project.name}`}
          draggable={false}
        />
      ) : null}
      {interactive ? <span className="customer-queue-drag" aria-hidden="true"><DsIcon name="dots-six-vertical" size={18} /></span> : null}
      <div className="customer-queue-project" role="cell">
        <span className="client-badge label-xs-semibold">{project.code}</span>
        <ProjectTitleRow
          label={`Quick actions for ${project.name}`}
          title={<CustomerProjectDestination className="project-title heading-3xs" project={project} />}
          actions={!readOnly ? <>
            <button className="project-quick-action" type="button" aria-label={`Open chat for ${project.name}`} onClick={onOpenChat}>
              <DsIcon name="chats" size={20} />
              <CommentCountBadge count={project.unreadMessages} label={`${project.unreadMessages} unread messages`} />
            </button>
            {(project.status === "Queued" || project.status === "In Production") && canStartProduction
              ? <StartProductionAction projectName={project.name} onStart={onStart}
                  inProduction={project.status === "In Production"} /> : null}
            <div className="customer-project-menu-wrap">
                <ProjectActionsMenu
                  compactTrigger
                  isOpen={isMenuOpen}
                  onToggle={onToggleMenu}
                  project={project}
                  canManageTeam={canManageTeam}
                  onChangeStatus={canManageStatus ? onChangeStatus : undefined}
                  onOpenStatus={canManageStatus ? onToggleStatusMenu : undefined}
                  onMoveUp={onMoveUp}
                  onMoveDown={onMoveDown}
                  onOpenChat={onOpenChat}
                  onStart={canManageStatus && interactive ? onStart : undefined}
                  statusOptions={canManageStatus ? statusOptions : undefined}
                />
            </div>
          </> : null}
        />
        {!readOnly ? <ClientVideoTags projectId={project.id} projectName={project.name} /> : null}
      </div>
      <div className="customer-queue-progress" role="cell">
        <div className="customer-client-stage-progress" inert={interactive ? undefined : true}>
          <StageProgress
            compact
            showAge={false}
            projectId={project.id}
            projectName={project.name}
            stages={project.stages}
            studioName={studioName}
            customerName={clientName}
          />
        </div>
      </div>
      <div className="customer-queue-status" role="cell">
        {canManageStatus ? <ProjectStatusControl
          project={project}
          isOpen={isStatusMenuOpen}
          onToggle={onToggleStatusMenu}
          onChange={onChangeStatus}
          statusOptions={statusOptions}
        /> : <span className={`status-pill status-${toStatusClass(project.status)} label-xs-semibold`}>{project.status}</span>}
      </div>
      <time className="customer-queue-created label-xs" dateTime={project.createdAt} role="cell">
        {formatCreatedDate(project.createdAt)}
      </time>

    </div>
  );
}

function ProjectStatusControl({
  project,
  isOpen,
  onToggle,
  onChange,
  statusOptions,
}: {
  project: CustomerDashboardProject;
  isOpen: boolean;
  onToggle: () => void;
  onChange: (status: CustomerDashboardStatus) => void;
  statusOptions: CustomerDashboardStatus[];
}) {
  return <div className="customer-status-control"><BriskSelect<string>
    mode="action"
    value=""
    clearable={false}
    ariaLabel={`Change status for ${project.name}. Current status: ${project.status}`}
    placeholder="Change video status"
    open={isOpen}
    onOpenChange={(nextOpen) => { if (nextOpen !== isOpen) onToggle(); }}
    options={statusOptions.filter((status) => status !== project.status).map((status) => ({
      value: status, label: projectStatusActions[status].label, icon: projectStatusActions[status].icon,
    }))}
    onChange={(status) => onChange(status as CustomerDashboardStatus)}
    actionTrigger={(props) => <button {...props}
      className={`status-pill status-${toStatusClass(project.status)} customer-status-trigger customer-dashboard-menu-trigger label-xs-semibold`}
      type="button">
      {project.status}<DsIcon name="caret-down" size={12} />
    </button>}
  /></div>;
}

function ProjectActionsMenu({
  compactTrigger = false,
  project,
  isOpen,
  onToggle,
  onStart,
  onChangeStatus,
  onOpenStatus,
  statusOptions,
  onOpenChat,
  onMoveUp,
  onMoveDown,
  canManageTeam = false,
}: {
  compactTrigger?: boolean;
  project: CustomerDashboardProject;
  isOpen: boolean;
  onToggle: () => void;
  onStart?: () => void;
  onChangeStatus?: (status: CustomerDashboardStatus) => void;
  onOpenStatus?: () => void;
  statusOptions?: CustomerDashboardStatus[];
  onOpenChat?: () => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  canManageTeam?: boolean;
}) {
  const { state } = usePrototypeState();
  const viewer = usePrototypeViewer();
  const { canManageClientAccount, selectedRole } = usePrototypeRole();
  const isPreview = useSearchParams().get("studio-preview") === "1";
  const { openInvitePerson } = useInvitations();
  const [history, setHistory] = useState<CustomerDashboardActivity[] | null>(null);
  const [sharePanelSignal, setSharePanelSignal] = useState(0);
  const scopedProject = state.projects.find((candidate) => candidate.id === project.id
    && candidate.workspaceId === state.session.activeWorkspaceId);
  const client = state.clients.find((candidate) => candidate.id === scopedProject?.clientId
    && candidate.workspaceId === state.session.activeWorkspaceId);
  const canInvite = Boolean(!isPreview && scopedProject && client && canViewProject(viewer, scopedProject, state)
    && (canManageClientAccount || (selectedRole === "Studio Staff" && canManageTeam)));

  function showHistory() {
    if (!scopedProject || !canViewProject(viewer, scopedProject, state)) return;
    const reviews: CustomerDashboardActivity[] = readSharedReviewActivity(
      sharedReviewActivityStorageKey(scopedProject.workspaceId, project.id),
    ).filter((entry) => entry.company === client?.name).map((entry) => ({
      id: entry.id, actor: entry.actor, action: entry.message, object: "",
      projectId: project.id, projectLabel: project.name, timestamp: entry.occurredAt,
      icon: "clock-clockwise", href: entry.href,
    }));
    setHistory([
      ...customerDashboardActivity.filter((entry) => entry.projectId === project.id),
      ...readClientVideoHistory(scopedProject.workspaceId, project.id),
      ...reviews,
    ].sort((left, right) => Date.parse(right.timestamp) - Date.parse(left.timestamp)));
  }

  const commands: Array<BriskSelectOption<string> & { run?: () => void }> = [
    ...(project.status === "Queued" && onStart && !onChangeStatus ? [{ value: "start", label: "Move to In Production", icon: "play" as const, run: onStart }] : []),
    ...(onOpenChat ? [{ value: "chat", label: "Go to chat", icon: "chats" as const, run: onOpenChat }] : []),
    { value: "history", label: "See history", icon: "clock-clockwise", run: showHistory },
    { value: "open", label: "Open project", icon: "folder", href: getProjectEntryHref(project) },
    ...(onOpenStatus ? [{ value: "status", label: "Change status", icon: "arrows-clockwise" as const, run: onOpenStatus }] : []),
    ...(scopedProject && canViewProject(viewer, scopedProject, state)
      ? [{ value: "share", label: "Share", icon: "share-network" as const, run: () => setSharePanelSignal((signal) => signal + 1) }] : []),
    ...(canInvite && client ? [{ value: "invite", label: "Invite teammate", icon: "user-plus" as const,
      run: () => openInvitePerson({ role: "Customer", clientId: client.id, projectIds: [project.id] }),
    }] : []),
    ...(canManageTeam ? [{ value: "team", label: "Manage teammates", href: `/projects/${encodeURIComponent(project.id)}` }] : []),
    ...(onMoveUp ? [{ value: "up", label: "Move up in queue", run: onMoveUp }] : []),
    ...(onMoveDown ? [{ value: "down", label: "Move down in queue", run: onMoveDown }] : []),
    ...(onChangeStatus && statusOptions && !onOpenStatus ? statusOptions.filter((status) => status !== project.status).map((status) => ({
      value: `status-${status}`,
      label: projectStatusActions[status].label,
      icon: projectStatusActions[status].icon,
      run: () => onChangeStatus(status),
    })) : []),
  ];

  return <>
  <BriskSelect
    mode="action"
    value=""
    clearable={false}
    ariaLabel={`Open actions for ${project.name}`}
    placeholder="Project actions"
    open={isOpen}
    onOpenChange={(nextOpen) => { if (nextOpen !== isOpen) onToggle(); }}
    options={commands}
    onChange={(value) => commands.find((command) => command.value === value)?.run?.()}
    actionTrigger={(props) => compactTrigger
      ? <button {...props} type="button" className="project-quick-action customer-dashboard-menu-trigger"
          aria-label={`Open actions for ${project.name}`}><DsIcon name="dots-three" size={20} /></button>
      : <IconButton {...props} className="customer-dashboard-menu-trigger" aria-label={`Open actions for ${project.name}`} tooltipAlign="end"><DsIcon name="dots-three" size={18} /></IconButton>}
  />
  {sharePanelSignal > 0 && scopedProject ? <ShareActionRow
    context="project"
    scopeType="project"
    projectId={scopedProject.id}
    projectName={project.name}
    shareTitle={project.name}
    studioName={state.workspaces.find((workspace) => workspace.id === scopedProject.workspaceId)?.name}
    customerName={client?.name}
    userRole={selectedRole}
    shareUrl={`/projects/${encodeURIComponent(project.id)}`}
    sharePanelPresentation="dialog"
    openPanelSignal={sharePanelSignal}
    showCopyLink={false}
    showSend={false}
    showApprove={false}
    canConfigureLink={selectedRole === "Studio Staff" || canManageClientAccount}
  /> : null}
  {history !== null ? <EditingDialog title={`History - ${project.name}`} onCancel={() => setHistory(null)}
    actions={<Button size="S" variant="secondary" onClick={() => setHistory(null)}>Close</Button>}>
    <ActivityPanel activity={history} clientName={client?.name ?? "Client"} projectName={project.name}
      empty={history.length === 0} onClose={() => setHistory(null)} />
  </EditingDialog> : null}
  </>;
}

function CustomerProjectDestination({
  className,
  project,
}: {
  className: string;
  project: CustomerDashboardProject;
}) {
  return <span className={className}>{project.name}</span>;
}

function getCurrentStageLabel(project: CustomerDashboardProject) {
  const activeStage = stageOrder.find(({ key }) => {
    const state = project.stages[key].state;
    return state === "in_progress" || state === "waiting";
  });

  if (activeStage) return activeStage.label;

  const nextStage = stageOrder.find(({ key }) => project.stages[key].state === "not_started");
  return nextStage?.label ?? "Masters";
}

function getProgressStatusSentence(project: CustomerDashboardProject, studioName: string) {
  const stage = getCurrentStageLabel(project).toLowerCase();

  if (stage === "shoot") return `Waiting on ${studioName} to prepare the shoot`;
  if (stage === "edit") return `Waiting on ${studioName} to edit the video`;
  if (stage === "script") return `Waiting on ${studioName} to write the script`;
  if (stage === "masters") return `Waiting on ${studioName} to prepare the masters`;
  return `Waiting on ${studioName} to work on the ${stage}`;
}

function getLatestActionCopy(project: CustomerDashboardProject, needsReview: boolean) {
  const relativeTime = formatRelativeTime(project.latestAction.timestamp);

  if (needsReview && project.latestAction.label.toLowerCase().includes("shared")) {
    return `${project.latestAction.label} · ${formatRelativeTimeWords(project.latestAction.timestamp)}`;
  }

  return needsReview ? `Updated ${relativeTime}` : `${project.latestAction.label} · ${relativeTime}`;
}

function formatRelativeTimeWords(timestamp: string) {
  const differenceInHours = Math.max(1, Math.round((dashboardReferenceDate.getTime() - new Date(timestamp).getTime()) / (1000 * 60 * 60)));

  if (differenceInHours < 24) return `${differenceInHours} ${differenceInHours === 1 ? "hour" : "hours"} ago`;

  const differenceInDays = Math.round(differenceInHours / 24);
  return `${differenceInDays} ${differenceInDays === 1 ? "day" : "days"} ago`;
}

function getClientActionLabel(project: CustomerDashboardProject) {
  const stage = getCurrentStageLabel(project).toLowerCase();

  if (stage === "edit") return "Review edit";
  if (stage === "script") return "Approve script";
  if (stage === "masters") return "Review masters";
  if (stage === "shoot") return "Confirm shoot details";
  return `Review ${stage}`;
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
  if (projects.length > 0 && projects.every((project) => project.status === "In Production")) {
    return `${projects.length} active ${projects.length === 1 ? "video" : "videos"}`;
  }

  const labels = getSeriesStatusLabels(projects).map((status) => {
    const count = projects.filter((project) => project.status === status).length;
    return `${count} ${status.toLowerCase()}`;
  });

  const videoLabel = projects.length === 1 ? "video" : "videos";
  return `${projects.length} ${videoLabel}${labels.length > 0 ? `, ${labels.join(", ")}` : ""}`;
}

function getSeriesStatusLabels(projects: CustomerDashboardProject[]) {
  const statusOrder: CustomerDashboardStatus[] = ["In Production", "Queued", "Completed", "Paused", "Archived"];
  return statusOrder.filter((status) => projects.some((project) => project.status === status));
}

function getOldestCreatedAt(projects: CustomerDashboardProject[]) {
  return [...projects].sort((left, right) => left.createdAt.localeCompare(right.createdAt))[0]?.createdAt ?? "";
}

function getTabCount(projects: CustomerDashboardProject[], tab: QueueTab) {
  if (tab === "All") return projects.length;
  if (tab === "Active") return projects.filter((project) => project.status === "In Production").length;
  return projects.filter((project) => project.status === tab).length;
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

function createInitialQueueOrder(projects: CustomerDashboardProject[]) {
  return Array.from(
    new Set(
      [...projects]
        .sort((left, right) => right.createdAt.localeCompare(left.createdAt))
        .map((project) => project.seriesId ? `series:${project.seriesId}` : `project:${project.id}`),
    ),
  );
}

function createInitialSeriesChildOrder(
  projects: CustomerDashboardProject[],
  seriesItems: CustomerDashboardSeries[],
) {
  const projectsById = new Map(projects.map((project) => [project.id, project]));

  return Object.fromEntries(
    seriesItems.map((series) => [
      series.id,
      [...series.childProjectIds].sort((leftId, rightId) =>
        (projectsById.get(rightId)?.createdAt ?? "").localeCompare(projectsById.get(leftId)?.createdAt ?? ""),
      ),
    ]),
  );
}

function normaliseQueueOrder(storedOrder: string[], initialQueueOrder: string[]) {
  const knownTokens = new Set(initialQueueOrder);
  const validStoredTokens = storedOrder.filter((token) => knownTokens.has(token));
  return [...validStoredTokens, ...initialQueueOrder.filter((token) => !validStoredTokens.includes(token))];
}

function normaliseSeriesChildOrder(
  storedOrder: Record<string, string[]>,
  seriesItems: CustomerDashboardSeries[],
) {
  return Object.fromEntries(
    seriesItems.map((series) => {
      const storedChildren = Array.isArray(storedOrder[series.id]) ? storedOrder[series.id] : [];
      const validStoredChildren = storedChildren.filter((projectId) => series.childProjectIds.includes(projectId));
      return [
        series.id,
        [...validStoredChildren, ...series.childProjectIds.filter((projectId) => !validStoredChildren.includes(projectId))],
      ];
    }),
  );
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
