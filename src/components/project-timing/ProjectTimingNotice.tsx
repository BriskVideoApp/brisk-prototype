"use client";

import Link from "next/link";
import { usePrototypeViewer } from "@/components/prototype-state/usePrototypeViewer";
import { useProjectTiming } from "./ProjectTimingContext";
import { formatTimingDate, timingChatHref } from "@/data/project-timing";
import { usePrototypeState } from "@/components/prototype-state/PrototypeStateContext";
import { deliveryChatHref, getPendingDeliveryProposal } from "@/data/project-delivery";

export function BriefTimingSuggestion({ projectId, requestedDate }: { projectId: string; requestedDate: string }) {
  const { getBriefAssessment, issues } = useProjectTiming();
  const assessment = getBriefAssessment(projectId, requestedDate);
  const alreadySubmitted = issues.some((issue) => issue.kind === "brief" && issue.projectId === projectId
    && issue.requestedDate === requestedDate && issue.suggestedDate === assessment?.suggestedDate);
  if (!assessment || alreadySubmitted) return null;
  return <p className="brief-timing-suggestion label-s" role="status">
    <span>Suggested delivery: <strong>{formatTimingDate(assessment.suggestedDate)}</strong>. We’ll confirm this with you.</span>
  </p>;
}

export function ProjectTimingWarning({ projectId }: { projectId: string }) {
  const { issues, getDeliveryAgreement } = useProjectTiming();
  const { state } = usePrototypeState();
  const viewer = usePrototypeViewer();
  const project = state.projects.find((entry) => entry.id === projectId);
  const pending = project ? getPendingDeliveryProposal(getDeliveryAgreement(project)) : null;
  const issue = issues.filter((entry) => entry.projectId === projectId && !entry.resolvedAt)
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt))[0];
  if (!issue && !pending) return null;
  const channel = issue?.kind === "brief" || viewer?.role === "Customer" ? "external" : "internal";
  const href = pending ? deliveryChatHref(projectId, pending.id) : timingChatHref(issue!, channel);
  return <Link className="project-timing-warning label-xs-semibold" href={href}
    aria-label="Timing needs review. Open the related project Chat message."
    onClick={(event) => event.stopPropagation()}>
    <span>Timing needs review</span>
  </Link>;
}
