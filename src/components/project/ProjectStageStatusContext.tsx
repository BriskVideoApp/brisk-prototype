"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { Project, StageKey, StageStatus } from "@/components/active-videos/types";
import { useProjectCompletion } from "@/components/project/ProjectCompletionContext";
import { useProjectFlow } from "@/components/project/ProjectFlowContext";
import { usePrototypeScenario } from "@/components/prototype-scenarios/PrototypeScenarioContext";
import { usePrototypeState } from "@/components/prototype-state/PrototypeStateContext";
import { useStoryboard } from "@/components/storyboard/StoryboardContext";
import type { ProductionFlowStageKey } from "@/data/production-flow";

const projectStageSequence: StageKey[] = ["brief", "script", "shoot", "media", "edit", "masters"];
const projectStageStatusStorageKey = "brisk-project-stage-status-v1";

type ProjectStageSource = Pick<Project, "id" | "stages">;
type EditReadinessSource = Pick<Project, "id" | "stages" | "videoType">;
type EditPrerequisiteKey = Exclude<ProductionFlowStageKey, "edit" | "masters"> | "media";

export type EditReadinessItem = {
  key: EditPrerequisiteKey;
  label: string;
  status: StageStatus;
  approved: boolean;
};

type ProjectStageOverrides = Record<string, Partial<Record<StageKey, StageStatus>>>;

type ProjectStageStatusContextValue = {
  getEditReadiness: (project: EditReadinessSource) => { ready: boolean; items: EditReadinessItem[] };
  getProjectStages: (project: ProjectStageSource) => Record<StageKey, StageStatus>;
  markReadyToEdit: (project: ProjectStageSource) => void;
  setProjectStageStatus: (projectId: string, stage: StageKey, status: StageStatus) => void;
};

const prerequisiteLabels: Record<EditPrerequisiteKey, string> = {
  brief: "Brief",
  script: "Script",
  shoot: "Shoot",
  storyboard: "Storyboard",
  media: "Media",
};

const ProjectStageStatusContext = createContext<ProjectStageStatusContextValue | null>(null);

export function ProjectStageStatusProvider({ children }: { children: ReactNode }) {
  const { completionRecords, undoProjectCompletion } = useProjectCompletion();
  const { getProjectFlow } = useProjectFlow();
  const { getStoryboardStatus } = useStoryboard();
  const { activeScenario, hasLoadedScenario } = usePrototypeScenario();
  const { hasHydrated: hasHydratedPrototypeState, state } = usePrototypeState();
  const [overrides, setOverrides] = useState<ProjectStageOverrides>({});
  const stageStatusScopeKey = `${state.session.activeWorkspaceId}:${activeScenario?.id ?? "default"}`;

  useEffect(() => {
    if (!hasLoadedScenario || !hasHydratedPrototypeState) return;
    setOverrides(readProjectStageOverrides(stageStatusScopeKey));
  }, [hasHydratedPrototypeState, hasLoadedScenario, stageStatusScopeKey]);

  const commitOverrides = useCallback((update: (current: ProjectStageOverrides) => ProjectStageOverrides) => {
    setOverrides((current) => {
      const next = update(current);
      writeProjectStageOverrides(stageStatusScopeKey, next);
      return next;
    });
  }, [stageStatusScopeKey]);

  const getProjectStages = useCallback(
    (project: ProjectStageSource) => {
      const projectOverrides = overrides[project.id] ?? {};
      const stages = Object.fromEntries(
        (Object.keys(project.stages) as StageKey[]).map((key) => [key, projectOverrides[key] ?? project.stages[key]]),
      ) as Record<StageKey, StageStatus>;

      for (let index = 1; index < projectStageSequence.length; index += 1) {
        const stage = projectStageSequence[index];
        const allPreviousStagesApproved = projectStageSequence
          .slice(0, index)
          .every((previousStage) => stages[previousStage].state === "done");

        if (allPreviousStagesApproved && stages[stage].state === "not_started") {
          stages[stage] = { ...stages[stage], state: "in_progress", daysAgo: 0 };
        }
      }

      return stages;
    },
    [overrides],
  );

  const getEditReadiness = useCallback(
    (project: EditReadinessSource) => {
      const stages = getProjectStages(project);
      const flow = getProjectFlow(project);
      const editIndex = flow.stages.indexOf("edit");
      const flowPrerequisites = flow.stages.slice(0, editIndex < 0 ? flow.stages.length : editIndex);
      const prerequisiteKeys: EditPrerequisiteKey[] = [
        ...flowPrerequisites.filter((key): key is Exclude<ProductionFlowStageKey, "edit" | "masters"> => (
          key !== "edit" && key !== "masters"
        )),
        "media",
      ];
      const items = prerequisiteKeys.map((key) => ({
        key,
        label: prerequisiteLabels[key],
        status: key === "storyboard" ? getStoryboardStatus(project.id) : stages[key],
        approved: (key === "storyboard" ? getStoryboardStatus(project.id) : stages[key]).state === "done",
      }));

      return {
        ready: items.every((item) => item.approved),
        items,
      };
    },
    [getProjectFlow, getProjectStages, getStoryboardStatus],
  );

  const markReadyToEdit = useCallback((project: ProjectStageSource) => {
    commitOverrides((current) => ({
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
  }, [commitOverrides]);

  const setProjectStageStatus = useCallback((projectId: string, stage: StageKey, status: StageStatus) => {
    if (status.state !== "done" && completionRecords[projectId]) {
      undoProjectCompletion(projectId);
    }

    commitOverrides((current) => ({
      ...current,
      [projectId]: {
        ...current[projectId],
        [stage]: status,
      },
    }));
  }, [commitOverrides, completionRecords, undoProjectCompletion]);

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

function readProjectStageOverrides(scopeKey: string): ProjectStageOverrides {
  try {
    const stored = window.localStorage.getItem(projectStageStatusStorageKey);
    if (!stored) return {};
    const scopes = JSON.parse(stored) as Record<string, ProjectStageOverrides>;
    return scopes[scopeKey] ?? {};
  } catch {
    return {};
  }
}

function writeProjectStageOverrides(scopeKey: string, overrides: ProjectStageOverrides) {
  try {
    const stored = window.localStorage.getItem(projectStageStatusStorageKey);
    const scopes = stored ? JSON.parse(stored) as Record<string, ProjectStageOverrides> : {};
    window.localStorage.setItem(projectStageStatusStorageKey, JSON.stringify({
      ...scopes,
      [scopeKey]: overrides,
    }));
  } catch {
    // Prototype-only persistence can fall back to the current session when storage is unavailable.
  }
}
