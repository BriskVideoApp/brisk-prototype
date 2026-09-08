import type { PrototypeRole } from "@/components/navigation/PrototypeRoleContext";
import type { DsIconName } from "@/components/video-review/DsIcon";
import {
  primaryDemoProject,
  type DemoProjectExperience,
} from "@/data/projects";

export type NavigationGroupId =
  | "workspace"
  | "clients"
  | "current-video"
  | "studio-settings"
  | "setup"
  | "external-previews"
  | "experimental";

export type NavigationItem = {
  id: string;
  label: string;
  href: string;
  icon: DsIconName;
  roles: readonly PrototypeRole[];
  activePath?: string;
  matchQuery?: Readonly<Record<string, string>>;
  external?: boolean;
  reviewOnly?: boolean;
  sidebarHidden?: boolean;
  strictRoleVisibility?: boolean;
};

export type NavigationGroup = {
  id: NavigationGroupId;
  label: string;
  collapsible?: boolean;
  items: readonly NavigationItem[];
};

const allRoles: readonly PrototypeRole[] = [
  "Studio Staff",
  "Studio Freelancer",
  "Customer",
];
const studioRoles: readonly PrototypeRole[] = ["Studio Staff", "Studio Freelancer"];
const studioOnly: readonly PrototypeRole[] = ["Studio Staff"];
const clientOnly: readonly PrototypeRole[] = ["Customer"];
const clientDashboardRoles: readonly PrototypeRole[] = ["Studio Staff", "Customer"];
const personalSettingsRoles: readonly PrototypeRole[] = allRoles;

const projectIconByExperience: Record<DemoProjectExperience, DsIconName> = {
  overview: "grid-four",
  brief: "clipboard-text",
  script: "pen-nib",
  transcripts: "file-text",
  shoot: "video-camera-ds",
  callSheet: "clipboard-text",
  media: "image-square",
  edit: "stage-edit",
  masters: "film-strip",
  files: "folder-open",
  costs: "file-text",
};

function projectItem(
  experience: DemoProjectExperience,
  roles: readonly PrototypeRole[],
  options: Partial<Pick<NavigationItem, "label" | "reviewOnly" | "sidebarHidden" | "strictRoleVisibility">> & { id?: string } = {},
): NavigationItem {
  const destination = primaryDemoProject.destinations[experience];
  const { id, label, ...itemOptions } = options;

  return {
    id: id ?? `demo-project-${experience}`,
    label: label ?? destination.label,
    href: destination.href,
    icon: projectIconByExperience[experience],
    roles,
    activePath: destination.href.split("?")[0],
    matchQuery: experience === "transcripts" ? { subtab: "transcripts" } : undefined,
    external: destination.external,
    ...itemOptions,
  };
}

