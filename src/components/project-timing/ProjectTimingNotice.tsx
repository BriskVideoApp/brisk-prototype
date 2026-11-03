"use client";

import { useProjectCompletion } from "@/components/project/ProjectCompletionContext";
import { useProjectTiming } from "./ProjectTimingContext";
import { formatTimingDate } from "@/data/project-timing";
import { usePrototypeState } from "@/components/prototype-state/PrototypeStateContext";
import { getPendingDeliveryProposal } from "@/data/project-delivery";
import { ProjectDeadlineLink } from "./DeadlineDialogContext";

export function BriefTimingSuggestion({ projectId, requestedDate }: { projectId: string; requestedDate: string }) {
  const { getBriefAssessment, issues } = useProjectTiming();
  const assessment = getBriefAssessment(projectId, requestedDate);
  const alreadySubmitted = issues.some((issue) => issue.kind === "brief" && issue.projectId === projectId
    && !issue.resolvedAt && issue.requestedDate === requestedDate && issue.suggestedDate === assessment?.suggestedDate);
  if (!assessment || alreadySubmitted) return null;
  return <p className="brief-timing-suggestion label-s" role="status">
    <span>Suggested delivery: <strong>{formatTimingDate(assessment.suggestedDate)}</strong>. Your selected date stays unchanged.</span>
  </p>;
}

export function ProjectTimingWarning({ projectId, label = "Timing needs review" }: { projectId: string; label?: string }) {
  const { issues, getDeliveryAgreement } = useProjectTiming();
  const { state } = usePrototypeState();
  const { completionRecords } = useProjectCompletion();
  const project = state.projects.find((entry) => entry.id === projectId);
  const pending = project ? getPendingDeliveryProposal(getDeliveryAgreement(project)) : null;
  const issue = issues.filter((entry) => entry.projectId === projectId && !entry.resolvedAt)
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt))[0];
  if ((!issue && !pending) || project?.status === "Completed" || project?.status === "Archived" || completionRecords[projectId]) return null;
  return <ProjectDeadlineLink className="project-timing-warning label-xs-semibold" projectId={projectId}
    ariaLabel={`${label}. Open deadline.`}>
    <span>{label}</span>
  </ProjectDeadlineLink>;
}
