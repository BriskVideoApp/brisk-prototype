"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { RoleSlot } from "@/components/active-videos/types";
import { usePrototypeState } from "@/components/prototype-state/PrototypeStateContext";
import { activeVideoProjects } from "@/data/active-videos/mockData";

type ProjectTeamDataContextValue = {
  teamsByProjectId: Record<string, RoleSlot[]>;
  setProjectTeam: (projectId: string, update: RoleSlot[] | ((currentTeam: RoleSlot[]) => RoleSlot[])) => void;
};

const ProjectTeamDataContext = createContext<ProjectTeamDataContextValue | null>(null);

export function ProjectTeamDataProvider({ children }: { children: ReactNode }) {
  const { state, hasHydrated, updateProjectTeam } = usePrototypeState();
  const [teamsByProjectId, setTeamsByProjectId] = useState<Record<string, RoleSlot[]>>(() => Object.fromEntries(
    activeVideoProjects.map((project) => [project.id, project.team]),
  ));

  useEffect(() => {
    if (!hasHydrated) return;
    setTeamsByProjectId((current) => {
      const next = { ...current };
      for (const project of state.projects) {
        if (Object.hasOwn(current, project.id) || project.team.length > 0) next[project.id] = project.team;
      }
      return next;
    });
  }, [hasHydrated, state.projects]);

  const setProjectTeam = useCallback((projectId: string, update: RoleSlot[] | ((currentTeam: RoleSlot[]) => RoleSlot[])) => {
    const currentTeam = teamsByProjectId[projectId] ?? state.projects.find((project) => project.id === projectId)?.team ?? [];
    const nextTeam = typeof update === "function" ? update(currentTeam) : update;
    setTeamsByProjectId((current) => ({ ...current, [projectId]: nextTeam }));
    updateProjectTeam(projectId, nextTeam);
  }, [state.projects, teamsByProjectId, updateProjectTeam]);

  const value = useMemo<ProjectTeamDataContextValue>(() => ({ teamsByProjectId, setProjectTeam }), [setProjectTeam, teamsByProjectId]);

  return <ProjectTeamDataContext.Provider value={value}>{children}</ProjectTeamDataContext.Provider>;
}

export function useProjectTeams() {
  const context = useContext(ProjectTeamDataContext);
  if (!context) throw new Error("useProjectTeams must be used within ProjectTeamDataProvider");
  return context;
}
