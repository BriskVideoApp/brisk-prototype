export type NotificationDeliveryChannelId = "email" | "whatsapp" | "browser-push" | "slack" | "teams";

export type NotificationDeliveryChannel = {
  id: NotificationDeliveryChannelId;
  label: string;
  description: string;
  availability: "available" | "v1.5" | "later";
};

export const notificationDeliveryChannels = [
  {
    id: "email",
    label: "Email",
    description: "Send updates and reminders by email.",
    availability: "available",
  },
  {
    id: "whatsapp",
    label: "WhatsApp",
    description: "Send updates and reminders through WhatsApp.",
    availability: "v1.5",
  },
  {
    id: "browser-push",
    label: "Browser notifications",
    description: "Show important updates in the user’s browser.",
    availability: "v1.5",
  },
  {
    id: "slack",
    label: "Slack",
    description: "Send Studio updates to a Slack workspace.",
    availability: "later",
  },
  {
    id: "teams",
    label: "Teams",
    description: "Send Studio updates to Microsoft Teams.",
    availability: "later",
  },
] as const satisfies readonly NotificationDeliveryChannel[];

export type StudioNotificationCategoryId =
  | "customer-reviews"
  | "customer-comments"
  | "project-changes"
  | "published-shoot-updates"
  | "assignments-offers"
  | "media-requests"
  | "contractor-invoices"
  | "billing-security";

export type StudioNotificationCategory = {
  id: StudioNotificationCategoryId;
  label: string;
  description: string;
  mandatory?: boolean;
};

export const studioNotificationCategories = [
  {
    id: "customer-reviews",
    label: "Work to review",
    description: "Review requests, approvals and changes after approval.",
  },
  {
    id: "customer-comments",
    label: "Comments and replies",
    description: "Mentions, replies that need an answer and important Client responses.",
  },
  {
    id: "project-changes",
    label: "Project changes",
    description: "Important changes to people, dates and the project.",
  },
  {
    id: "published-shoot-updates",
    label: "Shoot changes",
    description: "Published call sheets and important changes to shoot details.",
  },
  {
    id: "assignments-offers",
    label: "Work and offers",
    description: "New project work, Freelancer offers and responses.",
  },
  {
    id: "media-requests",
    label: "Files and transcripts",
    description: "File requests, completed transcripts and files that need attention.",
  },
  {
    id: "contractor-invoices",
    label: "Invoices",
    description: "Invoices requiring forwarding, approval or payment updates.",
  },
  {
    id: "billing-security",
    label: "Account and access",
    description: "Important account, access and security emails are always sent.",
    mandatory: true,
  },
] as const satisfies readonly StudioNotificationCategory[];

export type StudioFirstReminderId = "none" | "12-hours" | "24-hours" | "48-hours";
export type StudioFinalReminderId = "none" | "48-hours" | "72-hours";

export type StudioNotificationSettings = {
  emailDeliveryEnabled: boolean;
  categoryDefaults: Record<StudioNotificationCategoryId, boolean>;
  customerMessages: {
    sendReviewRequests: boolean;
    sendApprovalConfirmations: boolean;
    notifyAssignedReplies: boolean;
  };
  reminders: {
    firstReminderId: StudioFirstReminderId;
    finalReminderId: StudioFinalReminderId;
    escalateAfterFinalReminder: boolean;
  };
};

export const initialStudioNotificationSettings: StudioNotificationSettings = {
  emailDeliveryEnabled: true,
  categoryDefaults: {
    "customer-reviews": true,
    "customer-comments": true,
    "project-changes": true,
    "published-shoot-updates": true,
    "assignments-offers": true,
    "media-requests": true,
    "contractor-invoices": true,
    "billing-security": true,
  },
  customerMessages: {
    sendReviewRequests: true,
    sendApprovalConfirmations: true,
    notifyAssignedReplies: true,
  },
  reminders: {
    firstReminderId: "24-hours",
    finalReminderId: "48-hours",
    escalateAfterFinalReminder: true,
  },
};

