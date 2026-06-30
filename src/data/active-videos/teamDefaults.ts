import type {
  Invitation,
  ProjectVideoType,
  RoleSlot,
  StageAssignment,
  StageKey,
  TeamPerson,
  TeamRole,
  TimeEntry,
} from "@/components/active-videos/types";

export const stageKeys: StageKey[] = ["brief", "script", "shoot", "storyboard", "media", "edit", "masters"];

export const teamRoleOptions: TeamRole[] = [
  "producer",
  "editor",
  "shooter",
  "motionDesigner",
  "animator",
  "director",
  "colourist",
  "soundDesigner",
  "vfxArtist",
  "custom",
];

export const teamRoleLabels: Record<TeamRole, string> = {
  producer: "Producer",
  editor: "Editor",
  shooter: "Shooter",
  motionDesigner: "Motion Designer",
  animator: "Animator",
  director: "Director",
  colourist: "Colourist",
  soundDesigner: "Sound Designer",
  vfxArtist: "VFX Artist",
  custom: "Custom",
};

export const stageLabels: Record<StageKey, string> = {
  brief: "Brief",
  script: "Script",
  shoot: "Shoot",
  storyboard: "Storyboard",
  media: "Media",
  edit: "Edit",
  masters: "Masters",
};

export const mockTeamPeople: TeamPerson[] = [
  {
    id: "te",
    name: "Tom Editor",
    initials: "TE",
    personType: "Studio Staff",
    defaultRole: "producer",
    bookedHoursThisWeek: 20,
    weeklyCapacityHours: 40,
    availabilityLabel: "Available",
  },
  {
    id: "sc",
    name: "Sarah Chen",
    initials: "SC",
    personType: "Studio Staff",
    defaultRole: "editor",
    bookedHoursThisWeek: 28,
    weeklyCapacityHours: 40,
    availabilityLabel: "Available",
  },
  {
    id: "jl",
    name: "Jordan Lee",
    initials: "JL",
    personType: "Studio Freelancer",
    defaultRole: "shooter",
    hourlyRate: 95,
    bookedHoursThisWeek: 20,
    weeklyCapacityHours: 40,
    availabilityLabel: "Available",
  },
  {
    id: "ct",
    name: "Chris Taylor",
    initials: "CT",
    personType: "Studio Freelancer",
    defaultRole: "editor",
    hourlyRate: 85,
    bookedHoursThisWeek: 32,
    weeklyCapacityHours: 40,
    availabilityLabel: "Busy",
  },
  {
    id: "md",
    name: "Maddie Diaz",
    initials: "MD",
    personType: "Studio Staff",
    defaultRole: "motionDesigner",
    bookedHoursThisWeek: 24,
    weeklyCapacityHours: 40,
    availabilityLabel: "Available",
  },
  {
    id: "ak",
    name: "Aisha Khan",
    initials: "AK",
    personType: "Studio Freelancer",
    defaultRole: "colourist",
    hourlyRate: 110,
    bookedHoursThisWeek: 18,
    weeklyCapacityHours: 40,
    availabilityLabel: "Available",
  },
  {
    id: "rb",
    name: "Riley Brooks",
    initials: "RB",
    personType: "Studio Staff",
    defaultRole: "producer",
    bookedHoursThisWeek: 22,
    weeklyCapacityHours: 40,
    availabilityLabel: "Available",
  },
  {
    id: "ed",
    name: "Emma Davis",
    initials: "ED",
    personType: "Studio Freelancer",
    defaultRole: "animator",
    hourlyRate: 100,
    bookedHoursThisWeek: 20,
    weeklyCapacityHours: 40,
    availabilityLabel: "Available",
  },
  {
    id: "jm",
    name: "Marcus Johnson",
    initials: "JM",
    personType: "Studio Staff",
    defaultRole: "soundDesigner",
    bookedHoursThisWeek: 30,
    weeklyCapacityHours: 40,
    availabilityLabel: "Busy",
  },
  {
    id: "np",
    name: "Nina Patel",
    initials: "NP",
    personType: "Studio Freelancer",
    defaultRole: "vfxArtist",
    hourlyRate: 120,
    bookedHoursThisWeek: 16,
    weeklyCapacityHours: 40,
    availabilityLabel: "Available",
  },
];

