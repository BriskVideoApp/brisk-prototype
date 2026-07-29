"use client";

import Link from "next/link";
import type { Project } from "@/components/active-videos/types";
import { getBrandKitCustomerByBadge } from "@/data/brand-kits";
import { TeamPanel } from "./team/TeamPanel";

export function ProjectOverviewPage({ project }: { project: Project }) {
  const customer = getBrandKitCustomerByBadge(project.clientBadge);

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
        {customer ? (
          <Link className="project-overview-brand-kit label-s-semibold" href={`/brand-kits/${customer.slug}`}>
            <span className="project-overview-brand-mark">
              <img src={customer.logoUrl} alt="" />
            </span>
            {customer.name}&apos;s Brand Kit
          </Link>
        ) : null}
      </header>

      <section className="project-overview-grid">
        <TeamPanel
          projectId={project.id}
          projectName={project.name}
          videoType={project.videoType}
          videoLengthSeconds={project.videoLengthSeconds}
          initialTeam={project.team}
          timeEntries={project.timeEntries}
          access="producerAdmin"
        />
      </section>
    </main>
  );
}