export type PersonalProjectSubscription = "important-only" | "mentions-only";

export type PersonalNotificationSettings = {
  inAppActionRequired: boolean;
  mentionsAndDms: boolean;
  emailFallback: boolean;
  dailyDigest: boolean;
  quietHoursEnabled: boolean;
  quietHoursStart: string;
  quietHoursEnd: string;
  timezone: string;
  defaultProjectSubscription: PersonalProjectSubscription;
};

export const initialPersonalNotificationSettings: PersonalNotificationSettings = {
  inAppActionRequired: true,
  mentionsAndDms: true,
  emailFallback: true,
  dailyDigest: false,
  quietHoursEnabled: true,
  quietHoursStart: "18:00",
  quietHoursEnd: "08:00",
  timezone: "Australia/Sydney",
  defaultProjectSubscription: "important-only",
};

export type ProjectNotificationFollowMode = "studio-default" | "follow-all" | "important-only" | "mentions-only" | "muted";
export type ProjectNotificationReminderTiming = "studio-default" | "24-hours" | "48-hours" | "off";

export type ProjectNotificationOverrides = {
  customerRecipientIds: string[];
  reminderTiming: ProjectNotificationReminderTiming;
  followMode: ProjectNotificationFollowMode;
  escalationPersonId: string;
};

export const initialProjectNotificationOverrides: ProjectNotificationOverrides = {
  customerRecipientIds: [],
  reminderTiming: "studio-default",
  followMode: "studio-default",
  escalationPersonId: "",
};

const projectNotificationCustomersByClientBadge: Readonly<Record<string, ReadonlyArray<{ id: string; label: string }>>> = {
  LOOM: [
    { id: "user-jess", label: "Jess Taylor" },
    { id: "user-sarah", label: "Sarah Kim" },
  ],
  DEEL: [
    { id: "user-alex", label: "Alex Morgan" },
    { id: "user-priya", label: "Priya Nair" },
  ],
  HIMS: [
    { id: "user-maddie", label: "Maddie Park" },
    { id: "user-lee", label: "Lee Warren" },
  ],
  NOTN: [{ id: "user-amelia", label: "Amelia Grant" }],
  OPEN: [{ id: "user-jordan", label: "Jordan Bell" }],
  PHOG: [{ id: "user-cameron", label: "Cameron Hughes" }],
  RAMP: [{ id: "user-taylor", label: "Taylor Singh" }],
  CNVA: [{ id: "user-mia", label: "Mia Robinson" }],
  LINR: [{ id: "user-sam", label: "Sam Patel" }],
  FIGM: [{ id: "user-robin", label: "Robin Hayes" }],
};

export const projectNotificationEscalationPeople = [
  { id: "user-tom", label: "Tom Mitchell" },
  { id: "user-riley", label: "Riley Brooks" },
  { id: "user-sarah-chen", label: "Sarah Chen" },
] as const;

export function getProjectNotificationCustomers(clientBadge: string) {
  return projectNotificationCustomersByClientBadge[clientBadge] ?? [];
}

export function cloneStudioNotificationSettings(settings: StudioNotificationSettings): StudioNotificationSettings {
  return {
    ...settings,
    categoryDefaults: { ...settings.categoryDefaults },
    customerMessages: { ...settings.customerMessages },
    reminders: { ...settings.reminders },
  };
}

export function clonePersonalNotificationSettings(settings: PersonalNotificationSettings): PersonalNotificationSettings {
  return { ...settings };
}

export function cloneProjectNotificationOverrides(overrides: ProjectNotificationOverrides): ProjectNotificationOverrides {
  return {
    ...overrides,
    customerRecipientIds: [...overrides.customerRecipientIds],
  };
}

export function projectUsesStudioNotificationDefaults(overrides: ProjectNotificationOverrides) {
  return overrides.customerRecipientIds.length === 0
    && overrides.reminderTiming === "studio-default"
    && overrides.followMode === "studio-default"
    && overrides.escalationPersonId === "";
}
