export type StageKey = "brief" | "script" | "shoot" | "media" | "edit" | "masters";

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

export type DefaultProjectTeamMember = {
  id: string;
  role: Exclude<TeamRole, "custom">;
  personId: string | null;
};

export type InvitationStatus = "invited" | "seen" | "accepted" | "declined" | "expired" | "withdrawn";

export type InvitationDeclineReason = "role_filled" | "manual" | "unavailable";

export type InvitationPaymentBasis = "hourly" | "flat";

export type InvitationPaymentTerms = {
  basis: InvitationPaymentBasis;
  hourlyRate?: number;
  projectRate?: number;
  flatRate?: number;
};

export type StageStatus = {
  state: "not_started" | "in_progress" | "waiting" | "done";
  daysAgo?: number;
  approvedAt?: string;
  approvedBy?: string;
  assignedTo?: string;
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
  projectRateSnapshot?: number;
  paymentBasis?: InvitationPaymentBasis;
  flatRateSnapshot?: number;
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

export type ProjectFileLocation = {
  url: string;
  label?: string;
  notes?: string;
  last_confirmed_at: string | null;
  last_confirmed_by: string | null;
  created_at: string;
  created_by: string;
  updated_at: string;
  updated_by: string;
};

export type Project = {
  id: string;
  clientId: string;
  clientBadge: string;
  clientName: string;
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
  deliveredAt?: string;
  deliveredBy?: string;
  file_locations: ProjectFileLocation[];
  stages: Record<StageKey, StageStatus>;
  team: RoleSlot[];
  timeEntries: TimeEntry[];
};
