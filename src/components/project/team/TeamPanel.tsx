"use client";

import { useEffect, useMemo, useState } from "react";
import {
  fallbackRoleStages,
  getAcceptedInvitation,
  getRoleEstimatedHours,
  getSlotLabel,
  getVisibleInvitations,
  mockTeamPeople,
  redistributeRoleHours,
  setRoleStages,
  stageKeys,
  teamRoleLabels,
  teamRoleOptions,
} from "@/data/active-videos/teamDefaults";
import type { Invitation, InvitationPaymentTerms, ProjectVideoType, RoleSlot, StageAssignment, TeamPerson, TeamRole, TimeEntry } from "@/components/active-videos/types";
import { usePeople, type ProjectStaffWorkload } from "@/components/people/PeopleDataContext";
import { useInvitations } from "@/components/invitations/InvitationContext";
import type { Person } from "@/data/people";
import { AddRoleButton } from "./AddRoleButton";
import { RoleEditorModal } from "./RoleEditorModal";
import { RoleRow } from "./RoleRow";
import { useProjectTeams } from "./ProjectTeamDataContext";

export type TeamPanelAccess = "producerAdmin" | "ownStaff" | "freelancer" | "customer";

type TeamPanelProps = {
  projectId: string;
  projectName: string;
  videoType: ProjectVideoType;
  videoLengthSeconds: number;
  initialTeam: RoleSlot[];
  timeEntries: TimeEntry[];
  access: TeamPanelAccess;
  viewerPersonId?: string;
};

type ToastState = {
  id: string;
  message: string;
};

