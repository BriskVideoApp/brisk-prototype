import type { StudioBrandAccentId } from "@/data/studio-onboard";

export type StudioDetails = {
  name: string;
  legalName: string;
  studioType: string;
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
};

export type StudioBriefTemplateId = "brisk-standard" | "simple-request" | "none";
export type StudioReviewReminderId = "none" | "one-working-day" | "two-working-days" | "three-working-days";

export type StudioProductionDefaults = {
  briefTemplateId: StudioBriefTemplateId;
  projectNumberPrefix: string;
  nextProjectNumber: string;
  reviewReminderId: StudioReviewReminderId;
  defaultActiveVideosPerClient: number;
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

export type StudioSettings = {
  details: StudioDetails;
  branding: StudioBranding;
  production: StudioProductionDefaults;
  staffAccess: StudioStaffAccess[];
};

export const initialStudioSettings: StudioSettings = {
  details: {
    name: "ChopChop Film",
    legalName: "ChopChop Film Pty Ltd",
    studioType: "Production and post-production",
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
  },
  production: {
    briefTemplateId: "brisk-standard",
    projectNumberPrefix: "CC",
    nextProjectNumber: "001",
    reviewReminderId: "two-working-days",
    defaultActiveVideosPerClient: 4,
    clientPortal: {
      showProjectQueue: true,
      showCompletedProjects: true,
      allowClientsToInviteColleagues: true,
    },
  },
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
    details: { ...settings.details },
    branding: {
      ...settings.branding,
      logoOptions: [...settings.branding.logoOptions],
    },
    production: {
      ...settings.production,
      clientPortal: { ...settings.production.clientPortal },
    },
    staffAccess: settings.staffAccess.map((staffMember) => ({ ...staffMember })),
  };
}
