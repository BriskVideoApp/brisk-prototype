"use client";

import Link from "next/link";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { StageProgress } from "@/components/active-videos/StageProgress";
import { CustomerDashboard } from "@/components/customer-dashboard/CustomerDashboard";
import { usePrototypeState } from "@/components/prototype-state/PrototypeStateContext";
import { getStudioBrandThemeStyle } from "@/components/studio-onboard/studioBrandTheme";
import { DsIcon } from "@/components/video-review/DsIcon";
import {
  customerDashboardActivity,
  customerDashboardProjects,
  customerDashboardSeries,
  type CustomerDashboardProject,
} from "@/data/customer-dashboard";
import { selectClientPortalData, selectScopedClient, selectWorkspace, type ScopedProject } from "@/data/prototype-state";

type ClientPortalScreenProps = {
  workspaceId: string;
  clientId: string;
  studioPreview?: boolean;
  embedded?: boolean;
};

export function ClientPortalScreen({ workspaceId, clientId, studioPreview = false, embedded = false }: ClientPortalScreenProps) {
  const { state } = usePrototypeState();
  const portal = selectClientPortalData(
    state,
    workspaceId,
    clientId,
    studioPreview ? { kind: "studio-preview" } : { kind: "external" },
  );

  if (!portal) return <ClientPortalUnavailable embedded={embedded} />;

  const inProduction = portal.projects.filter((project) => project.status === "In Production");
  const queued = portal.projects.filter((project) => project.status === "Queued");
  const dashboardProjects = createDashboardProjects(portal.projects);
  const dashboardProjectIds = new Set(dashboardProjects.map((project) => project.id));
  const dashboardSeries = customerDashboardSeries
    .map((series) => ({
      ...series,
      childProjectIds: series.childProjectIds.filter((projectId) => dashboardProjectIds.has(projectId)),
    }))
    .filter((series) => series.childProjectIds.length > 0);
  const dashboardActivity = customerDashboardActivity.filter((item) => dashboardProjectIds.has(item.projectId));

  if (!embedded) {
    return (
      <CustomerDashboard
        activity={dashboardActivity}
        brandAccentId={portal.workspace.brandAccentId}
        clientName={portal.client.name}
        initialProjects={dashboardProjects}
        initialSeries={dashboardSeries}
        key={`${workspaceId}:${clientId}`}
        logoPreviewUrl={portal.workspace.logoPreviewUrl}
        storageScopeKey={`${workspaceId}:${clientId}`}
        studioName={portal.workspace.name}
      />
    );
  }

  return (
    <main
      className={`customer-dashboard-shell studio-client-accent-${portal.workspace.brandAccentId} ${studioPreview ? "is-studio-preview" : "is-client-view"} ${embedded ? "is-embedded" : ""}`}
      style={getStudioBrandThemeStyle(portal.workspace)}
    >
      <div className="customer-dashboard-main">
        <header className="customer-dashboard-header">
          <div className="customer-dashboard-heading">
            <span className="customer-dashboard-studio-logo label-m-semibold" aria-hidden="true">
              {portal.workspace.name.split(/\s+/u).map((part) => part.charAt(0)).slice(0, 2).join("")}
            </span>
            <div>
              <span className="label-xs">{portal.client.name} Client portal</span>
              <h1>Your videos</h1>
            </div>
          </div>
          {studioPreview ? <span className="customer-portal-preview-badge label-xs-semibold"><DsIcon name="eye" size={14} /> Studio preview</span> : null}
        </header>

        <div className="customer-dashboard-layout">
          <div className="customer-dashboard-content">
            <PortalProjectSection
              clientName={portal.client.name}
              heading={`In production (${inProduction.length})`}
              projects={inProduction}
              studioName={portal.workspace.name}
              emptyCopy="No videos are in production yet."
            />
            <PortalProjectSection
              clientName={portal.client.name}
              heading={`Queue (${queued.length})`}
              projects={queued}
              studioName={portal.workspace.name}
              emptyCopy="There are no queued videos."
            />
          </div>
        </div>
      </div>
    </main>
  );
}

