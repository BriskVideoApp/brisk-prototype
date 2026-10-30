"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "../../../Brisk DS/src/app/components/Button";
import { Radio } from "../../../Brisk DS/src/app/components/Radio";
import { EditingDialog } from "../../../Brisk DS/src/app/components/EditingDialog";
import { BriskDatePicker } from "@/components/form/BriskDatePicker";
import { BriskTimePicker } from "@/components/shoot/BriskTimePicker";
import { usePrototypeRole } from "@/components/navigation/PrototypeRoleContext";
import type { Project, ProjectDeadline } from "@/components/active-videos/types";
import { ProjectTimingWarning } from "./ProjectTimingNotice";
import { useTurnaround, type ActiveStageDeadline } from "./TurnaroundContext";
import { countdown, deadlineInput, formatStageDeadline, localDeadline, type TurnaroundRule } from "@/data/turnaround";
import { deliveryHref, formatDeliveryDate } from "@/data/project-delivery";

export function StageDeadlinePanel({ project, deadline }: { project: Project; deadline?: ProjectDeadline }) {
  const timing = useTurnaround();
  const { selectedRole } = usePrototypeRole();
  const [editing, setEditing] = useState<ActiveStageDeadline | null>(null);
  const [mode, setMode] = useState<TurnaroundRule["mode"]>("dates");
  const [internal, setInternal] = useState("");
  const [client, setClient] = useState("");
  const [error, setError] = useState("");
  const active = timing.getActiveDeadlines(project, deadline);
  const preview = editing ? timing.previewDeadline(project, editing.stage) : null;
  const canEdit = selectedRole === "Studio Staff" && project.status !== "Paused";
  const internalInstant = internal ? localDeadline(internal, timing.timezone) : null;
  const clientInstant = client ? localDeadline(client, timing.timezone) : null;
  const valid = mode === "automatic" || Boolean(clientInstant && (!internal || internalInstant && internalInstant <= clientInstant));
  const open = (entry: ActiveStageDeadline) => { setEditing(entry); setMode(entry.cycle?.mode ?? (entry.dueAt ? "dates" : "automatic")); setInternal(deadlineInput(entry.internalDueAt, timing.timezone)); setClient(deadlineInput(entry.dueAt, timing.timezone)); setError(""); };
  return <div className="deadline-read-list">
    {active.length ? active.map((entry) => <div className="deadline-read-row-v2" key={entry.stage}><div className="deadline-read-copy">
      <span className="deadline-read-label label-xs-semibold">{entry.label} · Waiting on Studio</span>
      <span className="deadline-read-date label-s-semibold">{entry.dueAt ? formatStageDeadline(entry.dueAt, timing.timezone) : "No deadline set"}</span>
      {entry.dueAt ? <span className={`deadline-helper deadline-text-${Date.parse(entry.dueAt) < timing.now ? "overdue" : "on-track"} label-xs-semibold`}>{countdown(entry.dueAt, timing.now, timing.timezone)}</span> : null}
      {selectedRole !== "Customer" && entry.internalDueAt ? <span className="label-xs">Internal WIP1: {formatStageDeadline(entry.internalDueAt, timing.timezone)}</span> : null}
      <span className="label-xs">{entry.cycle?.mode === "automatic" ? entry.cycle.revision ? "Automatic · revision turnaround" : "Automatic · first WIP" : entry.dueAt ? "Specific date" : "Choose a date or start a timer."}</span>
    </div>{canEdit ? <Button size="S" variant="ghost" onClick={() => open(entry)}>{entry.dueAt ? "Edit" : "Set deadline"}<span className="sr-only"> for {entry.label}</span></Button> : null}</div>) : <p className="paragraph-s">No stages are Waiting on Studio.</p>}
    {project.status === "Paused" && active.length ? <p className="label-xs">Project paused. Existing dates stay unchanged.</p> : null}
    <p className="label-xs">{timing.timezone} · Working days exclude weekends.</p>
    <div className="deadline-read-row-v2"><div className="deadline-read-copy"><span className="deadline-read-label label-xs-semibold">Final delivery</span><span className="deadline-read-date label-s-semibold">{deadline?.finalDueAt ? formatDeliveryDate(deadline.finalDueAt) : "To be agreed"}</span><Link className="timing-review-deadline-link label-xs-semibold" href={deliveryHref(project.id)}>View final delivery</Link><ProjectTimingWarning projectId={project.id} /></div></div>
    {editing ? <EditingDialog title={`${editing.label} deadline`} description="Waiting on Studio" onCancel={() => setEditing(null)} actions={<><Button size="S" variant="secondary" onClick={() => setEditing(null)}>Cancel</Button><Button size="S" disabled={!valid} onClick={() => { if (timing.saveDeadline(project, editing.stage, mode, internalInstant, clientInstant)) setEditing(null); else setError("This stage has changed. Close and review its current status."); }}>Save deadline</Button></>}>
      <div className="turnaround-form"><div className="turnaround-mode" role="group" aria-label="Stage deadline mode"><Radio name="stage-deadline-mode" label="Automatic" checked={mode === "automatic"} onChange={() => setMode("automatic")} /><Radio name="stage-deadline-mode" label="Specific date" checked={mode === "dates"} onChange={() => setMode("dates")} /></div>
      {mode === "automatic" ? <><p className="paragraph-s">{editing.cycle ? "Uses your Studio’s current rules from this cycle’s original start." : "Starts now using your Studio’s turnaround times. This existing stage has no recorded start time."} Final delivery stays unchanged.</p><div className="deadline-read-list">{preview?.internalDueAt ? <div className="deadline-read-copy"><span className="label-xs">Internal WIP1</span><strong className="label-s-semibold">{formatStageDeadline(preview.internalDueAt, timing.timezone)}</strong></div> : null}{preview?.clientDueAt ? <div className="deadline-read-copy"><span className="label-xs">{preview.revision ? "Next WIP to Client" : "Client WIP1"}</span><strong className="label-s-semibold">{formatStageDeadline(preview.clientDueAt, timing.timezone)}</strong></div> : null}</div></> : <><div className="turnaround-form"><span className="label-s-semibold">{editing.cycle?.revision ? "Internal review (optional)" : "Internal WIP1 (optional)"}</span><DeadlineDateTimePicker ariaLabel="Internal WIP1 date" value={internal} onChange={setInternal} /><span className="label-s-semibold">{editing.cycle?.revision ? "Next WIP to Client" : "Client WIP1"}</span><DeadlineDateTimePicker ariaLabel="Client WIP deadline" value={client} onChange={setClient} /></div><p className="label-xs">{timing.timezone}. Client delivery must be on or after the internal WIP.</p></>}
      {error ? <p className="paragraph-s" role="alert">{error}</p> : null}</div>
    </EditingDialog> : null}
  </div>;
}

/** Reuses the existing project-panel date and time picker composition. */
export function DeadlineDateTimePicker({ ariaLabel, value, onChange }: { ariaLabel: string; value: string; onChange: (value: string) => void }) {
  const [date = "", time = ""] = value.split("T");
  return <div className="project-detail-deadline-date-time"><div className="project-detail-deadline-picker"><BriskDatePicker ariaLabel={ariaLabel} placeholder="Choose date" value={date} variant="field" onChange={(next) => onChange(next ? `${next}T${time || "17:00"}` : "")} /></div><div className="project-detail-deadline-time-picker"><BriskTimePicker ariaLabel={`${ariaLabel} time`} placeholder="Choose time" value={time} onChange={(next) => onChange(date ? `${date}T${next || "17:00"}` : "")} /></div></div>;
}
