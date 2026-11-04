"use client";

import { useState } from "react";
import { Button } from "../../../Brisk DS/src/app/components/Button";
import { Radio } from "../../../Brisk DS/src/app/components/Radio";
import { Textarea } from "../../../Brisk DS/src/app/components/Textarea";
import { BriskDatePicker } from "@/components/form/BriskDatePicker";
import { BriskTimePicker } from "@/components/shoot/BriskTimePicker";
import { usePrototypeRole } from "@/components/navigation/PrototypeRoleContext";
import { useProjectCompletion } from "@/components/project/ProjectCompletionContext";
import type { Project, ProjectDeadline } from "@/components/active-videos/types";
import { useTurnaround, type ActiveStageDeadline } from "./TurnaroundContext";
import { countdown, deadlineInput, formatStageDeadline, localDeadline, type TurnaroundRule } from "@/data/turnaround";
import { deliveryTimeZone, formatDeliveryDate } from "@/data/project-delivery";
import { formatTimingDate } from "@/data/project-timing";
import type { ProductionFlowStageKey } from "@/data/production-flow";
import { ProjectDeadlineLink, useDeadlineDialog } from "./DeadlineDialogContext";
import { TimingDisclosure } from "./TimingDisclosure";
import { useProjectTiming } from "./ProjectTimingContext";

