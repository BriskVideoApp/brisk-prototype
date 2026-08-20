"use client";

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import type { Project, StageKey, StageStatus } from "@/components/active-videos/types";
import { useProjectCompletion } from "@/components/project/ProjectCompletionContext";

const editPrerequisiteKeys = ["brief", "script", "shoot", "media"] as const;

type EditPrerequisiteKey = (typeof editPrerequisiteKeys)[number];

export type EditReadinessItem = {
  key: EditPrerequisiteKey;
  label: string;
  status: StageStatus;
  approved: boolean;
};

type ProjectStageOverrides = Record<string, Partial<Record<StageKey, StageStatus>>>;

type ProjectStageStatusContextValue = {
  getEditReadiness: (project: Project) => { ready: boolean; items: EditReadinessItem[] };
  getProjectStages: (project: Project) => Record<StageKey, StageStatus>;
  markReadyToEdit: (project: Project) => void;
  setProjectStageStatus: (projectId: string, stage: StageKey, status: StageStatus) => void;
};

const prerequisiteLabels: Record<EditPrerequisiteKey, string> = {
  brief: "Brief",
  script: "Script",
  shoot: "Shoot",
  media: "Media",
};

const ProjectStageStatusContext = createContext<ProjectStageStatusContextValue | null>(null);

export function ProjectStageStatusProvider({ children }: { children: ReactNode }) {
  const { completionRecords, undoProjectCompletion } = useProjectCompletion();
  const [overrides, setOverrides] = useState<ProjectStageOverrides>({});

  const getProjectStages = useCallback(
    (project: Project) => {
      const projectOverrides = overrides[project.id] ?? {};
      const stages = Object.fromEntries(
        (Object.keys(project.stages) as StageKey[]).map((key) => [key, projectOverrides[key] ?? project.stages[key]]),
      ) as Record<StageKey, StageStatus>;

      const prerequisitesApproved = editPrerequisiteKeys.every((key) => stages[key].state === "done");
      if (prerequisitesApproved && stages.edit.state === "not_started") {
        stages.edit = { ...stages.edit, state: "in_progress" };
      }

      return stages;
    },
    [overrides],
  );

  const getEditReadiness = useCallback(
    (project: Project) => {
      const stages = getProjectStages(project);
      const items = editPrerequisiteKeys.map((key) => ({
        key,
        label: prerequisiteLabels[key],
        status: stages[key],
        approved: stages[key].state === "done",
      }));

      return {
        ready: items.every((item) => item.approved),
        items,
      };
    },
    [getProjectStages],
  );

  const markReadyToEdit = useCallback((project: Project) => {
    setOverrides((current) => ({
      ...current,
      [project.id]: {
        ...current[project.id],
        brief: { state: "done", daysAgo: 0 },
        script: { state: "done", daysAgo: 0 },
        shoot: { state: "done", daysAgo: 0 },
        media: { state: "done", daysAgo: 0 },
        edit: { state: "in_progress", daysAgo: 0 },
      },
    }));
  }, []);

  const setProjectStageStatus = useCallback((projectId: string, stage: StageKey, status: StageStatus) => {
    if (status.state !== "done" && completionRecords[projectId]) {
      undoProjectCompletion(projectId);
    }

    setOverrides((current) => ({
      ...current,
      [projectId]: {
        ...current[projectId],
        [stage]: status,
      },
    }));
  }, [completionRecords, undoProjectCompletion]);

  const value = useMemo(
    () => ({ getEditReadiness, getProjectStages, markReadyToEdit, setProjectStageStatus }),
    [getEditReadiness, getProjectStages, markReadyToEdit, setProjectStageStatus],
  );

  return <ProjectStageStatusContext.Provider value={value}>{children}</ProjectStageStatusContext.Provider>;
}

export function useProjectStageStatus() {
  const context = useContext(ProjectStageStatusContext);

  if (!context) {
    throw new Error("useProjectStageStatus must be used within ProjectStageStatusProvider");
  }

  return context;
}
