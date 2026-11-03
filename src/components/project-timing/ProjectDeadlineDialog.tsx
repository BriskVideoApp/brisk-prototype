"use client";

import Link from "next/link";
import { useId, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "../../../Brisk DS/src/app/components/Button";
import { Radio } from "../../../Brisk DS/src/app/components/Radio";
import { Textarea } from "../../../Brisk DS/src/app/components/Textarea";
import { EditingDialog } from "../../../Brisk DS/src/app/components/EditingDialog";
import { usePrototypeState } from "@/components/prototype-state/PrototypeStateContext";
import { usePrototypeViewer } from "@/components/prototype-state/usePrototypeViewer";
import { useProjectCompletion } from "@/components/project/ProjectCompletionContext";
import { canActOnProject, canViewProject } from "@/data/prototype-access";
import type { ProductionFlowStageKey } from "@/data/production-flow";
import { applyDeliveryAgreement, deliveryAgreementSide, deliveryChatHref, deliveryDateParts, deliveryInstant, formatDeliveryDate, getPendingDeliveryProposal } from "@/data/project-delivery";
import { formatTimingDate } from "@/data/project-timing";
import { useProjectTiming } from "./ProjectTimingContext";
import { useTurnaround } from "./TurnaroundContext";
import { DeadlineDateTimePicker, StageDeadlinePanel } from "./StageDeadlinePanel";
import { TimingDisclosure } from "./TimingDisclosure";

export function ProjectDeadlineDialog({ projectId, initialStage, initialDate, onClose }: {
  projectId: string; initialStage?: ProductionFlowStageKey; initialDate?: string; onClose: () => void;
}) {
  const { state, hasHydrated } = usePrototypeState();
  const viewer = usePrototypeViewer();
  const { completionRecords } = useProjectCompletion();
  const { getDeliveryAgreement, issues, proposeDeliveryDate, agreeDeliveryDate, saveDeliveryDate, shareClientUpdate, hasHydrated: timingReady } = useProjectTiming();
  const timing = useTurnaround();
  const router = useRouter();
  const formId = useId();
  const [isEditing, setIsEditing] = useState(Boolean(initialDate));
  const [mode, setMode] = useState<"change" | "propose">(viewer?.role === "Studio Staff" ? "change" : "propose");
  const [draft, setDraft] = useState<string | null>(initialDate ? `${initialDate}T17:00` : null);
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  const [feedback, setFeedback] = useState("");
  const [clientCopy, setClientCopy] = useState<string | null>(null);
  const editBaseDate = useRef<string | null | undefined>(undefined);
  const [stageSaved, setStageSaved] = useState(false);
  const project = state.projects.find((entry) => entry.id === projectId && entry.workspaceId === state.session.activeWorkspaceId);
  if (!hasHydrated || !timingReady) return null;
  if (!project || !canViewProject(viewer, project, state)) return <EditingDialog title="Deadline" onCancel={onClose}
    actions={<Button size="S" variant="secondary" onClick={onClose}>Close</Button>}><p className="paragraph-s">This project is unavailable.</p></EditingDialog>;
  const agreement = getDeliveryAgreement(project);
  const complete = project.status === "Completed" || project.status === "Archived" || Boolean(completionRecords[projectId]);
  const pending = complete ? null : getPendingDeliveryProposal(agreement);
  const issue = complete ? null : issues.filter((entry) => entry.projectId === projectId && !entry.resolvedAt).sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
  const staff = viewer?.role === "Studio Staff";
  const canManage = !complete && canActOnProject(viewer, project, state, "approve");
  const canPropose = canManage && (staff || Boolean(agreement.agreedDate));
  const canAgree = canManage && Boolean(pending && deliveryAgreementSide(pending) === viewer?.role);
  const editing = canPropose && (isEditing || !pending);
  const action = staff ? mode : "propose";
  const initial = pending?.date ?? agreement.agreedDate;
  const initialParts = initial ? deliveryDateParts(initial) : { date: issue?.suggestedDate ?? "", time: "17:00" };
  const value = draft ?? (initialParts.date ? `${initialParts.date}T${initialParts.time}` : "");
  const [date = "", time = ""] = value.split("T");
  const instant = deliveryInstant(date, time);
  const needsReason = action === "propose" || Boolean(agreement.agreedDate);
  const valid = Boolean(instant && (!needsReason || reason.trim()) && (action === "change"
    ? instant !== agreement.agreedDate : instant !== agreement.agreedDate && (!pending || instant !== pending.date || reason.trim() !== pending.reason)));
  const waitingFor = pending && deliveryAgreementSide(pending) === "Studio Staff" ? "Studio" : "Client";
  const update = issue?.clientUpdate?.reason ?? (issue?.kind === "brief" ? issue.reason : staff ? issue?.internalReason : null);
  const captureBaseDate = () => { if (editBaseDate.current === undefined) editBaseDate.current = agreement.agreedDate; };
  const startEditing = (next: "change" | "propose") => { captureBaseDate(); setMode(next); setIsEditing(true); setReason(pending?.reason ?? ""); setError(""); setFeedback(""); };
  const changes = agreement.changes ?? [];
  return <EditingDialog title="Deadline" description={project.name} onCancel={onClose} actions={<>
    <Button size="S" variant="secondary" onClick={onClose}>{editing && !stageSaved ? "Cancel" : "Close"}</Button>
    {editing ? <Button size="S" type="submit" form={formId} disabled={!valid}>{action === "change" ? "Save deadline" : "Send proposal"}</Button>
      : canAgree && pending ? <Button size="S" onClick={() => {
        if (agreeDeliveryDate(projectId, pending.id)) { setFeedback("Delivery date agreed."); setDraft(null); setReason(""); }
        else setError("This proposal has changed. Review the latest date before agreeing.");
      }}>Agree date</Button> : null}
  </>}>
    <div className="final-delivery-body">
      <div className="final-delivery-dates">
        <div className="final-delivery-date-row"><h2 className="label-m-semibold">Final delivery</h2><span aria-hidden="true">·</span>
          <strong className="label-m-semibold">{agreement.agreedDate ? formatDeliveryDate(agreement.agreedDate, false) : "TBC"}</strong></div>
        {pending ? <><p className="label-s">Proposed · <strong>{formatDeliveryDate(pending.date, false)}</strong></p>
          <p className="final-delivery-note label-s">{canAgree ? "Waiting for your agreement" : `Waiting for ${waitingFor} agreement`}</p></> : null}
        {issue ? <p className="label-s">Suggested · <strong>{formatTimingDate(issue.suggestedDate)}</strong></p> : null}
        {complete ? <p className="final-delivery-note label-s">{project.status === "Archived" ? "Archived" : "Delivered"}</p> : null}
        {!complete && agreement.agreedDate && Date.parse(agreement.agreedDate) < timing.now ? <p className="deadline-text-overdue label-s-semibold">Overdue</p> : null}
      </div>
      {editing ? <form id={formId} className="delivery-proposal-form" onSubmit={(event) => {
        event.preventDefault(); if (!valid || !instant) return;
        const expectedDate = editBaseDate.current === undefined ? agreement.agreedDate : editBaseDate.current;
        const saved = action === "change" ? saveDeliveryDate(projectId, instant, reason, expectedDate) : proposeDeliveryDate(projectId, instant, reason);
        if (!saved) { setError("The deadline has changed. Review it before saving again."); return; }
        onClose();
      }}>
        {staff ? <div className="turnaround-mode" role="group" aria-label="Final delivery action">
          <Radio name={`${formId}-action`} label="Change date" checked={mode === "change"} onChange={() => setMode("change")} />
          <Radio name={`${formId}-action`} label="Propose change" checked={mode === "propose"} onChange={() => setMode("propose")} />
        </div> : <p className="label-s">Propose a change for the Studio to agree.</p>}
        <DeadlineDateTimePicker ariaLabel="Final delivery date" value={value} onChange={(next) => { captureBaseDate(); setDraft(next); }} />
        <p className="final-delivery-note label-xs">Sydney time. {action === "change" ? "Saved changes take effect immediately and appear in project Chat." : `The current date stays until the ${staff ? "Client" : "Studio"} agrees.`}</p>
        {needsReason ? <Textarea label="Reason" rows={2} required value={reason} onChange={(event) => { captureBaseDate(); setReason(event.target.value); }} /> : null}
      </form> : !complete && !agreement.agreedDate && viewer?.role === "Customer" && !pending ? <p className="label-s">Set the first deadline in the <Link className="timing-review-deadline-link" href={`/projects/${projectId}/stages/brief`} onClick={onClose}>Brief</Link>.</p> : null}
      <div className="final-delivery-actions">
        {!editing && staff && canManage ? <Button size="S" variant="secondary" onClick={() => startEditing("change")}>Change date</Button> : null}
        {!editing && canPropose ? <Button size="S" variant="ghost" onClick={() => startEditing("propose")}>{pending && !canAgree ? "Change proposal" : "Propose another date"}</Button> : null}
        <Button size="S" variant="ghost" onClick={() => { onClose(); router.push(deliveryChatHref(projectId, pending?.id)); }}>Discuss date</Button>
      </div>
      {error ? <p className="delivery-proposal-error label-s" role="alert">{error}</p> : null}
      <p className="final-delivery-feedback label-s" role="status">{feedback}</p>
      {timing.getActiveDeadlines(project).length ? <TimingDisclosure label="Stage timing" initiallyOpen={Boolean(initialStage)}>
        <StageDeadlinePanel project={project} deadline={applyDeliveryAgreement(project.deadline, agreement)} embedded initialStage={initialStage}
          onSaved={() => { setStageSaved(true); setFeedback("Stage deadline saved."); }} />
      </TimingDisclosure> : null}
      {update || agreement.agreedDate || pending ? <TimingDisclosure label="Timing details">
        {agreement.agreedDate ? <p className="label-s">Final delivery: {formatDeliveryDate(agreement.agreedDate)} (Sydney time)</p> : null}
        {pending ? <p className="label-s">Proposed: {formatDeliveryDate(pending.date)} (Sydney time). {pending.reason}</p> : null}
        {update ? <p className="paragraph-s">{update}</p> : null}
        {staff && issue?.kind === "production" && !issue.clientUpdate ? <>
          <Textarea label="Client update" rows={2} value={clientCopy ?? issue.reason}
            hint="Only this message and the suggested date will be shared with the Client."
            onChange={(event) => setClientCopy(event.target.value)} />
          <Button size="S" variant="secondary" disabled={!(clientCopy ?? issue.reason).trim()} onClick={() => {
            if (shareClientUpdate(issue.id, clientCopy ?? issue.reason)) setFeedback("Timing update shared.");
          }}>Share with Client</Button>
        </> : null}
      </TimingDisclosure> : null}
      {agreement.originalDate || agreement.proposals.length || changes.length ? <TimingDisclosure label="Delivery history" className="final-delivery-history">
        {agreement.originalDate ? <p className="label-s">Initial deadline: <strong>{formatDeliveryDate(agreement.originalDate)}</strong></p> : null}
        {changes.map((change) => <article key={change.id} className="label-s"><strong>{formatDeliveryDate(change.date)} · {change.source === "brief" ? "Set in Brief" : "Changed"}</strong>
          <p>{change.changedBy} · {formatDeliveryDate(change.changedAt)}{change.previousDate ? `. Previous deadline: ${formatDeliveryDate(change.previousDate)}` : ""}</p>{change.reason ? <p>{change.reason}</p> : null}</article>)}
        {agreement.proposals.map((proposal) => <article key={proposal.id} className="label-s"><strong>{formatDeliveryDate(proposal.date)} · {proposal.status === "agreed" ? "Agreed" : proposal.status === "superseded" ? "Superseded" : "Proposed"}</strong>
          <p>Proposed by {proposal.proposedBy} on {formatDeliveryDate(proposal.proposedAt)}.{proposal.agreedAt ? ` Agreed by ${proposal.agreedBy} on ${formatDeliveryDate(proposal.agreedAt)}.` : ""}</p><p>{proposal.reason}</p></article>)}
      </TimingDisclosure> : null}
    </div>
  </EditingDialog>;
}