export function getTeamPerson(personId: string) {
  return mockTeamPeople.find((person) => person.id === personId);
}

export function getSlotLabel(slot: Pick<RoleSlot, "role" | "customRoleLabel">) {
  return slot.role === "custom" ? slot.customRoleLabel ?? "Custom role" : teamRoleLabels[slot.role];
}

export function getAcceptedInvitation(slot: RoleSlot) {
  return slot.invitations.find((invitation) => invitation.id === slot.acceptedInvitationId && invitation.status === "accepted");
}

export function getAcceptedPerson(slot: RoleSlot) {
  const acceptedInvitation = getAcceptedInvitation(slot);

  return acceptedInvitation ? getTeamPerson(acceptedInvitation.personId) : undefined;
}

export function getVisibleInvitations(slot: RoleSlot) {
  return slot.invitations.filter((invitation) => invitation.status === "invited" || invitation.status === "seen");
}

export function getInvitationRate(invitation: Invitation) {
  return invitation.rateSnapshot ?? getTeamPerson(invitation.personId)?.hourlyRate;
}

export const defaultRoleStages: Record<ProjectVideoType, Partial<Record<TeamRole, StageKey[]>>> = {
  liveAction: {
    producer: ["brief", "script", "masters"],
    editor: ["media", "edit"],
    shooter: ["shoot"],
  },
  animation: {
    producer: ["brief", "script", "masters"],
    editor: ["media", "edit"],
    motionDesigner: ["storyboard", "edit"],
  },
};

export const fallbackRoleStages: Record<TeamRole, StageKey[]> = {
  producer: ["brief", "script", "masters"],
  editor: ["media", "edit"],
  shooter: ["shoot"],
  motionDesigner: ["storyboard", "edit"],
  animator: ["storyboard", "edit"],
  director: ["brief", "script", "shoot"],
  colourist: ["edit"],
  soundDesigner: ["edit", "masters"],
  vfxArtist: ["storyboard", "edit"],
  custom: [],
};

const defaultRoleHours: Record<ProjectVideoType, Partial<Record<TeamRole, number>>> = {
  liveAction: {
    producer: 10,
    editor: 18,
    shooter: 8,
  },
  animation: {
    producer: 8,
    editor: 20,
    motionDesigner: 16,
  },
};

