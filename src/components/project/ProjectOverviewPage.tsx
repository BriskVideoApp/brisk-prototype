"use client";

import Link from "next/link";
import { useState } from "react";
import { getAcceptedPerson, getTeamPerson, getVisibleInvitations } from "@/data/active-videos/teamDefaults";
import type { Project, RoleSlot, TeamPerson } from "@/components/active-videos/types";
import { TeamPanel, type TeamPanelAccess } from "./team/TeamPanel";

type PrototypeRole = "Producer/Admin" | "Studio Staff" | "Studio Freelancer" | "Customer";

const prototypeRoles: PrototypeRole[] = ["Producer/Admin", "Studio Staff", "Studio Freelancer", "Customer"];

export function ProjectOverviewPage({ project }: { project: Project }) {
  const [selectedRole, setSelectedRole] = useState<PrototypeRole>("Producer/Admin");
  const staffViewerPersonId = getFirstTeamPersonForType(project.team, "Studio Staff")?.id;
  const freelancerPersonId = getFirstTeamPersonForType(project.team, "Studio Freelancer")?.id;
  const access = getAccessForRole(selectedRole);

  return (
    <main className="project-overview-shell">
      <header className="project-overview-header">
        <div>
          <Link className="project-overview-back label-s-semibold" href="/active-videos">
            Back to Active Videos
          </Link>
          <span className="project-overview-client label-xs-semibold">{project.clientBadge}</span>
          <h1 className="project-overview-title">{project.name}</h1>
        </div>
        <div className="project-overview-role-switcher" role="group" aria-label="View project as role">
          {prototypeRoles.map((role) => (
            <button
              className={`project-overview-role label-xs-semibold ${selectedRole === role ? "selected" : ""}`}
              type="button"
              key={role}
              aria-pressed={selectedRole === role}
              onClick={() => setSelectedRole(role)}
            >
              {role}
            </button>
          ))}
        </div>
      </header>

      <section className="project-overview-grid">
        <TeamPanel
          projectId={project.id}
          projectName={project.name}
          videoType={project.videoType}
          videoLengthSeconds={project.videoLengthSeconds}
          initialTeam={project.team}
          timeEntries={project.timeEntries}
          access={access}
          viewerPersonId={selectedRole === "Studio Freelancer" ? freelancerPersonId : selectedRole === "Studio Staff" ? staffViewerPersonId : undefined}
        />
        {selectedRole === "Customer" ? (
          <section className="project-overview-hidden-panel">
            <h2 className="heading-3xs">Team hidden</h2>
            <p className="label-s">Customers do not see Studio team assignments.</p>
          </section>
        ) : null}
      </section>
    </main>
  );
}

function getAccessForRole(role: PrototypeRole): TeamPanelAccess {
  if (role === "Customer") {
    return "customer";
  }

  if (role === "Studio Freelancer") {
    return "freelancer";
  }

  if (role === "Studio Staff") {
    return "ownStaff";
  }

  return "producerAdmin";
}

function getFirstTeamPersonForType(team: RoleSlot[], personType: TeamPerson["personType"]) {
  const acceptedPerson = team.map(getAcceptedPerson).find((person) => person?.personType === personType);

  if (acceptedPerson) {
    return acceptedPerson;
  }

  const pendingInvitation = team.flatMap((slot) => getVisibleInvitations(slot)).find((invitation) => getTeamPerson(invitation.personId)?.personType === personType);

  return pendingInvitation ? getTeamPerson(pendingInvitation.personId) : undefined;
}
