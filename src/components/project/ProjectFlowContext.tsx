"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { ProjectVideoType } from "@/components/active-videos/types";
import { usePrototypeScenario } from "@/components/prototype-scenarios/PrototypeScenarioContext";
import { usePrototypeState } from "@/components/prototype-state/PrototypeStateContext";
import { selectProjectBrief } from "@/data/prototype-state";
import {
  getRecommendedProductionFlow,
  productionFlowTemplates,
  type ProductionBriefOverride,
  type ProductionFlowPostProductionTerm,
  type ProductionFlowStageKey,
} from "@/data/production-flow";

type ProjectFlowSource = {
  id: string;
  videoType: ProjectVideoType;
};

type HiddenStageLocation = {
  previousStage: ProductionFlowStageKey | null;
  nextStage: ProductionFlowStageKey | null;
};

export type ProjectFlowConfiguration = {
  stages: ProductionFlowStageKey[];
  postProductionTerm: ProductionFlowPostProductionTerm;
  hiddenStageLocations: Partial<Record<ProductionFlowStageKey, HiddenStageLocation>>;
};

type ProjectFlowOverrides = Record<string, ProjectFlowConfiguration>;

type ProjectFlowContextValue = {
  addProjectStage: (project: ProjectFlowSource, stage: ProductionFlowStageKey) => void;
  getProjectFlow: (project: ProjectFlowSource) => ProjectFlowConfiguration;
  hideProjectStage: (project: ProjectFlowSource, stage: ProductionFlowStageKey) => void;
  reorderProjectStage: (
    project: ProjectFlowSource,
    stage: ProductionFlowStageKey,
    beforeStage: ProductionFlowStageKey,
  ) => void;
  resetProjectFlow: (project: ProjectFlowSource) => void;
  setProjectPostProductionTerm: (
    project: ProjectFlowSource,
    term: ProductionFlowPostProductionTerm,
  ) => void;
};

const projectFlowStorageKey = "brisk-project-flow-v2";
const legacyProjectFlowStorageKey = "brisk-project-flow-v1";
const ProjectFlowContext = createContext<ProjectFlowContextValue | null>(null);