export function TeamPanel({
  projectId,
  projectName,
  initialTeam,
  access,
  viewerPersonId,
}: TeamPanelProps) {
  const { people: directoryPeople, syncProjectStaffWorkloads } = usePeople();
  const { openInvitePerson } = useInvitations();
  const { setProjectTeam, teamsByProjectId } = useProjectTeams();
  const [extraPeople, setExtraPeople] = useState<TeamPerson[]>([]);
  const [roleEditorSlotId, setRoleEditorSlotId] = useState<string | null>(null);
  const [isRolePickerOpen, setIsRolePickerOpen] = useState(false);
  const [toast, setToast] = useState<ToastState | null>(null);
  const storedTeam = teamsByProjectId[projectId];
  const team = storedTeam ?? initialTeam;
  const people = useMemo(() => {
    const byId = new Map<string, TeamPerson>(mockTeamPeople.map((person) => [person.id, person]));
    directoryPeople
      .filter((person) => person.type !== "Client contact" && person.status !== "Archived")
      .forEach((person) => byId.set(person.id, toTeamPerson(person)));
    extraPeople.forEach((person) => byId.set(person.id, person));
    return [...byId.values()];
  }, [directoryPeople, extraPeople]);

  useEffect(() => {
    if (!storedTeam) setProjectTeam(projectId, initialTeam);
  }, [initialTeam, projectId, setProjectTeam, storedTeam]);

  useEffect(() => {
    setExtraPeople([]);
    setRoleEditorSlotId(null);
    setIsRolePickerOpen(false);
  }, [projectId]);

  useEffect(() => {
    syncProjectStaffWorkloads(projectId, getProjectStaffWorkloads(projectId, team, people));
  }, [people, projectId, syncProjectStaffWorkloads, team]);

  useEffect(() => {
    if (!toast) {
      return;
    }

    const timeoutId = window.setTimeout(() => setToast(null), 3600);

    return () => window.clearTimeout(timeoutId);
  }, [toast]);

  if (access === "customer") {
    return null;
  }

  const canEdit = access === "producerAdmin";
  const activeTeam = team.filter((slot) => !slot.archivedAt);
  const visibleTeam = getVisibleTeam(activeTeam, people, access, viewerPersonId);
  const displayTeam = access === "freelancer" && viewerPersonId ? visibleTeam.map((slot) => filterSlotForViewer(slot, viewerPersonId)) : visibleTeam;
  const showCosts = access === "producerAdmin" || access === "freelancer";
  const activeRoleEditorSlot = canEdit ? team.find((slot) => slot.id === roleEditorSlotId) : undefined;
  const assignedPersonIds = getAssignedPersonIds(activeTeam);

  const updateSlot = (slotId: string, updater: (slot: RoleSlot) => RoleSlot) => {
    setProjectTeam(projectId, (currentTeam) => currentTeam.map((slot) => (slot.id === slotId ? updater(slot) : slot)));
  };

  const addStaffToSlot = (slotId: string, person: TeamPerson) => {
    const acceptedInvitationId = `${slotId}-${person.id}-accepted-${Date.now()}`;
    const acceptedInvitation: Invitation = {
      id: acceptedInvitationId,
      personId: person.id,
      status: "accepted",
      sentAt: new Date().toISOString(),
      respondedAt: new Date().toISOString(),
      assignmentMethod: "direct",
    };

    updateSlot(slotId, (slot) => ({
      ...slot,
      invitations: [
        ...slot.invitations.map((invitation) =>
          invitation.status === "invited" || invitation.status === "seen" || invitation.status === "accepted"
            ? {
                ...invitation,
                status: "withdrawn" as const,
                respondedAt: new Date().toISOString(),
              }
            : invitation,
        ),
        acceptedInvitation,
      ],
      acceptedInvitationId,
    }));
  };

  const inviteFreelancerToSlot = (slotId: string, person: TeamPerson, paymentTerms: InvitationPaymentTerms) => {
    updateSlot(slotId, (slot) => {
      if (getVisibleInvitations(slot).some((invitation) => invitation.personId === person.id)) {
        return slot;
      }

      return {
        ...slot,
        invitations: [
          ...slot.invitations,
          {
            id: `${slotId}-${person.id}-invited-${Date.now()}`,
            personId: person.id,
            status: "invited",
            sentAt: new Date().toISOString(),
            rateSnapshot: paymentTerms.basis === "hourly" ? person.hourlyRate : undefined,
            paymentBasis: paymentTerms.basis,
            flatRateSnapshot: paymentTerms.basis === "flat" ? paymentTerms.flatRate : undefined,
          },
        ],
      };
    });
  };

  const assignFreelancerDirectlyToSlot = (slotId: string, person: TeamPerson, paymentTerms: InvitationPaymentTerms) => {
    const acceptedInvitationId = `${slotId}-${person.id}-accepted-${Date.now()}`;
    const now = new Date().toISOString();

    updateSlot(slotId, (slot) => ({
      ...slot,
      invitations: [
        ...slot.invitations.map((invitation) =>
          invitation.status === "invited" || invitation.status === "seen" || invitation.status === "accepted"
            ? {
                ...invitation,
                status: "withdrawn" as const,
                respondedAt: now,
              }
            : invitation,
        ),
        {
          id: acceptedInvitationId,
          personId: person.id,
          status: "accepted",
          sentAt: now,
          respondedAt: now,
          rateSnapshot: paymentTerms.basis === "hourly" ? person.hourlyRate : undefined,
          paymentBasis: paymentTerms.basis,
          flatRateSnapshot: paymentTerms.basis === "flat" ? paymentTerms.flatRate : undefined,
          assignmentMethod: "direct",
        },
      ],
      acceptedInvitationId,
    }));
  };

  const unassignSlot = (slotId: string) => {
    const now = new Date().toISOString();

    updateSlot(slotId, (slot) => {
      const acceptedInvitation = getAcceptedInvitation(slot);

      if (!acceptedInvitation) {
        return slot;
      }

      return {
        ...slot,
        invitations: slot.invitations.map((invitation) =>
          invitation.id === acceptedInvitation.id
            ? {
                ...invitation,
                status: "withdrawn" as const,
                respondedAt: now,
              }
            : invitation,
        ),
        acceptedInvitationId: undefined,
      };
    });
  };

  const openNewFreelancerInvite = (slot: RoleSlot, paymentTerms: InvitationPaymentTerms) => {
    openInvitePerson({
      role: "Studio Freelancer",
      projectId,
      jobTitle: getSlotLabel(slot),
    }, (directoryPerson, submission) => {
      if (submission.role !== "Studio Freelancer" || directoryPerson.type !== "Freelancer") return;
      const person = toTeamPerson(directoryPerson, slot.role);
      setExtraPeople((currentPeople) => (currentPeople.some((currentPerson) => currentPerson.id === person.id) ? currentPeople : [...currentPeople, person]));
      inviteFreelancerToSlot(slot.id, person, paymentTerms);
      setToast({ id: `${slot.id}-${person.id}`, message: `${person.name} was added to People and invited to the ${getSlotLabel(slot)} role.` });
    });
  };

  const acceptInvitation = (slotId: string, invitationId: string) => {
    const respondedAt = new Date().toISOString();

    updateSlot(slotId, (slot) => ({
      ...slot,
      invitations: slot.invitations.map((invitation) => {
        if (invitation.id === invitationId) {
          return {
            ...invitation,
            status: "accepted",
            respondedAt,
          };
        }

        if (invitation.status === "invited" || invitation.status === "seen") {
          return {
            ...invitation,
            status: "declined",
            respondedAt,
            declinedReason: "role_filled",
          };
        }

        return invitation;
      }),
      acceptedInvitationId: invitationId,
    }));
    setToast({ id: `${slotId}-${invitationId}`, message: `${getSlotLabel(team.find((slot) => slot.id === slotId) ?? { role: "custom", customRoleLabel: "Role" })} filled. Other invitations were declined.` });
  };

  const withdrawInvitation = (slotId: string, invitationId: string) => {
    updateSlot(slotId, (slot) => ({
      ...slot,
      invitations: slot.invitations.map((invitation) =>
        invitation.id === invitationId
          ? {
              ...invitation,
              status: "withdrawn",
              respondedAt: new Date().toISOString(),
            }
          : invitation,
      ),
    }));
  };

  const withdrawAllInvitations = (slotId: string) => {
    updateSlot(slotId, (slot) => ({
      ...slot,
      invitations: slot.invitations.map((invitation) =>
        invitation.status === "invited" || invitation.status === "seen"
          ? {
              ...invitation,
              status: "withdrawn",
              respondedAt: new Date().toISOString(),
            }
          : invitation,
      ),
    }));
  };

  const addRole = (role: TeamRole, customRoleLabel?: string) => {
    const stages = fallbackRoleStages[role].map<StageAssignment>((stageId) => ({
      stageId,
      estimatedHours: 0,
    }));
    const roleSlug = role === "custom" ? customRoleLabel?.toLowerCase().replace(/\s+/g, "-") || "custom" : teamRoleLabels[role].toLowerCase().replace(/\s+/g, "-");
    const slotId = `${projectId}-${roleSlug}-${team.length + 1}`;

    setProjectTeam(projectId, (currentTeam) => [
      ...currentTeam,
      {
        id: slotId,
        projectId,
        role,
        customRoleLabel,
        stages,
        invitations: [],
      },
    ]);
    setIsRolePickerOpen(false);
    setRoleEditorSlotId(slotId);
  };

  return (
    <section className="team-panel" aria-label={`${projectName} team`}>
      <header className="team-panel-header">
        <span className="team-panel-heading">
          <span className="team-panel-title label-s-semibold">Team</span>
        </span>
      </header>

      <div className="team-panel-body">
        <div className="team-panel-slot-list" role="table" aria-label="Project roles">
          {displayTeam.map((slot) => (
            <RoleRow
              key={slot.id}
              slot={slot}
              people={people}
              canEdit={canEdit}
              showCosts={showCosts}
              onOpenEditor={() => setRoleEditorSlotId(slot.id)}
              onChangeHours={(hours) => updateSlot(slot.id, (teamSlot) => redistributeRoleHours(teamSlot, hours))}
            />
          ))}
        </div>

        {canEdit ? (
          <div className="team-panel-actions">
            <AddRoleButton isOpen={isRolePickerOpen} roles={teamRoleOptions} onAddRole={addRole} onToggle={() => setIsRolePickerOpen((value) => !value)} />
          </div>
        ) : null}
      </div>

      {activeRoleEditorSlot ? (
        <RoleEditorModal
          slot={activeRoleEditorSlot}
          people={people}
          stages={stageKeys}
          assignedPersonIds={assignedPersonIds}
          showCosts={showCosts}
          onAddStaff={(person) => addStaffToSlot(activeRoleEditorSlot.id, person)}
          onInviteFreelancer={(person, paymentTerms) => inviteFreelancerToSlot(activeRoleEditorSlot.id, person, paymentTerms)}
          onAssignFreelancer={(person, paymentTerms) => assignFreelancerDirectlyToSlot(activeRoleEditorSlot.id, person, paymentTerms)}
          onUnassign={() => unassignSlot(activeRoleEditorSlot.id)}
          onInviteNewFreelancer={(paymentTerms) => openNewFreelancerInvite(activeRoleEditorSlot, paymentTerms)}
          onWithdrawInvitation={(invitationId) => withdrawInvitation(activeRoleEditorSlot.id, invitationId)}
          onWithdrawAll={() => withdrawAllInvitations(activeRoleEditorSlot.id)}
          onRemove={() => updateSlot(activeRoleEditorSlot.id, (teamSlot) => ({ ...teamSlot, archivedAt: new Date().toISOString() }))}
          onSaveSettings={(hours, nextStages) => {
            updateSlot(activeRoleEditorSlot.id, (slot) => redistributeRoleHours(setRoleStages(slot, nextStages), hours));
            setRoleEditorSlotId(null);
          }}
          onClose={() => setRoleEditorSlotId(null)}
        />
      ) : null}

      {toast ? <div className="team-toast label-s-semibold" role="status">{toast.message}</div> : null}
    </section>
  );
}