export function createDefaultRoleSlots({
  projectId,
  videoType,
  peopleIds,
  scenario = "default",
}: {
  projectId: string;
  videoLengthSeconds: number;
  videoType: ProjectVideoType;
  peopleIds: string[];
  scenario?: "default" | "emptyAll" | "pendingShooterTwo" | "pendingShooterThree" | "withdrawnShooter" | "acceptedWithDeclinedHistory" | "directAssignedFreelancer";
}): RoleSlot[] {
  const roles: TeamRole[] = videoType === "animation" ? ["producer", "editor", "motionDesigner"] : ["producer", "editor", "shooter"];

  return roles.map((roleName, index) => {
    const person = mockTeamPeople.find((teamPerson) => teamPerson.id === peopleIds[index]);
    const coveredStages = defaultRoleStages[videoType][roleName] ?? fallbackRoleStages[roleName];
    const stages = createStageAssignments(coveredStages, defaultRoleHours[videoType][roleName] ?? 0);
    const roleSlug = teamRoleLabels[roleName].toLowerCase().replace(/\s+/g, "-");
    const slotId = `${projectId}-${roleSlug}`;
    const baseSlot: RoleSlot = {
      id: slotId,
      projectId,
      role: roleName,
      stages,
      invitations: person && scenario !== "emptyAll" ? [createAcceptedInvitation(slotId, person, index)] : [],
      acceptedInvitationId: person && scenario !== "emptyAll" ? `${slotId}-${person.id}-accepted` : undefined,
    };

    if (scenario === "emptyAll") {
      return baseSlot;
    }

    if (roleName === "shooter" && scenario === "pendingShooterTwo") {
      return createPendingFreelanceSlot(baseSlot, ["jl", "ak"], ["seen", "invited"]);
    }

    if (roleName === "shooter" && scenario === "pendingShooterThree") {
      return createPendingFreelanceSlot(baseSlot, ["jl", "ct", "ak"], ["seen", "invited", "invited"]);
    }

    if (roleName === "shooter" && scenario === "withdrawnShooter") {
      return {
        ...baseSlot,
        invitations: ["jl", "ct"].map((personId, invitationIndex) => {
          const invitedPerson = getTeamPerson(personId);

          return {
            id: `${slotId}-${personId}-withdrawn`,
            personId,
            status: "withdrawn",
            sentAt: createMockTimestamp(index + invitationIndex + 1),
            respondedAt: createMockTimestamp(index + invitationIndex),
            rateSnapshot: invitedPerson?.hourlyRate,
          };
        }),
        acceptedInvitationId: undefined,
      };
    }

    if (roleName === "shooter" && scenario === "acceptedWithDeclinedHistory" && person) {
      return {
        ...baseSlot,
        invitations: [
          createAcceptedInvitation(slotId, person, index),
          {
            id: `${slotId}-ct-role-filled`,
            personId: "ct",
            status: "declined",
            sentAt: createMockTimestamp(index + 2),
            respondedAt: createMockTimestamp(index + 1),
            rateSnapshot: getTeamPerson("ct")?.hourlyRate,
            declinedReason: "role_filled",
          },
        ],
        acceptedInvitationId: `${slotId}-${person.id}-accepted`,
      };
    }

    if (roleName === "shooter" && scenario === "directAssignedFreelancer") {
      const directPerson = getTeamPerson("ak");

      if (!directPerson) {
        return baseSlot;
      }

      return {
        ...baseSlot,
        invitations: [createAcceptedInvitation(slotId, directPerson, index, "direct")],
        acceptedInvitationId: `${slotId}-${directPerson.id}-accepted`,
      };
    }

    return baseSlot;
  });
}

export function createStageAssignments(stages: StageKey[], totalHours: number): StageAssignment[] {
  if (stages.length === 0) {
    return [];
  }

  const snappedTotal = snapToQuarter(totalHours);
  const quarterUnits = Math.round(snappedTotal * 4);
  const baseUnits = Math.floor(quarterUnits / stages.length);
  const extraUnits = quarterUnits % stages.length;

  return stages.map((stageId, index) => ({
    stageId,
    estimatedHours: (baseUnits + (index < extraUnits ? 1 : 0)) / 4,
    manualEstimate: totalHours > 0,
  }));
}

export function redistributeRoleHours(roleSlot: RoleSlot, totalHours: number): RoleSlot {
  return {
    ...roleSlot,
    stages: createStageAssignments(
      roleSlot.stages.map((stageAssignment) => stageAssignment.stageId),
      totalHours,
    ),
  };
}

export function setRoleStages(roleSlot: RoleSlot, stages: StageKey[]): RoleSlot {
  return {
    ...roleSlot,
    stages: createStageAssignments(stages, getRoleEstimatedHours(roleSlot)),
  };
}

function createAcceptedInvitation(slotId: string, person: TeamPerson, offset: number, assignmentMethod: Invitation["assignmentMethod"] = "invited"): Invitation {
  return {
    id: `${slotId}-${person.id}-accepted`,
    personId: person.id,
    status: "accepted",
    sentAt: createMockTimestamp(offset + 2),
    respondedAt: createMockTimestamp(offset + 1),
    rateSnapshot: person.personType === "Studio Freelancer" ? person.hourlyRate : undefined,
    assignmentMethod,
  };
}