export function StageDeadlinePanel({ project, deadline, embedded = false, initialStage, onSaved }: { project: Project; deadline?: ProjectDeadline; embedded?: boolean; initialStage?: ProductionFlowStageKey; onSaved?: () => void }) {
  const timing = useTurnaround();
  const { getDeliveryAgreement, issues, shareClientUpdate } = useProjectTiming();
  const openDeadline = useDeadlineDialog();
  const { completionRecords } = useProjectCompletion();
  const { selectedRole } = usePrototypeRole();
  const active = timing.getActiveDeadlines(project, deadline);
  const initial = active.find((entry) => entry.stage === initialStage);
  const [editing, setEditing] = useState<ActiveStageDeadline | null>(initial ?? null);
  const [mode, setMode] = useState<TurnaroundRule["mode"]>(initial?.cycle?.mode ?? (initial?.dueAt ? "dates" : "automatic"));
  const [internal, setInternal] = useState(deadlineInput(initial?.internalDueAt, timing.timezone));
  const [client, setClient] = useState(deadlineInput(initial?.dueAt, timing.timezone));
  const [error, setError] = useState("");
  const [clientCopy, setClientCopy] = useState<string | null>(null);
  const [shareFeedback, setShareFeedback] = useState("");
  const agreement = getDeliveryAgreement(project);
  const issue = issues.filter((entry) => entry.projectId === project.id && !entry.resolvedAt)
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt))[0];
  const preview = editing ? timing.previewDeadline(project, editing.stage) : null;
  const canEdit = selectedRole === "Studio Staff" && project.status !== "Paused" && project.status !== "Completed" && project.status !== "Archived" && !completionRecords[project.id];
  const internalInstant = internal ? localDeadline(internal, timing.timezone) : null;
  const clientInstant = client ? localDeadline(client, timing.timezone) : null;
  const valid = mode === "automatic" || Boolean(clientInstant && (!internal || internalInstant && internalInstant <= clientInstant));
  const open = (entry: ActiveStageDeadline) => { if (!embedded) { openDeadline(project.id, { stage: entry.stage }); return; } setEditing(entry); setMode(entry.cycle?.mode ?? (entry.dueAt ? "dates" : "automatic")); setInternal(deadlineInput(entry.internalDueAt, timing.timezone)); setClient(deadlineInput(entry.dueAt, timing.timezone)); setError(""); };
  return <div className="deadline-read-list">
    {active.length ? active.map((entry) => <div className="deadline-read-row-v2" key={entry.stage}><div className="deadline-read-copy">
      <span className="deadline-read-date label-s"><strong className="label-s-semibold">{entry.label} due</strong> · {entry.dueAt ? formatDeadlineDay(entry.dueAt, timing.timezone) : "Not set"}</span>
      {entry.dueAt ? <span className={`deadline-helper deadline-text-${Date.parse(entry.dueAt) < timing.now ? "overdue" : "on-track"} label-xs-semibold`}>{countdown(entry.dueAt, timing.now, timing.timezone)}</span> : null}
    </div>{canEdit ? <Button size="S" variant="ghost" onClick={() => open(entry)}>{entry.dueAt ? "Change date" : "Set deadline"}<span className="sr-only"> for {entry.label}</span></Button> : null}</div>) : <p className="paragraph-s">No active stage deadlines.</p>}
    {project.status === "Paused" && active.length ? <p className="label-xs">Project paused. Existing dates stay unchanged.</p> : null}
    {!embedded ? <div className="deadline-read-copy">
      <button type="button" className="deadline-read-date label-s" onClick={() => openDeadline(project.id, { view: "calendar" })}><strong className="label-s-semibold">Final delivery</strong> · {deadline?.finalDueAt ? formatDeadlineDay(deadline.finalDueAt, deliveryTimeZone) : "TBC"}</button>
      <div className="deadline-summary-actions">
        <ProjectDeadlineLink className="timing-review-deadline-link label-xs-semibold" projectId={project.id}>Review timing</ProjectDeadlineLink>
      </div>
    </div> : null}
    <TimingDisclosure key={project.id} label={embedded ? "Stage details" : "Timing details"}>
      {active.map((entry) => <div className="deadline-read-copy" key={entry.stage}>
        <strong className="label-xs-semibold">{entry.label}</strong>
        <span className="label-xs">Version due to Client: {entry.dueAt ? formatStageDeadline(entry.dueAt, timing.timezone) : "Not set"}</span>
        {selectedRole !== "Customer" && entry.internalDueAt ? <span className="label-xs">Internal review due: {formatStageDeadline(entry.internalDueAt, timing.timezone)}</span> : null}
        <span className="label-xs">{entry.cycle ? `${entry.cycle.mode === "automatic" ? "Automatic" : "Specific date"} · ${entry.cycle.revision ? "Revision turnaround" : "First WIP"}` : entry.dueAt ? "Specific date" : "Choose a date or start a timer."}</span>
      </div>)}
      {!embedded && deadline?.finalDueAt ? <span className="label-xs">Final delivery: {formatDeliveryDate(deadline.finalDueAt)} · {deliveryTimeZone}</span> : null}
      <span className="label-xs">Stage times: {timing.timezone}. Working days exclude weekends.</span>
      {!embedded && issue && (selectedRole !== "Customer" || issue.clientUpdate || issue.kind === "brief") ? <div className="deadline-read-copy">
        <strong className="label-xs-semibold">Suggested delivery · {formatTimingDate(issue.suggestedDate)}</strong>
        {selectedRole === "Studio Staff" && project.status !== "Completed" && project.status !== "Archived" && !completionRecords[project.id] && issue.kind === "production" && !issue.clientUpdate ? <>
          <Textarea label="Client update" rows={2} value={clientCopy ?? issue.reason}
            hint="Only this message and the suggested date will be shared with the Client."
            onChange={(event) => setClientCopy(event.target.value)} />
          <Button size="S" variant="secondary" disabled={!(clientCopy ?? issue.reason).trim()} onClick={() => {
            if (shareClientUpdate(issue.id, clientCopy ?? issue.reason)) setShareFeedback("Timing update shared.");
          }}>Share with Client</Button>
          <span className="label-xs" role="status">{shareFeedback}</span>
        </> : issue.clientUpdate ? <span className="label-xs">{issue.clientUpdate.reason}</span> : null}
      </div> : null}
      {!embedded && (agreement.originalDate || agreement.proposals.length || agreement.changes?.length) ? <div className="final-delivery-history" aria-label="Delivery history">
        <strong className="label-xs-semibold">Delivery history</strong>
        {agreement.originalDate ? <span className="label-xs">Initial deadline · {formatDeliveryDate(agreement.originalDate)}</span> : null}
        {agreement.changes?.map((change) => <span className="label-xs" key={change.id}>{change.source === "brief" ? "Set in Brief" : "Changed"} · {formatDeliveryDate(change.date)} · {change.changedBy}{change.reason ? ` · ${change.reason}` : ""}</span>)}
        {agreement.proposals.map((proposal) => <span className="label-xs" key={proposal.id}>{proposal.status === "agreed" ? "Agreed" : proposal.status === "superseded" ? "Superseded" : "Proposed"} · {formatDeliveryDate(proposal.date)} · {proposal.proposedBy} · {proposal.reason}</span>)}
      </div> : null}
    </TimingDisclosure>
    {editing && embedded && canEdit ? <div className="turnaround-form" role="group" aria-label={`${editing.label} deadline`}>
      <h3 className="label-s-semibold">{editing.label} deadline</h3>
      <div className="turnaround-form"><div className="turnaround-mode" role="group" aria-label="Stage deadline mode"><Radio name="stage-deadline-mode" label="Automatic" checked={mode === "automatic"} onChange={() => setMode("automatic")} /><Radio name="stage-deadline-mode" label="Specific date" checked={mode === "dates"} onChange={() => setMode("dates")} /></div>
      {mode === "automatic" ? <><p className="paragraph-s">{editing.cycle ? "Uses your Studio’s current rules from this cycle’s original start." : "Starts now using your Studio’s turnaround times. This existing stage has no recorded start time."} Final delivery stays unchanged.</p><div className="deadline-read-list">{preview?.internalDueAt ? <div className="deadline-read-copy"><span className="label-xs">Internal WIP1</span><strong className="label-s-semibold">{formatStageDeadline(preview.internalDueAt, timing.timezone)}</strong></div> : null}{preview?.clientDueAt ? <div className="deadline-read-copy"><span className="label-xs">{preview.revision ? "Next WIP to Client" : "Client WIP1"}</span><strong className="label-s-semibold">{formatStageDeadline(preview.clientDueAt, timing.timezone)}</strong></div> : null}</div></> : <><div className="turnaround-form"><span className="label-s-semibold">{editing.cycle?.revision ? "Internal review (optional)" : "Internal WIP1 (optional)"}</span><DeadlineDateTimePicker ariaLabel="Internal WIP1 date" value={internal} onChange={setInternal} /><span className="label-s-semibold">{editing.cycle?.revision ? "Next WIP to Client" : "Client WIP1"}</span><DeadlineDateTimePicker ariaLabel="Client WIP deadline" value={client} onChange={setClient} /></div><p className="label-xs">{timing.timezone}. Client delivery must be on or after the internal WIP.</p></>}
      {error ? <p className="paragraph-s" role="alert">{error}</p> : null}</div>
      <div className="final-delivery-actions"><Button size="S" variant="ghost" onClick={() => setEditing(null)}>Cancel stage change</Button><Button size="S" variant="secondary" disabled={!valid} onClick={() => { if (timing.saveDeadline(project, editing.stage, mode, internalInstant, clientInstant)) { setEditing(null); onSaved?.(); } else setError("This stage has changed. Review its current status."); }}>Save stage deadline</Button></div>
    </div> : null}
  </div>;
}

function formatDeadlineDay(instant: string, timeZone: string) {
  return new Intl.DateTimeFormat("en-AU", { timeZone, weekday: "short", day: "numeric", month: "short" }).format(new Date(instant)).replace(",", "");
}

/** Reuses the existing project-panel date and time picker composition. */
export function DeadlineDateTimePicker({ ariaLabel, value, onChange, dialogAutoFocus }: { ariaLabel: string; value: string; onChange: (value: string) => void; dialogAutoFocus?: boolean }) {
  const [date = "", time = ""] = value.split("T");
  return <div className="project-detail-deadline-date-time"><div className="project-detail-deadline-picker"><BriskDatePicker ariaLabel={ariaLabel} dialogAutoFocus={dialogAutoFocus} placeholder="Choose date" value={date} variant="field" onChange={(next) => onChange(next ? `${next}T${time || "17:00"}` : "")} /></div><div className="project-detail-deadline-time-picker"><BriskTimePicker ariaLabel={`${ariaLabel} time`} placeholder="Choose time" value={time} onChange={(next) => onChange(date ? `${date}T${next || "17:00"}` : "")} /></div></div>;
}
