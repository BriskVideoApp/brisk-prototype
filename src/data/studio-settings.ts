import { cloneTurnaround, type StudioTurnaround } from "@/data/turnaround";
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

export type StudioProductionDefaults = {
  turnaround?: StudioTurnaround;
  defaultTeam: DefaultProjectTeamMember[];
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
      defaultTeam: (settings.production.defaultTeam ?? initialStudioSettings.production.defaultTeam).map((member) => ({ ...member })),
      turnaround: cloneTurnaround(settings.production.turnaround),
    },
    integrations: {
      whatsapp: { ...settings.integrations.whatsapp },
      slack: { ...settings.integrations.slack },
    },
    notifications: cloneStudioNotificationSettings(settings.notifications),
    staffAccess: settings.staffAccess.map((staffMember) => ({ ...staffMember })),
  };
}
