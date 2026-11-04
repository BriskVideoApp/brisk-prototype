"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";
import { Button } from "../../../Brisk DS/src/app/components/Button";
import { EditingDialog } from "../../../Brisk DS/src/app/components/EditingDialog";
import { BriskDatePicker } from "@/components/form/BriskDatePicker";
import { usePrototypeState } from "@/components/prototype-state/PrototypeStateContext";
import { usePrototypeViewer } from "@/components/prototype-state/usePrototypeViewer";
import { useProjectCompletion } from "@/components/project/ProjectCompletionContext";
import { canActOnProject, canViewProject } from "@/data/prototype-access";
import type { ProductionFlowStageKey } from "@/data/production-flow";
import { applyDeliveryAgreement, deliveryAgreementSide, deliveryDateParts, deliveryInstant, formatDeliveryDate, getPendingDeliveryProposal } from "@/data/project-delivery";
import { useProjectTiming } from "./ProjectTimingContext";
import { StageDeadlinePanel } from "./StageDeadlinePanel";
import { DeadlineChangeFields } from "./DeadlineChangeFields";

export function ProjectDeadlineDialog({ projectId, initialStage, initialDate, version, onClose }: {
  projectId: string; initialStage?: ProductionFlowStageKey; initialDate?: string; initialView?: "calendar" | "timing";
  version?: { id: string; name: string; date: string; onAgreedDateChange: (date: string) => void }; onClose: () => void;
}) {
  const { state, hasHydrated } = usePrototypeState();
  const viewer = usePrototypeViewer();
  const { completionRecords } = useProjectCompletion();
  const { getDeliveryAgreement, proposeDeliveryDate, agreeDeliveryDate, saveDeliveryDate,
    getVersionDeliveryAgreement, proposeVersionDeliveryDate, agreeVersionDeliveryDate, saveVersionDeliveryDate, hasHydrated: timingReady } = useProjectTiming();
  const formId = useId();
  const [isEditing, setIsEditing] = useState(Boolean(initialDate));
  const [mode, setMode] = useState<"change" | "propose">(viewer?.role === "Studio Staff" ? "change" : "propose");
  const [draft, setDraft] = useState<string | null>(null);
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  const [feedback, setFeedback] = useState("");
  const formRef = useRef<HTMLFormElement>(null);
  const calendarRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (isEditing) formRef.current?.querySelector<HTMLElement>('input:checked, [data-dialog-autofocus], button')?.focus();
    else (calendarRef.current?.querySelector<HTMLElement>('[aria-pressed="true"]') ?? calendarRef.current?.querySelector<HTMLElement>("button"))?.focus({ preventScroll: true });
  }, [hasHydrated, isEditing, timingReady]);
  const editBaseDate = useRef<string | null | undefined>(undefined);
  const project = state.projects.find((entry) => entry.id === projectId && entry.workspaceId === state.session.activeWorkspaceId);
  if (!hasHydrated || !timingReady) return null;
  if (!project || !canViewProject(viewer, project, state)) return <EditingDialog title="Deadline" onCancel={onClose}
    actions={<Button size="S" variant="secondary" onClick={onClose}>Close</Button>}><p className="paragraph-s">This project is unavailable.</p></EditingDialog>;
  if (initialStage) return <EditingDialog title="Stage timing" description={project.name} onCancel={onClose}
    actions={<Button size="S" variant="secondary" onClick={onClose}>Close</Button>}>
    <StageDeadlinePanel project={project} deadline={applyDeliveryAgreement(project.deadline, getDeliveryAgreement(project))} embedded initialStage={initialStage} />
  </EditingDialog>;
  const agreement = version ? getVersionDeliveryAgreement(project, version.id, version.name, version.date) : getDeliveryAgreement(project);
  const complete = project.status === "Completed" || project.status === "Archived" || Boolean(completionRecords[projectId]);
  const pending = complete ? null : getPendingDeliveryProposal(agreement);
  const staff = viewer?.role === "Studio Staff";
  const canManage = !complete && canActOnProject(viewer, project, state, "approve");
  const canPropose = canManage && (staff || Boolean(agreement.agreedDate));
  const canAgree = canManage && Boolean(pending && deliveryAgreementSide(pending) === viewer?.role);
  const editing = canPropose && isEditing;
  const action = staff ? mode : "propose";
  const initial = agreement.agreedDate;
  const initialParts = initial ? deliveryDateParts(initial) : { date: "", time: "17:00" };
  const value = draft ?? (initialDate || initialParts.date ? `${initialDate || initialParts.date}T${initialParts.time}` : "");
  const [date = "", time = ""] = value.split("T");
  const instant = deliveryInstant(date, time);
  const valid = Boolean(instant && (action === "change"
    ? instant !== agreement.agreedDate : instant !== agreement.agreedDate && (!pending || instant !== pending.date || reason.trim() !== pending.reason)));
  const waitingFor = pending && deliveryAgreementSide(pending) === "Studio Staff" ? "Studio" : "Client";
  const captureBaseDate = () => { if (editBaseDate.current === undefined) editBaseDate.current = agreement.agreedDate; };
  const editProposal = () => {
    if (!pending || !canPropose || canAgree) return;
    captureBaseDate(); setMode("propose"); setError(""); setFeedback("");
    const parts = deliveryDateParts(pending.date);
    setDraft(`${parts.date}T${parts.time}`); setReason(pending.reason); setIsEditing(true);
  };
  const cancelEditing = () => { if (initialDate) { onClose(); return; } setIsEditing(false); setDraft(null); setReason(""); setError(""); editBaseDate.current = undefined; };
  const agreeToProposal = () => {
    if (!pending || !canAgree) return;
    const saved = version ? agreeVersionDeliveryDate(projectId, version.id, pending.id) : agreeDeliveryDate(projectId, pending.id);
    if (saved) { version?.onAgreedDateChange(deliveryDateParts(pending.date).date); setFeedback("Delivery date agreed."); setDraft(null); setReason(""); }
    else setError("This proposal has changed. Review the latest date before agreeing.");
  };
  return <EditingDialog title={editing ? "Change deadline" : version?.name ?? "Final delivery"} size={editing ? "standard" : "compact"} description={project.name} onCancel={editing ? cancelEditing : onClose} actions={<>
    <Button size="S" variant="secondary" onClick={editing ? cancelEditing : onClose}>{editing ? "Cancel" : "Close"}</Button>
    {editing ? <Button size="S" type="submit" form={formId} disabled={!valid}>{action === "change" ? "Save deadline" : "Send proposal"}</Button>
      : canAgree ? <Button size="S" onClick={agreeToProposal}>Agree to date</Button> : null}
  </>}>
    <div className="final-delivery-body">
      {editing ? null : <>
        <div ref={calendarRef}><BriskDatePicker inline ariaLabel={version?.name ?? "Final delivery"} placeholder="Choose date" variant="field" value={initialParts.date} allowClear={false} disabled={!canPropose} onChange={(nextDate) => {
          if (!canPropose) return;
          if (!nextDate || nextDate === initialParts.date) return;
          captureBaseDate(); setDraft(`${nextDate}T${initialParts.time}`); setIsEditing(true);
        }} /></div>
        {pending ? <p className="final-delivery-note label-xs">Proposed {formatDeliveryDate(pending.date, false)} · Awaiting {waitingFor}</p> : null}
        {pending && !canAgree && canPropose ? <button type="button" className="timing-review-deadline-link label-xs-semibold" onClick={editProposal}>Edit proposal</button> : null}
        {complete ? <p className="final-delivery-note label-xs">{project.status === "Archived" ? "Archived" : "Delivered"}</p> : null}
      </>}
      {editing ? <form ref={formRef} id={formId} className="delivery-proposal-form" onSubmit={(event) => {
        event.preventDefault(); if (!valid || !instant) return;
        const expectedDate = editBaseDate.current === undefined ? agreement.agreedDate : editBaseDate.current;
        const saved = version
          ? action === "change"
            ? saveVersionDeliveryDate(projectId, version.id, version.name, version.date, instant, reason, expectedDate)
            : proposeVersionDeliveryDate(projectId, version.id, version.name, version.date, instant, reason)
          : action === "change" ? saveDeliveryDate(projectId, instant, reason, expectedDate) : proposeDeliveryDate(projectId, instant, reason);
        if (!saved) { setError("The deadline has changed. Review it before saving again."); return; }
        if (version && action === "change") version.onAgreedDateChange(date);
        onClose();
      }}>
        <DeadlineChangeFields action={action} currentDate={agreement.agreedDate ? formatDeliveryDate(agreement.agreedDate, false) : "TBC"}
          formId={formId} hasPending={Boolean(pending)} showMessage={action === "propose" || Boolean(agreement.agreedDate)} staff={staff} recipient={staff ? "Client" : "Studio"} value={value}
          message={reason} onActionChange={(next) => { setMode(next); if (next === "change") setReason(""); }}
          onDateChange={(next) => { captureBaseDate(); setDraft(next); }}
          onMessageChange={(next) => { captureBaseDate(); setReason(next); }} />
      </form> : !complete && !agreement.agreedDate && viewer?.role === "Customer" && !pending ? <p className="label-s">Set the first deadline in the <Link className="timing-review-deadline-link" href={`/projects/${projectId}/stages/brief`} onClick={onClose}>Brief</Link>.</p> : null}
      {error ? <p className="delivery-proposal-error label-s" role="alert">{error}</p> : null}
      <p className="final-delivery-feedback label-s" role="status">{feedback}</p>
    </div>
  </EditingDialog>;
}
