export type ClientType = "Organisation" | "Individual";
export type ClientStatus = "Active" | "Inactive" | "Archived";
export type PortalStatus = "Active" | "Paused";
export type PortalAccessStatus = "Active" | "Invited" | "Paused";

export type ClientContact = {
  id: string;
  name: string;
  email: string;
  portalAccess: PortalAccessStatus;
  lastActive: string | null;
  projectIds: string[];
  membershipRole: "Client Admin" | "Client Member";
};

export type Client = {
  id: string;
  name: string;
  badge: string;
  type: ClientType;
  status: ClientStatus;
  website: string;
  logoUrl: string | null;
  primaryContactId: string | null;
  contacts: ClientContact[];
  latestActivity: {
    label: string;
    occurredAt: string;
  };
  portal: {
    status: PortalStatus;
    slug: string;
  };
  defaultBrandKitSlug: string | null;
};

export type NewClientInput = {
  name: string;
  type?: ClientType;
  website?: string;
  logoUrl?: string | null;
  primaryContactName?: string;
  primaryContactEmail?: string;
};

function contact(
  id: string,
  name: string,
  email: string,
  projectIds: string[],
  lastActive: string | null = "2026-08-11T10:24:00+10:00",
  membershipRole: ClientContact["membershipRole"] = "Client Member",
): ClientContact {
  return {
    id,
    name,
    email,
    portalAccess: "Active",
    lastActive,
    projectIds,
    membershipRole,
  };
}