export function ProjectFlowProvider({ children }: { children: ReactNode }) {
  const { activeScenario, hasLoadedScenario } = usePrototypeScenario();
  const { hasHydrated, state } = usePrototypeState();
  const [overrides, setOverrides] = useState<ProjectFlowOverrides>({});
  const scopeKey = `${state.session.activeWorkspaceId}:${activeScenario?.id ?? "default"}`;

  useEffect(() => {
    if (!hasLoadedScenario || !hasHydrated) return;
    setOverrides(readProjectFlowOverrides(scopeKey));
  }, [hasHydrated, hasLoadedScenario, scopeKey]);

  const getRecommendedProjectFlow = useCallback((project: ProjectFlowSource) => {
    const brief = selectProjectBrief(state, project.id);
    return createDefaultProjectFlow(
      project.videoType,
      brief?.fields.videoType.value ?? "",
      brief?.fields.liveFootage.value ?? "",
    );
  }, [state]);

  const getProjectFlow = useCallback(
    (project: ProjectFlowSource) => overrides[project.id] ?? getRecommendedProjectFlow(project),
    [getRecommendedProjectFlow, overrides],
  );

  const commitProjectFlow = useCallback((project: ProjectFlowSource, update: (current: ProjectFlowConfiguration) => ProjectFlowConfiguration) => {
    setOverrides((currentOverrides) => {
      const nextOverrides = {
        ...currentOverrides,
        [project.id]: update(currentOverrides[project.id] ?? getRecommendedProjectFlow(project)),
      };
      writeProjectFlowOverrides(scopeKey, nextOverrides);
      return nextOverrides;
    });
  }, [getRecommendedProjectFlow, scopeKey]);

  const addProjectStage = useCallback((project: ProjectFlowSource, stage: ProductionFlowStageKey) => {
    commitProjectFlow(project, (current) => {
      if (current.stages.includes(stage)) return current;

      const hiddenLocation = current.hiddenStageLocations[stage];
      const stages = hiddenLocation
        ? restoreStage(current.stages, stage, hiddenLocation)
        : insertStage(current.stages, stage);
      const hiddenStageLocations = { ...current.hiddenStageLocations };
      delete hiddenStageLocations[stage];

      return { ...current, stages, hiddenStageLocations };
    });
  }, [commitProjectFlow]);

  const hideProjectStage = useCallback((project: ProjectFlowSource, stage: ProductionFlowStageKey) => {
    commitProjectFlow(project, (current) => {
      const stageIndex = current.stages.indexOf(stage);
      if (stageIndex < 0) return current;

      return {
        ...current,
        stages: current.stages.filter((candidate) => candidate !== stage),
        hiddenStageLocations: {
          ...current.hiddenStageLocations,
          [stage]: {
            previousStage: current.stages[stageIndex - 1] ?? null,
            nextStage: current.stages[stageIndex + 1] ?? null,
          },
        },
      };
    });
  }, [commitProjectFlow]);

  const reorderProjectStage = useCallback((
    project: ProjectFlowSource,
    stage: ProductionFlowStageKey,
    beforeStage: ProductionFlowStageKey,
  ) => {
    commitProjectFlow(project, (current) => {
      const withoutStage = current.stages.filter((candidate) => candidate !== stage);
      const targetIndex = withoutStage.indexOf(beforeStage);
      const stages = [...withoutStage];
      stages.splice(targetIndex < 0 ? stages.length : targetIndex, 0, stage);

      return getFlowValidationIssue(stages) ? current : { ...current, stages };
    });
  }, [commitProjectFlow]);

  const resetProjectFlow = useCallback((project: ProjectFlowSource) => {
    commitProjectFlow(project, () => getRecommendedProjectFlow(project));
  }, [commitProjectFlow, getRecommendedProjectFlow]);

  const setProjectPostProductionTerm = useCallback((
    project: ProjectFlowSource,
    postProductionTerm: ProductionFlowPostProductionTerm,
  ) => {
    commitProjectFlow(project, (current) => ({ ...current, postProductionTerm }));
  }, [commitProjectFlow]);

  const value = useMemo<ProjectFlowContextValue>(() => ({
    addProjectStage,
    getProjectFlow,
    hideProjectStage,
    reorderProjectStage,
    resetProjectFlow,
    setProjectPostProductionTerm,
  }), [
    addProjectStage,
    getProjectFlow,
    hideProjectStage,
    reorderProjectStage,
    resetProjectFlow,
    setProjectPostProductionTerm,
  ]);

  return <ProjectFlowContext.Provider value={value}>{children}</ProjectFlowContext.Provider>;
}

export function useProjectFlow() {
  const context = useContext(ProjectFlowContext);
  if (!context) throw new Error("useProjectFlow must be used within ProjectFlowProvider");
  return context;
}

function createDefaultProjectFlow(
  projectVideoType: ProjectVideoType,
  selectedVideoType: string,
  liveFootage: string,
): ProjectFlowConfiguration {
  const recommendedFromBrief = getRecommendedProductionFlow(
    selectedVideoType,
    getBriefProductionOverride(liveFootage),
  );
  const template = projectVideoType === "animation" || recommendedFromBrief.id === "animation"
    ? productionFlowTemplates.animation
    : getLiveActionTemplate(recommendedFromBrief);
  return {
    stages: [...template.stages],
    postProductionTerm: template.postProductionTerm,
    hiddenStageLocations: {},
  };
}

function getLiveActionTemplate(recommended: (typeof productionFlowTemplates)[keyof typeof productionFlowTemplates]) {
  return recommended.stages.includes("shoot") ? recommended : productionFlowTemplates.scripted;
}

function getBriefProductionOverride(liveFootage: string): ProductionBriefOverride {
  const normalised = liveFootage.toLowerCase();
  const hasInterviews = normalised.includes("interview");
  const hasScriptedScenes = normalised.includes("scripted");

  if (normalised.includes("animation")) return "animation";
  if (hasInterviews && hasScriptedScenes) return "mixed";
  if (hasInterviews) return "interview";
  if (hasScriptedScenes) return "scripted";
  return "video-type";
}

