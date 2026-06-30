export type StageKey = "brief" | "script" | "shoot" | "storyboard" | "media" | "edit" | "masters";

export type ProjectVideoType = "liveAction" | "animation";

export type TeamRole =
  | "producer"
  | "editor"
  | "shooter"
  | "motionDesigner"
  | "animator"
  | "director"
  | "colourist"
  | "soundDesigner"
  | "vfxArtist"
  | "custom";

export type InvitationStatus = "invited" | "seen" | "accepted" | "declined" | "expired" | "withdrawn";

export type InvitationDeclineReason = "role_filled" | "manual" | "unavailable";

export type StageStatus = {
  state: "not_started" | "in_progress" | "waiting" | "done";
  daysAgo?: number;
};

export type ProjectDeadline = {
  stage?: StageKey;
  dueAt?: string;
  timerStartedAt?: string;
  finalDueAt?: string;
};

export type TeamPersonType = "Studio Staff" | "Studio Freelancer";

export type TeamPerson = {
  id: string;
  name: string;
  initials: string;
  personType: TeamPersonType;
  defaultRole: TeamRole;
  hourlyRate?: number;
  bookedHoursThisWeek: number;
  weeklyCapacityHours: number;
  availabilityLabel: "Available" | "Busy" | "Away";
  photoUrl?: string;
};

export type StageAssignment = {
  stageId: StageKey;
  estimatedHours: number;
  manualEstimate?: boolean;
};

export type Invitation = {
  id: string;
  personId: string;
  status: InvitationStatus;
  sentAt: string;
  respondedAt?: string;
  rateSnapshot?: number;
  declinedReason?: InvitationDeclineReason;
  assignmentMethod?: "invited" | "direct";
};

export type RoleSlot = {
  id: string;
  projectId: string;
  role: TeamRole;
  customRoleLabel?: string;
  stages: StageAssignment[];
  invitations: Invitation[];
  acceptedInvitationId?: string;
  archivedAt?: string;
};

export type TimeEntry = {
  id: string;
  roleSlotId: string;
  personId: string;
  stageId: StageKey;
  hours: number;
  note: string;
  loggedAt: string;
};

export type Project = {
  id: string;
  clientBadge: string;
  name: string;
  videoType: ProjectVideoType;
  videoLengthSeconds: number;
  latestUpdate: {
    label: string;
    daysAgo: number;
    timestamp: string;
  };
  tags?: string[];
  deadlineAt: string;
  isCritical: boolean;
  unreadMessages?: number;
  deadline?: ProjectDeadline;
  status: "Queued" | "In Production" | "Completed" | "Paused" | "Archived";
  stages: Record<StageKey, StageStatus>;
  team: RoleSlot[];
  timeEntries: TimeEntry[];
};
