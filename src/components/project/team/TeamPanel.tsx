"use client";

import { useEffect, useMemo, useState } from "react";
import {
  fallbackRoleStages,
  getAcceptedInvitation,
  getSlotLabel,
  getVisibleInvitations,
  mockTeamPeople,
  redistributeRoleHours,
  setRoleStages,
  stageKeys,
  teamRoleLabels,
  teamRoleOptions,
} from "@/data/active-videos/teamDefaults";
import type { Invitation, ProjectVideoType, RoleSlot, StageAssignment, TeamPerson, TeamRole, TimeEntry } from "@/components/active-videos/types";
import { AddRoleButton } from "./AddRoleButton";
import { RoleEditorModal } from "./RoleEditorModal";
import { RoleRow } from "./RoleRow";
import { DsIcon } from "@/components/video-review/DsIcon";

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
  const [team, setTeam] = useState(initialTeam);
  const [extraPeople, setExtraPeople] = useState<TeamPerson[]>([]);
  const [roleEditorSlotId, setRoleEditorSlotId] = useState<string | null>(null);
  const [isRolePickerOpen, setIsRolePickerOpen] = useState(false);
  const [toast, setToast] = useState<ToastState | null>(null);
  const people = useMemo(() => [...mockTeamPeople, ...extraPeople], [extraPeople]);

  useEffect(() => {
    setTeam(initialTeam);
    setExtraPeople([]);
    setRoleEditorSlotId(null);
    setIsRolePickerOpen(false);
  }, [initialTeam, projectId]);

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
    setTeam((currentTeam) => currentTeam.map((slot) => (slot.id === slotId ? updater(slot) : slot)));
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

  const inviteFreelancerToSlot = (slotId: string, person: TeamPerson) => {
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
            rateSnapshot: person.hourlyRate,
          },
        ],
      };
    });
  };

  const assignFreelancerDirectlyToSlot = (slotId: string, person: TeamPerson) => {
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
          rateSnapshot: person.hourlyRate,
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

  const inviteNewFreelancerToSlot = (slot: RoleSlot, invite: { name: string; email: string; hourlyRate: number }) => {
    const personId = `invite-${invite.email.toLowerCase().replace(/[^a-z0-9]/g, "-")}`;
    const person: TeamPerson = {
      id: personId,
      name: invite.name,
      initials: getInitials(invite.name),
      personType: "Studio Freelancer",
      defaultRole: slot.role,
      hourlyRate: invite.hourlyRate,
      bookedHoursThisWeek: 0,
      weeklyCapacityHours: 40,
      availabilityLabel: "Available",
    };

    setExtraPeople((currentPeople) => (currentPeople.some((currentPerson) => currentPerson.id === personId) ? currentPeople : [...currentPeople, person]));
    inviteFreelancerToSlot(slot.id, person);
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

    setTeam((currentTeam) => [
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

  const openPanelEdit = () => {
    if (!canEdit) {
      return;
    }

    const firstEditableSlot = displayTeam[0] ?? activeTeam[0];

    if (firstEditableSlot) {
      setRoleEditorSlotId(firstEditableSlot.id);
      return;
    }

    setIsRolePickerOpen(true);
  };

  return (
    <section className="team-panel" aria-label={`${projectName} team`}>
      <header className="team-panel-header">
        <span className="team-panel-heading">
          <span className="team-panel-title label-s-semibold">Team</span>
        </span>
        {canEdit ? (
          <button className="team-panel-edit" type="button" aria-label="Edit Team" title="Edit Team" onClick={openPanelEdit}>
            <DsIcon name="pencil-simple-ds" size={16} />
          </button>
        ) : null}
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
          onInviteFreelancer={(person) => inviteFreelancerToSlot(activeRoleEditorSlot.id, person)}
          onAssignFreelancer={(person) => assignFreelancerDirectlyToSlot(activeRoleEditorSlot.id, person)}
          onUnassign={() => unassignSlot(activeRoleEditorSlot.id)}
          onInviteByEmail={(invite) => inviteNewFreelancerToSlot(activeRoleEditorSlot, invite)}
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
