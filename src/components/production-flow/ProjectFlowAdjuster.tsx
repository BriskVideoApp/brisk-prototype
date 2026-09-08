"use client";

import type { ProjectVideoType } from "@/components/active-videos/types";
import { usePrototypeRole } from "@/components/navigation/PrototypeRoleContext";
import { ProductionFlowAdjuster } from "@/components/production-flow/ProductionFlowRail";
import { useProjectFlow } from "@/components/project/ProjectFlowContext";

type ProjectFlowAdjusterProps = {
  project: {
    id: string;
    videoType: ProjectVideoType;
  };
};

export function ProjectFlowAdjuster({ project }: ProjectFlowAdjusterProps) {
  const { selectedRole } = usePrototypeRole();
  const {
    addProjectStage,
    getProjectFlow,
    hideProjectStage,
    reorderProjectStage,
    resetProjectFlow,
    setProjectPostProductionTerm,
  } = useProjectFlow();

  if (selectedRole !== "Studio Staff") return null;

  const flow = getProjectFlow(project);

  return (
    <ProductionFlowAdjuster
      stages={flow.stages}
      postProductionTerm={flow.postProductionTerm}
      onAddStage={(stage) => addProjectStage(project, stage)}
      onHideStage={(stage) => hideProjectStage(project, stage)}
      onReorderStage={(stage, beforeStage) => reorderProjectStage(project, stage, beforeStage)}
      onPostProductionTermChange={(term) => setProjectPostProductionTerm(project, term)}
      onReset={() => resetProjectFlow(project)}
      triggerIconSize={14.4}
    />
  );
}
