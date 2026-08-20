"use client";

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import type { RoleSlot } from "@/components/active-videos/types";
import { activeVideoProjects } from "@/data/active-videos/mockData";

type ProjectTeamDataContextValue = {
  teamsByProjectId: Record<string, RoleSlot[]>;
  setProjectTeam: (projectId: string, update: RoleSlot[] | ((currentTeam: RoleSlot[]) => RoleSlot[])) => void;
};

const ProjectTeamDataContext = createContext<ProjectTeamDataContextValue | null>(null);

export function ProjectTeamDataProvider({ children }: { children: ReactNode }) {
  const [teamsByProjectId, setTeamsByProjectId] = useState<Record<string, RoleSlot[]>>(() => Object.fromEntries(
    activeVideoProjects.map((project) => [project.id, project.team]),
  ));

  const setProjectTeam = useCallback((projectId: string, update: RoleSlot[] | ((currentTeam: RoleSlot[]) => RoleSlot[])) => {
    setTeamsByProjectId((current) => {
      const currentTeam = current[projectId] ?? [];
      const nextTeam = typeof update === "function" ? update(currentTeam) : update;
      return { ...current, [projectId]: nextTeam };
    });
  }, []);

  const value = useMemo<ProjectTeamDataContextValue>(() => ({ teamsByProjectId, setProjectTeam }), [setProjectTeam, teamsByProjectId]);

  return <ProjectTeamDataContext.Provider value={value}>{children}</ProjectTeamDataContext.Provider>;
}

export function useProjectTeams() {
  const context = useContext(ProjectTeamDataContext);
  if (!context) throw new Error("useProjectTeams must be used within ProjectTeamDataProvider");
  return context;
}
