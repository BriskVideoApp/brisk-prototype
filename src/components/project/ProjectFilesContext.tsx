"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { ProjectFileLocation } from "@/components/active-videos/types";
import { activeVideoProjects } from "@/data/active-videos/mockData";

type ProjectFilesContextValue = {
  fileLocationsByProjectId: Record<string, ProjectFileLocation[]>;
  addFileLocation: (projectId: string, location: ProjectFileLocation) => void;
  updateFileLocation: (projectId: string, index: number, location: ProjectFileLocation) => void;
  removeFileLocation: (projectId: string, index: number) => void;
};

const projectFilesStorageKey = "brisk-project-file-locations-v1";
const initialFileLocationsByProjectId = Object.fromEntries(
  activeVideoProjects.map((project) => [project.id, project.file_locations]),
) as Record<string, ProjectFileLocation[]>;
const ProjectFilesContext = createContext<ProjectFilesContextValue | null>(null);

export function ProjectFilesProvider({ children }: { children: React.ReactNode }) {
  const [fileLocationsByProjectId, setFileLocationsByProjectId] = useState(initialFileLocationsByProjectId);

  useEffect(() => {
    const storedLocations = window.localStorage.getItem(projectFilesStorageKey);
    if (!storedLocations) return;

    try {
      const parsedLocations = JSON.parse(storedLocations) as Record<string, ProjectFileLocation[]>;
      setFileLocationsByProjectId({ ...initialFileLocationsByProjectId, ...parsedLocations });
    } catch {
      window.localStorage.removeItem(projectFilesStorageKey);
    }
  }, []);

  const updateLocations = (
    updater: (current: Record<string, ProjectFileLocation[]>) => Record<string, ProjectFileLocation[]>,
  ) => {
    setFileLocationsByProjectId((current) => {
      const next = updater(current);
      window.localStorage.setItem(projectFilesStorageKey, JSON.stringify(next));
      return next;
    });
  };

  const value = useMemo<ProjectFilesContextValue>(() => ({
    fileLocationsByProjectId,
    addFileLocation: (projectId, location) => updateLocations((current) => ({
      ...current,
      [projectId]: [...(current[projectId] ?? []), location],
    })),
    updateFileLocation: (projectId, index, location) => updateLocations((current) => ({
      ...current,
      [projectId]: (current[projectId] ?? []).map((currentLocation, currentIndex) =>
        currentIndex === index ? location : currentLocation,
      ),
    })),
    removeFileLocation: (projectId, index) => updateLocations((current) => ({
      ...current,
      [projectId]: (current[projectId] ?? []).filter((_, currentIndex) => currentIndex !== index),
    })),
  }), [fileLocationsByProjectId]);

  return <ProjectFilesContext.Provider value={value}>{children}</ProjectFilesContext.Provider>;
}

export function useProjectFiles() {
  const context = useContext(ProjectFilesContext);
  if (!context) throw new Error("useProjectFiles must be used within ProjectFilesProvider");
  return context;
}