function toTeamPerson(person: Person, fallbackRole?: TeamRole, hourlyRateOverride?: number): TeamPerson {
  const defaultRole = fallbackRole ?? getDefaultTeamRole(person);
  const resolvedHourlyRate = hourlyRateOverride ?? (person.commercial
    ? person.commercial.rateType === "Day rate" ? person.commercial.defaultRate / 8 : person.commercial.defaultRate
    : undefined);
  const hourlyRate = resolvedHourlyRate && resolvedHourlyRate > 0 ? resolvedHourlyRate : undefined;
  const activeHours = person.workloads
    .filter((workload) => workload.status === "Waiting on Studio")
    .reduce((total, workload) => total + workload.predictedHours, 0);

  return {
    id: person.id,
    name: person.name,
    initials: getInitials(person.name),
    personType: person.type === "Team" ? "Studio Staff" : "Studio Freelancer",
    defaultRole,
    hourlyRate,
    bookedHoursThisWeek: activeHours,
    weeklyCapacityHours: person.weeklyCapacityHours ?? 40,
    availabilityLabel: person.availability ?? "Available",
  };
}

function getDefaultTeamRole(person: Person): TeamRole {
  const title = person.jobTitles.join(" ").toLocaleLowerCase("en-AU");
  if (title.includes("producer")) return "producer";
  if (title.includes("motion")) return "motionDesigner";
  if (title.includes("animator")) return "animator";
  if (title.includes("director of photography") || title.includes("shooter")) return "shooter";
  if (title.includes("director")) return "director";
  if (title.includes("colour")) return "colourist";
  if (title.includes("sound")) return "soundDesigner";
  if (title.includes("vfx")) return "vfxArtist";
  if (title.includes("editor")) return "editor";
  return "custom";
}

