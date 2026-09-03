"use client";

import Link from "next/link";
import { StageProgress } from "@/components/active-videos/StageProgress";
import { usePrototypeRole } from "@/components/navigation/PrototypeRoleContext";
import { getBrandKitCustomerByBadge } from "@/data/brand-kits";
import { ProjectNotificationSettings } from "@/components/settings/ProjectNotificationSettings";
import { DsIcon } from "@/components/video-review/DsIcon";
import type { ScopedProject } from "@/data/prototype-state";
import { TeamPanel, type TeamPanelAccess } from "./team/TeamPanel";

export function ProjectOverviewPage({ project, studioName }: { project: ScopedProject; studioName: string }) {
  const { selectedRole } = usePrototypeRole();
  const customer = getBrandKitCustomerByBadge(project.clientBadge);
  const access: TeamPanelAccess = selectedRole === "Studio Staff"
    ? "producerAdmin"
    : selectedRole === "Studio Freelancer"
      ? "freelancer"
      : "customer";

  return (
    <main className="project-overview-shell">
      <header className="project-overview-header">
        <div>
          <Link className="project-overview-back label-s-semibold" href="/active-videos">
            Back to Videos
          </Link>
          <span className="project-overview-client label-xs-semibold">{project.clientBadge}</span>
          <h1 className="project-overview-title">{project.name}</h1>
        </div>
        <div className="project-overview-header-actions">
        {customer ? (
          <Link className="project-overview-brand-kit label-s-semibold" href={`/brand-kits/${customer.slug}`}>
            <span className="project-overview-brand-mark">
              {customer.logoUrl ? (
                <img src={customer.logoUrl} alt="" />
              ) : (
                <span className="label-xs-semibold">{customer.badge}</span>
              )}
            </span>
            {customer.name}&apos;s Brand Kit
          </Link>
        ) : null}
        </div>
      </header>

      <section className="project-overview-journey" aria-labelledby="project-overview-journey-heading">
        <header>
          <div>
            <span className="label-xs-semibold">Production journey</span>
            <h2 className="headings-xs-bold" id="project-overview-journey-heading">Your video starts with the Brief</h2>
          </div>
          <span className="project-overview-video-status label-xs-semibold">{project.status}</span>
        </header>
        <StageProgress
          compact
          showAge={false}
          customerName={project.clientName}
          projectId={project.id}
          projectName={project.name}
          stages={project.stages}
          studioName={studioName}
        />
      </section>

      <section className="project-overview-brief-next" aria-labelledby="project-overview-brief-heading">
        <span className="project-overview-brief-icon"><DsIcon name="clipboard-text" size={20} /></span>
        <div>
          <span className="label-xs-semibold">Brief - {project.briefStatus}</span>
          <h2 className="headings-xs-bold" id="project-overview-brief-heading">Complete the Client Brief</h2>
          <p className="paragraph-s">
            {project.briefStatus === "Waiting on Client"
              ? `${project.clientName} is responsible next.`
              : "Studio Staff are responsible next. Complete the Brief together or invite the Client when ready."}
          </p>
        </div>
        <Link className="project-overview-next-action label-s-semibold" href={`/projects/${project.id}/stages/brief`}>
          Open Brief
        </Link>
      </section>

      <section className="project-overview-grid">
        {project.team.length > 0 ? (
          <TeamPanel
            projectId={project.id}
            projectName={project.name}
            videoType={project.videoType}
            videoLengthSeconds={project.videoLengthSeconds}
            initialTeam={project.team}
            timeEntries={project.timeEntries}
            access={access}
          />
        ) : null}
        {selectedRole === "Studio Staff" ? (
          <ProjectNotificationSettings clientBadge={project.clientBadge} projectId={project.id} />
        ) : null}
      </section>
    </main>
  );
}
