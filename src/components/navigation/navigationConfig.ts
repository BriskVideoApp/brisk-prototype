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
};

function projectItem(
  experience: DemoProjectExperience,
  roles: readonly PrototypeRole[],
  options: Pick<NavigationItem, "reviewOnly"> & { id?: string } = {},
): NavigationItem {
  const destination = primaryDemoProject.destinations[experience];
  const { id, ...itemOptions } = options;

  return {
    id: id ?? `demo-project-${experience}`,
    label: destination.label,
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
        roles: studioOnly,
      },
      {
        id: "videos",
        label: "Videos",
        href: "/active-videos",
        icon: "queue",
        roles: studioRoles,
      },
      {
        id: "client-dashboard",
        label: "Dashboard",
        href: "/customer-dashboard",
        icon: "grid-four",
        roles: clientOnly,
      },
      {
        id: "chat",
        label: "Chat",
        href: "/chat",
        icon: "chats",
        roles: allRoles,
      },
    ],
  },
  {
    id: "clients",
    label: "Clients",
    items: [
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
      projectItem("overview", studioOnly),
      projectItem("brief", allRoles),
      projectItem("script", allRoles),
      projectItem("transcripts", allRoles),
      projectItem("shoot", studioRoles),
      projectItem("callSheet", allRoles),
      projectItem("media", allRoles),
      projectItem("edit", allRoles),
      projectItem("masters", allRoles),
      projectItem("files", studioRoles),
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
      items: group.items.filter((item) => {
        if (allPages) return true;
        if (item.reviewOnly) return false;
        return item.roles.includes(selectedRole);
      }),
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
  if (allPages) return true;
  if (item.reviewOnly) return false;
  return item.roles.includes(selectedRole);
}

export function getRoleHome(selectedRole: PrototypeRole) {
  if (selectedRole === "Studio Staff") return "/today";
  if (selectedRole === "Studio Freelancer") return "/active-videos";
  return "/customer-dashboard";
}