function getVisibleTeam(team: RoleSlot[], people: TeamPerson[], access: TeamPanelAccess, viewerPersonId?: string) {
  if (access === "producerAdmin") {
    return team;
  }

  if (!viewerPersonId) {
    return [];
  }

  return team.filter((slot) => {
    const acceptedInvitation = getAcceptedInvitation(slot);
    const acceptedPerson = acceptedInvitation ? people.find((person) => person.id === acceptedInvitation.personId) : undefined;

    if (access === "ownStaff") {
      return acceptedPerson?.id === viewerPersonId && acceptedPerson.personType === "Studio Staff";
    }

    if (access === "freelancer") {
      return (
        (acceptedPerson?.id === viewerPersonId && acceptedPerson.personType === "Studio Freelancer") ||
        getVisibleInvitations(slot).some((invitation) => invitation.personId === viewerPersonId)
      );
    }

    return false;
  });
}

function getAssignedPersonIds(team: RoleSlot[]) {
  return new Set(
    team
      .map(getAcceptedInvitation)
      .filter((invitation): invitation is Invitation => Boolean(invitation))
      .map((invitation) => invitation.personId),
  );
}

function getProjectStaffWorkloads(projectId: string, team: RoleSlot[], people: TeamPerson[]): ProjectStaffWorkload[] {
  return team.flatMap((slot) => {
    if (slot.archivedAt) return [];
    const acceptedInvitation = getAcceptedInvitation(slot);
    const person = acceptedInvitation ? people.find((candidate) => candidate.id === acceptedInvitation.personId) : undefined;
    const predictedHours = getRoleEstimatedHours(slot);
    const primaryStage = [...slot.stages].sort((left, right) => right.estimatedHours - left.estimatedHours)[0]?.stageId;

    if (!acceptedInvitation || person?.personType !== "Studio Staff" || predictedHours <= 0 || !primaryStage) return [];

    return [{
      personId: person.id,
      workload: {
        id: `${slot.id}-staff-capacity`,
        projectId,
        stage: primaryStage,
        status: "Waiting on Studio" as const,
        predictedHours,
        projectRole: getSlotLabel(slot),
        assignmentStatus: "Assigned" as const,
      },
    }];
  });
}

function filterSlotForViewer(slot: RoleSlot, viewerPersonId: string): RoleSlot {
  const acceptedInvitation = getAcceptedInvitation(slot);

  return {
    ...slot,
    invitations: slot.invitations.filter((invitation) => invitation.personId === viewerPersonId || invitation.id === acceptedInvitation?.id),
  };
}

function getInitials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}