function insertStage(stages: ProductionFlowStageKey[], stage: ProductionFlowStageKey) {
  const nextStages = [...stages];
  let index = nextStages.length;

  if (stage === "brief") index = 0;
  else if (stage === "script") index = Math.min(1, nextStages.length);
  else if (stage === "shoot") index = getFirstIndex(nextStages, ["edit", "masters"]);
  else if (stage === "storyboard") {
    const scriptIndex = nextStages.indexOf("script");
    index = scriptIndex >= 0 ? scriptIndex + 1 : getFirstIndex(nextStages, ["edit", "masters"]);
  } else if (stage === "edit") {
    const mastersIndex = nextStages.indexOf("masters");
    index = mastersIndex >= 0 ? mastersIndex : nextStages.length;
  }

  nextStages.splice(Math.max(0, index), 0, stage);
  return nextStages;
}

function restoreStage(
  stages: ProductionFlowStageKey[],
  stage: ProductionFlowStageKey,
  location: HiddenStageLocation,
) {
  const nextStages = [...stages];
  const nextStageIndex = location.nextStage ? nextStages.indexOf(location.nextStage) : -1;
  if (nextStageIndex >= 0) {
    nextStages.splice(nextStageIndex, 0, stage);
    return nextStages;
  }

  const previousStageIndex = location.previousStage ? nextStages.indexOf(location.previousStage) : -1;
  if (previousStageIndex >= 0) {
    nextStages.splice(previousStageIndex + 1, 0, stage);
    return nextStages;
  }

  return insertStage(stages, stage);
}

function getFirstIndex(stages: ProductionFlowStageKey[], candidates: ProductionFlowStageKey[]) {
  const indices = candidates.map((candidate) => stages.indexOf(candidate)).filter((index) => index >= 0);
  return indices.length > 0 ? Math.min(...indices) : stages.length;
}

function getFlowValidationIssue(stages: ProductionFlowStageKey[]) {
  if (stages[0] !== "brief") return true;
  if (stages[stages.length - 1] !== "masters") return true;

  const scriptIndex = stages.indexOf("script");
  const storyboardIndex = stages.indexOf("storyboard");
  if (storyboardIndex >= 0 && (scriptIndex < 0 || storyboardIndex < scriptIndex)) return true;

  const editIndex = stages.indexOf("edit");
  const mastersIndex = stages.indexOf("masters");
  return editIndex < 0 || editIndex > mastersIndex;
}

function readProjectFlowOverrides(scopeKey: string): ProjectFlowOverrides {
  try {
    const stored = window.localStorage.getItem(projectFlowStorageKey);
    if (stored) {
      const scopes = JSON.parse(stored) as Record<string, ProjectFlowOverrides>;
      if (scopes[scopeKey]) return scopes[scopeKey];
    }

    const legacyStored = window.localStorage.getItem(legacyProjectFlowStorageKey);
    if (!legacyStored) return {};
    const legacyScopes = JSON.parse(legacyStored) as Record<string, ProjectFlowOverrides>;
    return Object.fromEntries(Object.entries(legacyScopes[scopeKey] ?? {}).map(([projectId, flow]) => [
      projectId,
      normaliseLegacyProjectFlow(flow),
    ]));
  } catch {
    return {};
  }
}

function normaliseLegacyProjectFlow(flow: ProjectFlowConfiguration): ProjectFlowConfiguration {
  const shootIndex = flow.stages.indexOf("shoot");
  const scriptIndex = flow.stages.indexOf("script");
  const template = shootIndex >= 0 && scriptIndex >= 0 && shootIndex < scriptIndex
    ? productionFlowTemplates.interview
    : flow.postProductionTerm === "animation" && shootIndex < 0
      ? productionFlowTemplates.animation
      : productionFlowTemplates.scripted;

  return {
    stages: [...template.stages],
    postProductionTerm: template.postProductionTerm,
    hiddenStageLocations: {},
  };
}

function writeProjectFlowOverrides(scopeKey: string, overrides: ProjectFlowOverrides) {
  try {
    const stored = window.localStorage.getItem(projectFlowStorageKey);
    const scopes = stored ? JSON.parse(stored) as Record<string, ProjectFlowOverrides> : {};
    window.localStorage.setItem(projectFlowStorageKey, JSON.stringify({
      ...scopes,
      [scopeKey]: overrides,
    }));
  } catch {
    // Prototype-only persistence can fall back to the current session when storage is unavailable.
  }
}