export const navigationGroups: readonly NavigationGroup[] = [
  {
    id: "workspace",
    label: "Workspace",
    items: [
      {
        id: "today",
        label: "Today",
        href: "/today",
        icon: "check-circle",
        roles: studioRoles,
      },
      {
        id: "videos",
        label: "Videos",
        href: "/active-videos",
        icon: "queue",
        roles: studioRoles,
      },
      {
        id: "media-library",
        label: "Media Library",
        href: "/media",
        icon: "image-square",
        roles: allRoles,
      },
      {
        id: "outstanding-invoices",
        label: "Invoices to pay",
        href: "/outstanding-invoices",
        icon: "file-text",
        roles: studioOnly,
        strictRoleVisibility: true,
      },
      {
        id: "client-dashboard",
        label: "Client portal",
        href: "/prototype/scenarios",
        icon: "grid-four",
        roles: clientDashboardRoles,
      },
      {
        id: "chat",
        label: "Chat",
        href: "/chat",
        icon: "chats",
        roles: allRoles,
      },
      {
        id: "notifications",
        label: "Notifications",
        href: "/notifications",
        icon: "bell",
        roles: allRoles,
        sidebarHidden: true,
      },
      {
        id: "personal-notification-settings",
        label: "Notification preferences",
        href: "/settings/personal/notifications",
        icon: "settings",
        roles: allRoles,
        sidebarHidden: true,
      },
      {
        id: "personal-profile-settings",
        label: "My profile",
        href: "/settings/personal/profile",
        icon: "settings",
        roles: personalSettingsRoles,
        sidebarHidden: true,
        strictRoleVisibility: true,
      },
      {
        id: "personal-security-settings",
        label: "Security",
        href: "/settings/personal/security",
        icon: "lock",
        roles: personalSettingsRoles,
        sidebarHidden: true,
        strictRoleVisibility: true,
      },
      {
        id: "client-company-settings",
        label: "Company details",
        href: "/settings/client/company",
        icon: "settings",
        roles: clientOnly,
        sidebarHidden: true,
        strictRoleVisibility: true,
      },
      {
        id: "client-team-settings",
        label: "Team access",
        href: "/settings/client/team",
        icon: "users-three",
        roles: clientOnly,
        sidebarHidden: true,
        strictRoleVisibility: true,
      },
      {
        id: "client-invoices",
        label: "Invoices & payments",
        href: "/client/invoices",
        icon: "file-text",
        roles: clientOnly,
        sidebarHidden: true,
        strictRoleVisibility: true,
      },
    ],
  },
  {
    id: "clients",
    label: "People & Clients",
    items: [
      {
        id: "people",
        label: "People",
        href: "/people",
        icon: "users-three",
        roles: studioOnly,
        strictRoleVisibility: true,
      },
      {
        id: "clients",
        label: "Clients",
        href: "/clients",
        icon: "users-three",
        roles: studioOnly,
        strictRoleVisibility: true,
      },
      {
        id: "brand-kits",
        label: "Brand Kits",
        href: "/brand-kits",
        icon: "frame-corners",
        roles: studioRoles,
      },
      {
        id: "client-brand-kit",
        label: "Brand Kit",
        href: `/brand-kits/${primaryDemoProject.customerSlug}`,
        icon: "frame-corners",
        roles: clientOnly,
      },
    ],
  },
  {
    id: "current-video",
    label: "Current video",
    collapsible: true,
    items: [
      projectItem("overview", studioOnly, { label: "Settings", sidebarHidden: true }),
      projectItem("brief", allRoles),
      projectItem("script", allRoles),
      projectItem("transcripts", allRoles),
      projectItem("shoot", studioRoles),
      projectItem("callSheet", allRoles),
      projectItem("media", allRoles, { sidebarHidden: true }),
      projectItem("edit", allRoles),
      projectItem("masters", allRoles),
      projectItem("files", studioRoles, { sidebarHidden: true }),
      projectItem("costs", studioOnly, { strictRoleVisibility: true }),
    ],
  },
  {
    id: "studio-settings",
    label: "Studio Settings",
    items: [
      {
        id: "studio-settings",
        label: "Studio settings",
        href: "/settings/studio",
        icon: "settings",
        roles: studioOnly,
        strictRoleVisibility: true,
      },
      {
        id: "studio-branding",
        label: "Branding",
        href: "/settings/studio/branding",
        icon: "square-logo",
        roles: studioOnly,
        sidebarHidden: true,
        strictRoleVisibility: true,
      },
      {
        id: "studio-team-access",
        label: "Team & access",
        href: "/settings/studio/team",
        icon: "users-three",
        roles: studioOnly,
        sidebarHidden: true,
        strictRoleVisibility: true,
      },
      {
        id: "studio-production-defaults",
        label: "Production defaults",
        href: "/settings/studio/production",
        icon: "queue",
        roles: studioOnly,
        sidebarHidden: true,
        strictRoleVisibility: true,
      },
      {
        id: "studio-ai-playbook",
        label: "AI Playbook",
        href: "/settings/studio/ai-playbook",
        icon: "sparkle",
        roles: studioOnly,
        sidebarHidden: true,
        strictRoleVisibility: true,
      },
      {
        id: "studio-notifications",
        label: "Notifications",
        href: "/settings/notifications",
        icon: "bell",
        roles: studioOnly,
        sidebarHidden: true,
        strictRoleVisibility: true,
      },
      {
        id: "plan-billing",
        label: "Plan & billing",
        href: "/settings/plan-billing",
        icon: "settings",
        roles: studioOnly,
        sidebarHidden: true,
        strictRoleVisibility: true,
      },
      {
        id: "client-billing",
        label: "Client billing",
        href: "/settings/client-billing",
        icon: "link",
        roles: studioOnly,
        sidebarHidden: true,
        strictRoleVisibility: true,
      },
    ],
  },
  {
    id: "setup",
    label: "Setup",
    items: [
      {
        id: "studio-onboarding",
        label: "Studio onboarding",
        href: "/studio-onboard",
        icon: "sparkle",
        roles: studioOnly,
      },
      {
        id: "testing-scenarios",
        label: "Testing scenarios",
        href: "/prototype/scenarios",
        icon: "circles-three",
        roles: allRoles,
      },
    ],
  },
  {
    id: "external-previews",
    label: "External previews",
    items: [
      {
        id: "shared-brand-kit",
        label: "Shared Brand Kit",
        href: "/share/brand/loom-2026",
        icon: "globe",
        roles: allRoles,
        external: true,
        reviewOnly: true,
      },
      {
        id: "sub-brand-kit",
        label: "Sub-brand Kit - Loom AI",
        href: "/brand-kits/loom/loom-ai",
        icon: "frame-corners",
        roles: studioRoles,
        reviewOnly: true,
      },
      projectItem("callSheet", allRoles, {
        id: "external-shared-call-sheet",
        reviewOnly: true,
      }),
    ],
  },
  {
    id: "experimental",
    label: "Prototype previews",
    items: [
      {
        id: "production-flow",
        label: "Production flow",
        href: "/prototype/production-flow",
        icon: "circles-three",
        roles: allRoles,
        reviewOnly: true,
      },
      {
        id: "share-controls",
        label: "Share controls",
        href: "/share",
        icon: "link",
        roles: allRoles,
        reviewOnly: true,
      },
    ],
  },
] as const;