function createPendingFreelanceSlot(slot: RoleSlot, personIds: string[], statuses: Array<"invited" | "seen">): RoleSlot {
  return {
    ...slot,
    invitations: personIds.map((personId, index) => {
      const person = getTeamPerson(personId);

      return {
        id: `${slot.id}-${personId}-pending`,
        personId,
        status: statuses[index] ?? "invited",
        sentAt: createMockTimestamp(index + 1),
        rateSnapshot: person?.hourlyRate,
      };
    }),
    acceptedInvitationId: undefined,
  };
}

function createMockTimestamp(daysAgo: number) {
  return new Date(Date.UTC(2026, 5, 18 - daysAgo, 2, 30)).toISOString();
}

export function createMockTimeEntries(projectId: string, team: RoleSlot[], intensity = 0.45): TimeEntry[] {
  return team.flatMap((roleSlot, roleIndex) => {
    const person = getAcceptedPerson(roleSlot);

    if (!person) {
      return [];
    }

    return roleSlot.stages
      .filter((stageAssignment) => stageAssignment.estimatedHours > 0)
      .slice(0, 3)
      .map((stageAssignment, stageIndex) => ({
        id: `${projectId}-${roleSlot.id}-${stageAssignment.stageId}`,
        roleSlotId: roleSlot.id,
        personId: person.id,
        stageId: stageAssignment.stageId,
        hours: snapToQuarter(Math.max(0.25, stageAssignment.estimatedHours * intensity + roleIndex * 0.25 + stageIndex * 0.25)),
        note: `${stageLabels[stageAssignment.stageId]} work logged`,
        loggedAt: new Date(Date.UTC(2026, 5, 18 - roleIndex - stageIndex, 2, 30)).toISOString(),
      }));
  });
}

export function getRoleEstimatedHours(roleSlot: RoleSlot) {
  return roleSlot.stages.reduce((total, stageAssignment) => total + stageAssignment.estimatedHours, 0);
}

export function getRoleLoggedHours(roleSlot: RoleSlot, timeEntries: TimeEntry[]) {
  return timeEntries
    .filter((entry) => entry.roleSlotId === roleSlot.id)
    .reduce((total, entry) => total + entry.hours, 0);
}

export function getProjectEstimatedHours(team: RoleSlot[]) {
  return team.reduce((total, roleSlot) => total + getRoleEstimatedHours(roleSlot), 0);
}

export function getProjectLoggedHours(team: RoleSlot[], timeEntries: TimeEntry[]) {
  return team.reduce((total, roleSlot) => total + getRoleLoggedHours(roleSlot, timeEntries), 0);
}

export function getFreelanceCostRange(roleSlot: RoleSlot) {
  const estimatedHours = getRoleEstimatedHours(roleSlot);
  const acceptedInvitation = getAcceptedInvitation(roleSlot);

  if (acceptedInvitation) {
    const acceptedPerson = getTeamPerson(acceptedInvitation.personId);
    const acceptedRate = acceptedPerson?.personType === "Studio Freelancer" ? getInvitationRate(acceptedInvitation) : undefined;

    if (!acceptedRate) {
      return undefined;
    }

    const cost = estimatedHours * acceptedRate;

    return { min: cost, max: cost };
  }

  const pendingRates = getVisibleInvitations(roleSlot)
    .map(getInvitationRate)
    .filter((rate): rate is number => typeof rate === "number");

  if (pendingRates.length === 0) {
    return undefined;
  }

  return {
    min: Math.min(...pendingRates) * estimatedHours,
    max: Math.max(...pendingRates) * estimatedHours,
  };
}

export function getProjectFreelanceCostRange(team: RoleSlot[]) {
  const ranges = team.map(getFreelanceCostRange).filter((range): range is { min: number; max: number } => Boolean(range));

  if (ranges.length === 0) {
    return undefined;
  }

  return ranges.reduce(
    (total, range) => ({
      min: total.min + range.min,
      max: total.max + range.max,
    }),
    { min: 0, max: 0 },
  );
}

export function formatHours(hours: number) {
  return Number.isInteger(hours) ? `${hours}h` : `${hours.toFixed(2).replace(/\.?0+$/, "")}h`;
}

export function snapToQuarter(hours: number) {
  return Math.round(hours * 4) / 4;
}