function createDashboardProjects(projects: ScopedProject[]): CustomerDashboardProject[] {
  return projects.map((project) => {
    const existingProject = customerDashboardProjects.find((candidate) => candidate.id === project.id);

    return {
      ...(existingProject ?? {
        id: project.id,
        code: project.clientBadge,
        name: project.name,
        createdAt: project.latestUpdate.timestamp,
        latestAction: {
          label: project.latestUpdate.label,
          timestamp: project.latestUpdate.timestamp,
        },
        unreadMessages: project.unreadMessages ?? 0,
      }),
      id: project.id,
      name: project.name,
      status: project.status,
      statusDetail: getDashboardStatusDetail(project),
      stages: project.stages,
    };
  });
}

function getDashboardStatusDetail(project: ScopedProject): CustomerDashboardProject["statusDetail"] {
  if (project.status === "Completed") return "Approved";
  if (project.status === "Paused") return "Paused";
  if (project.status === "Archived") return "Archived";
  if (project.status === "Queued") return "Ready to start";

  return Object.values(project.stages).some((stage) => stage.state === "waiting")
    ? "Waiting on you"
    : "Waiting on studio";
}

export function LegacyClientPortalRoute() {
  const router = useRouter();
  const { state } = usePrototypeState();
  const { activeWorkspaceId, activeClientId } = state.session;
  const destinationIsVerified = Boolean(
    activeClientId
    && selectWorkspace(state, activeWorkspaceId)
    && selectScopedClient(state, activeWorkspaceId, activeClientId),
  );

  useEffect(() => {
    if (!destinationIsVerified || !activeClientId) return;
    router.replace(`/workspaces/${encodeURIComponent(activeWorkspaceId)}/clients/${encodeURIComponent(activeClientId)}/portal`);
  }, [activeClientId, activeWorkspaceId, destinationIsVerified, router]);

  if (!destinationIsVerified) return <ClientPortalUnavailable />;
  return <ClientPortalUnavailable title="Opening the verified Client portal" description="Taking you to the scoped Client workspace." />;
}

export function ClientPortalUnavailable({
  embedded = false,
  title = "Client portal unavailable",
  description = "This link does not identify an available workspace and Client. Ask the Studio for a new portal link.",
}: {
  embedded?: boolean;
  title?: string;
  description?: string;
}) {
  return (
    <main className={`customer-portal-unavailable ${embedded ? "is-embedded" : ""}`}>
      <span aria-hidden="true"><DsIcon name="lock" size={24} /></span>
      <h1 className="headings-s-bold">{title}</h1>
      <p className="paragraph-s">{description}</p>
    </main>
  );
}

function PortalProjectSection({
  clientName,
  emptyCopy,
  heading,
  projects,
  studioName,
}: {
  clientName: string;
  emptyCopy: string;
  heading: string;
  projects: ScopedProject[];
  studioName: string;
}) {
  return (
    <section className="customer-portal-project-section" aria-label={heading}>
      <header>
        <h2 className="headings-s-bold">{heading}</h2>
        <span className="label-s">Videos {studioName} is making for {clientName}</span>
      </header>
      {projects.length === 0 ? (
        <div className="customer-production-empty"><strong className="headings-2xs-bold">Nothing here yet</strong><span className="label-s">{emptyCopy}</span></div>
      ) : (
        <div className="customer-portal-project-grid">
          {projects.map((project) => {
            const briefActionLabel = project.briefStatus === "Not sent" ? "Preview Brief" : "Open Brief";
            const briefHref = `/projects/${encodeURIComponent(project.id)}/stages/brief`;

            return (
              <article className="customer-production-card" key={project.id}>
                <Link
                  className="customer-project-surface-link"
                  href={briefHref}
                  aria-label={`${briefActionLabel} for ${project.name}`}
                  draggable={false}
                />
                <div className="customer-production-card-copy">
                  <span className="customer-project-code label-xs-semibold">{project.clientBadge}</span>
                  <h3 className="headings-xs-bold">{project.name}</h3>
                  <span className="label-s">{project.briefStatus}</span>
                </div>
                <StageProgress
                  compact
                  projectId={project.id}
                  projectName={project.name}
                  stages={project.stages}
                  studioName={studioName}
                  customerName={clientName}
                  showAge={false}
                />
                <span className="customer-dashboard-primary-button label-s-semibold" aria-hidden="true">
                  {briefActionLabel}
                </span>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
