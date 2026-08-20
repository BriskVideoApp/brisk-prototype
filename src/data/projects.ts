export type DemoProjectExperience =
  | "overview"
  | "brief"
  | "script"
  | "transcripts"
  | "shoot"
  | "callSheet"
  | "media"
  | "edit"
  | "masters"
  | "files"
  | "costs";

export type DemoProjectDestination = {
  href: string;
  label: string;
  external?: boolean;
};

export type DemoProject = {
  id: string;
  name: string;
  navigationLabel: string;
  customerName: string;
  customerSlug: string;
  destinations: Record<DemoProjectExperience, DemoProjectDestination>;
};

export const demoProjects: readonly DemoProject[] = [
  {
    id: "loom-launch-film",
    name: "Launch Film - Sales Narrative",
    navigationLabel: "Launch Film",
    customerName: "Loom",
    customerSlug: "loom",
    destinations: {
      overview: {
        href: "/projects/loom-launch-film",
        label: "Overview",
      },
      brief: {
        href: "/projects/loom-launch-film/stages/brief",
        label: "Brief",
      },
      script: {
        href: "/projects/loom-launch-film/script",
        label: "Script",
      },
      transcripts: {
        href: "/projects/loom-launch-film/script?subtab=transcripts",
        label: "Transcripts",
      },
      shoot: {
        href: "/projects/loom-launch-film/stages/shoot",
        label: "Shoot",
      },
      callSheet: {
        href: "/share/call-sheet/loom-launch-film?preview=1",
        label: "Shared call sheet",
        external: true,
      },
      media: {
        href: "/projects/loom-launch-film/stages/media",
        label: "Media",
      },
      edit: {
        href: "/projects/loom-launch-film/stages/edit",
        label: "Edit",
      },
      masters: {
        href: "/projects/loom-launch-film/stages/masters",
        label: "Masters",
      },
      files: {
        href: "/projects/loom-launch-film/files",
        label: "Files",
      },
      costs: {
        href: "/projects/loom-launch-film/costs",
        label: "Costs",
      },
    },
  },
] as const;

export const primaryDemoProject = demoProjects[0];

export function getDemoProject(projectId: string) {
  return demoProjects.find((project) => project.id === projectId) ?? null;
}

export function isDemoProject(projectId: string) {
  return getDemoProject(projectId) !== null;
}

export function getDemoProjectDestination(
  projectId: string,
  experience: DemoProjectExperience,
) {
  return getDemoProject(projectId)?.destinations[experience] ?? null;
}