export function getVisibleNavigationGroups(
  selectedRole: PrototypeRole,
  allPages: boolean,
) {
  return navigationGroups
    .map((group) => ({
      ...group,
      label: allPages && group.id === "current-video"
        ? `Demo project - ${primaryDemoProject.navigationLabel}`
        : group.label,
      items: group.items
        .filter((item) => {
          if (item.sidebarHidden) return false;
          return canRoleSeeNavigationItem(item, selectedRole, allPages);
        })
        .map((item) => item.id === "videos" && selectedRole === "Studio Freelancer"
          ? { ...item, label: "My jobs" }
          : item),
    }))
    .filter((group) => group.items.length > 0);
}

export function getNavigationItem(pathname: string, search = "") {
  const searchParams = new URLSearchParams(search);
  const candidates = navigationGroups
    .flatMap((group) => group.items)
    .filter((item) => {
      const activePath = item.activePath ?? item.href.split("?")[0];

      if (pathname !== activePath) return false;
      if (!item.matchQuery) return true;

      return Object.entries(item.matchQuery)
        .every(([key, value]) => searchParams.get(key) === value);
    })
    .sort((left, right) => {
      const queryPriority = Number(Boolean(right.matchQuery)) - Number(Boolean(left.matchQuery));
      return queryPriority || right.href.length - left.href.length;
    });

  return candidates[0] ?? null;
}

export function canRoleSeeNavigationItem(
  item: NavigationItem,
  selectedRole: PrototypeRole,
  allPages: boolean,
) {
  if (item.strictRoleVisibility && !item.roles.includes(selectedRole)) return false;
  if (allPages) return true;
  if (item.reviewOnly) return false;
  return item.roles.includes(selectedRole);
}

export function getRoleHome(selectedRole: PrototypeRole) {
  if (selectedRole === "Studio Staff") return "/today";
  if (selectedRole === "Studio Freelancer") return "/today";
  return "/prototype/scenarios";
}
