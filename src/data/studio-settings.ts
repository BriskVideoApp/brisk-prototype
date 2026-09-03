import type { DefaultProjectTeamMember } from "@/components/active-videos/types";
import {
  createStudioBrandColours,
  getStudioBrandColours,
  type StudioBrandAccentId,
  type StudioBrandColour,
} from "@/data/studio-onboard";
import {
  cloneStudioNotificationSettings,
  initialStudioNotificationSettings,
  type StudioNotificationSettings,
} from "@/data/notification-settings";

export type StudioDetails = {
  name: string;
  legalName: string;
  studioType: string;
  description: string;
  website: string;
  contactEmail: string;
  country: string;
  timezone: string;
  currency: string;
};

export type StudioBranding = {
  logoPreviewUrl: string | null;
  logoOptions: string[];
  brandAccentId: StudioBrandAccentId;
  brandColours: StudioBrandColour[];
};

export type StudioBriefTemplateId = "brisk-standard" | "simple-request" | "none";
export type StudioReviewReminderId = "none" | "one-working-day" | "two-working-days" | "three-working-days";

export type StudioProductionDefaults = {
  briefTemplateId: StudioBriefTemplateId;
  projectNumberPrefix: string;
  nextProjectNumber: string;
  reviewReminderId: StudioReviewReminderId;
  defaultActiveVideosPerClient: number;
  defaultTeam: DefaultProjectTeamMember[];
  clientPortal: {
    showProjectQueue: boolean;
    showCompletedProjects: boolean;
    allowClientsToInviteColleagues: boolean;
  };
};

export type StudioStaffStatus = "Active" | "Pending invite" | "Expired invite" | "Paused" | "Removed";

export type StudioStaffAccess = {
  personId: string;
  status: StudioStaffStatus;
  hasBillingAccess: boolean;
};

export type StudioIntegrationId = "whatsapp" | "slack";

export type StudioIntegration = {
  connected: boolean;
  detail: string;
};

export type StudioIntegrations = Record<StudioIntegrationId, StudioIntegration>;

export type StudioSettings = {
  details: StudioDetails;
  branding: StudioBranding;
  production: StudioProductionDefaults;
  integrations: StudioIntegrations;
  notifications: StudioNotificationSettings;
  staffAccess: StudioStaffAccess[];
};

export const initialStudioSettings: StudioSettings = {
  details: {
    name: "ChopChop Film",
    legalName: "ChopChop Film Pty Ltd",
    studioType: "Production and post-production",
    description: "Films for ambitious teams and purpose-driven organisations.",
    website: "https://chopchop.film",
    contactEmail: "tom@chopchop.film",
    country: "Australia",
    timezone: "Australia/Sydney",
    currency: "AUD",
  },
  branding: {
    logoPreviewUrl: null,
    logoOptions: [],
    brandAccentId: "purple",
    brandColours: createStudioBrandColours("purple"),
  },
  production: {
    briefTemplateId: "brisk-standard",
    projectNumberPrefix: "CC",
    nextProjectNumber: "001",
    reviewReminderId: "two-working-days",
    defaultActiveVideosPerClient: 4,
    defaultTeam: [
      {
        id: "default-producer",
        role: "producer",
        personId: "te",
      },
      {
        id: "default-editor",
        role: "editor",
        personId: "sc",
      },
    ],
    clientPortal: {
      showProjectQueue: true,
      showCompletedProjects: true,
      allowClientsToInviteColleagues: true,
    },
  },
  integrations: {
    whatsapp: {
      connected: true,
      detail: "ChopChop Film Business",
    },
    slack: {
      connected: false,
      detail: "ChopChop Film Slack",
    },
  },
  notifications: cloneStudioNotificationSettings(initialStudioNotificationSettings),
  staffAccess: [
    {
      personId: "tom-maclachlan",
      status: "Active",
      hasBillingAccess: true,
    },
    {
      personId: "producer",
      status: "Active",
      hasBillingAccess: false,
    },
    {
      personId: "editor",
      status: "Pending invite",
      hasBillingAccess: false,
    },
  ],
};

export function cloneStudioSettings(settings: StudioSettings): StudioSettings {
  return {
    details: { ...initialStudioSettings.details, ...settings.details },
    branding: {
      ...settings.branding,
      logoOptions: [...settings.branding.logoOptions],
      brandColours: getStudioBrandColours(settings.branding),
    },
    production: {
      ...initialStudioSettings.production,
      ...settings.production,
      defaultTeam: (settings.production.defaultTeam ?? initialStudioSettings.production.defaultTeam).map((member) => ({ ...member })),
      clientPortal: { ...settings.production.clientPortal },
    },
    integrations: {
      whatsapp: { ...settings.integrations.whatsapp },
      slack: { ...settings.integrations.slack },
    },
    notifications: cloneStudioNotificationSettings(settings.notifications),
    staffAccess: settings.staffAccess.map((staffMember) => ({ ...staffMember })),
  };
}