export const clients: Client[] = [
  {
    id: "loom",
    name: "Loom",
    badge: "LOOM",
    type: "Organisation",
    status: "Active",
    website: "loom.com",
    logoUrl: "https://cdn.simpleicons.org/loom",
    primaryContactId: "loom-contact-1",
    contacts: [
      contact("client-jess", "Jess Taylor", "jess@loom.com", ["loom-launch-film", "loom-ai-launch", "loom-customer-stories", "loom-brand-refresh"], "2026-08-11T10:24:00+10:00", "Client Admin"),
      contact("client-sarah", "Sarah Kim", "sarah@loom.com", ["loom-launch-film", "loom-ai-launch"]),
      { ...contact("client-daniel", "Daniel Ortiz", "daniel@loom.com", ["loom-customer-stories"], null), portalAccess: "Invited" },
      contact("loom-contact-1", "Maya Chen", "maya@loom.com", ["loom-launch-film"], "2026-08-11T10:24:00+10:00", "Client Admin"),
      contact("loom-contact-2", "Elliot Brooks", "elliot@loom.com", ["loom-launch-film"], "2026-08-07T14:05:00+10:00"),
    ],
    latestActivity: { label: "Maya approved the Brief", occurredAt: "2026-08-11T10:24:00+10:00" },
    portal: { status: "Active", slug: "loom" },
    defaultBrandKitSlug: "loom",
  },
  {
    id: "deel",
    name: "Deel",
    badge: "DEEL",
    type: "Organisation",
    status: "Active",
    website: "deel.com",
    logoUrl: null,
    primaryContactId: "deel-contact-1",
    contacts: [contact("deel-contact-1", "Priya Nair", "priya@deel.com", ["deel-customer-story"], "2026-08-06T15:15:00+10:00")],
    latestActivity: { label: "Script approved by Priya", occurredAt: "2026-08-06T15:15:00+10:00" },
    portal: { status: "Active", slug: "deel" },
    defaultBrandKitSlug: "deel",
  },
  {
    id: "hims",
    name: "Hims & Hers",
    badge: "HIMS",
    type: "Organisation",
    status: "Active",
    website: "hims.com",
    logoUrl: null,
    primaryContactId: "hims-contact-1",
    contacts: [contact("hims-contact-1", "Noah Williams", "noah@hims.com", ["hims-product-education"], "2026-08-12T09:05:00+10:00")],
    latestActivity: { label: "Noah shared new product assets", occurredAt: "2026-08-12T09:05:00+10:00" },
    portal: { status: "Active", slug: "hims" },
    defaultBrandKitSlug: "hims",
  },
  {
    id: "notion",
    name: "Notion",
    badge: "NOTN",
    type: "Organisation",
    status: "Inactive",
    website: "notion.so",
    logoUrl: "https://cdn.simpleicons.org/notion",
    primaryContactId: "notion-contact-1",
    contacts: [contact("notion-contact-1", "Clara Wu", "clara@notion.so", ["notion-workflows"], "2026-07-30T11:40:00+10:00")],
    latestActivity: { label: "Project paused by Studio", occurredAt: "2026-08-10T11:40:00+10:00" },
    portal: { status: "Active", slug: "notion" },
    defaultBrandKitSlug: "notion",
  },
  {
    id: "openai",
    name: "OpenAI",
    badge: "OPEN",
    type: "Organisation",
    status: "Active",
    website: "openai.com",
    logoUrl: "https://cdn.jsdelivr.net/npm/simple-icons@latest/icons/openai.svg",
    primaryContactId: "openai-contact-1",
    contacts: [contact("openai-contact-1", "Sofia Patel", "sofia@openai.com", ["openai-partner-update"], "2026-08-08T16:20:00+10:00")],
    latestActivity: { label: "Masters delivered", occurredAt: "2026-08-08T16:20:00+10:00" },
    portal: { status: "Active", slug: "openai" },
    defaultBrandKitSlug: "openai",
  },
  {
    id: "posthog",
    name: "PostHog",
    badge: "PHOG",
    type: "Organisation",
    status: "Archived",
    website: "posthog.com",
    logoUrl: "https://cdn.simpleicons.org/posthog",
    primaryContactId: "posthog-contact-1",
    contacts: [contact("posthog-contact-1", "Amira James", "amira@posthog.com", ["posthog-onboarding"], "2026-06-06T12:05:00+10:00")],
    latestActivity: { label: "Client archived", occurredAt: "2026-08-01T16:45:00+10:00" },
    portal: { status: "Paused", slug: "posthog" },
    defaultBrandKitSlug: "posthog",
  },
  {
    id: "ramp",
    name: "Ramp",
    badge: "RAMP",
    type: "Organisation",
    status: "Inactive",
    website: "ramp.com",
    logoUrl: null,
    primaryContactId: "ramp-contact-1",
    contacts: [contact("ramp-contact-1", "Ben Foster", "ben@ramp.com", ["ramp-finance-recap"], "2026-08-03T13:30:00+10:00")],
    latestActivity: { label: "Ben requested a pause", occurredAt: "2026-08-09T13:30:00+10:00" },
    portal: { status: "Active", slug: "ramp" },
    defaultBrandKitSlug: "ramp",
  },
  {
    id: "canva",
    name: "Canva",
    badge: "CNVA",
    type: "Organisation",
    status: "Active",
    website: "canva.com",
    logoUrl: "https://cdn.jsdelivr.net/npm/simple-icons@latest/icons/canva.svg",
    primaryContactId: "canva-contact-1",
    contacts: [contact("canva-contact-1", "Talia Green", "talia@canva.com", ["canva-brand-refresh"], "2026-08-13T08:45:00+10:00")],
    latestActivity: { label: "Creative direction added", occurredAt: "2026-08-13T08:45:00+10:00" },
    portal: { status: "Active", slug: "canva" },
    defaultBrandKitSlug: "canva",
  },
  {
    id: "linear",
    name: "Linear",
    badge: "LINR",
    type: "Organisation",
    status: "Active",
    website: "linear.app",
    logoUrl: "https://cdn.simpleicons.org/linear",
    primaryContactId: "linear-contact-1",
    contacts: [contact("linear-contact-1", "Jon Bell", "jon@linear.app", ["linear-roadmap-film"], "2026-08-05T14:10:00+10:00")],
    latestActivity: { label: "Project completed", occurredAt: "2026-08-07T14:10:00+10:00" },
    portal: { status: "Active", slug: "linear" },
    defaultBrandKitSlug: "linear",
  },
  {
    id: "figma",
    name: "Figma",
    badge: "FIGM",
    type: "Organisation",
    status: "Archived",
    website: "figma.com",
    logoUrl: "https://cdn.simpleicons.org/figma",
    primaryContactId: null,
    contacts: [],
    latestActivity: { label: "Project archived", occurredAt: "2026-07-26T17:50:00+10:00" },
    portal: { status: "Paused", slug: "figma" },
    defaultBrandKitSlug: "figma",
  },
  {
    id: "alex-morgan",
    name: "Alex Morgan",
    badge: "AM",
    type: "Individual",
    status: "Active",
    website: "",
    logoUrl: null,
    primaryContactId: "alex-contact-1",
    contacts: [contact("alex-contact-1", "Alex Morgan", "alex.morgan@example.com", [])],
    latestActivity: { label: "Client added", occurredAt: "2026-08-09T11:30:00+10:00" },
    portal: { status: "Active", slug: "alex-morgan" },
    defaultBrandKitSlug: null,
  },
];

export function getClientInitials(name: string) {
  return name
    .split(/\s+/u)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word.charAt(0).toLocaleUpperCase("en-AU"))
    .join("");
}

export function makeClientId(name: string) {
  const base = name
    .toLocaleLowerCase("en-AU")
    .replace(/[^a-z0-9]+/gu, "-")
    .replace(/^-|-$/gu, "") || "client";

  return base;
}
