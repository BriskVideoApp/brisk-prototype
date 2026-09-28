"use client";

import { useEffect, useState } from "react";
import { Button } from "../../../Brisk DS/src/app/components/Button";
import { BriskDatePicker } from "@/components/brief/BriefPage";
import { DsIcon } from "@/components/video-review/DsIcon";
import { stageLabels } from "@/data/active-videos/teamDefaults";
import type { StageKey } from "@/components/active-videos/types";
import type { FreelancerEngagement } from "@/data/freelancer-videos";
import type { SharedTimeEntry } from "@/data/timeEntries/sharedTimeEntries";

export function FreelancerTimeDialog({ engagement, initialStage, personId, onClose, onSave }: {
  engagement: FreelancerEngagement;
  initialStage: StageKey;
  personId: string;
  onClose: () => void;
  onSave: (entry: SharedTimeEntry) => void;
}) {
  const [date, setDate] = useState("");
  const [stage, setStage] = useState(initialStage);
  const [hours, setHours] = useState("1");
  const [note, setNote] = useState("");
  const parsedHours = Number.parseFloat(hours);
  const canSave = Boolean(date) && Number.isFinite(parsedHours) && parsedHours > 0 && parsedHours <= 24;

  useEffect(() => setDate(new Date().toLocaleDateString("sv-SE")), []);

  return (
    <div className="freelancer-time-dialog-backdrop" role="presentation" onClick={onClose}>
      <section className="freelancer-time-dialog" role="dialog" aria-modal="true" aria-labelledby="freelancer-log-time-title" onClick={(event) => event.stopPropagation()}>
        <header>
          <div>
            <span className="label-xs-semibold">{engagement.project.clientBadge} - {engagement.roleLabel}</span>
            <h2 className="headings-s-bold" id="freelancer-log-time-title">{engagement.paymentBasis === "hourly" ? "Log hours" : "Log time"}</h2>
            <p className="paragraph-s">{engagement.project.name}</p>
          </div>
          <button type="button" aria-label="Close time entry" onClick={onClose}><DsIcon name="x-close-cross" size={16} /></button>
        </header>
        <div className="freelancer-time-fields">
          <div className="freelancer-time-date"><span className="label-s-semibold">Date</span><BriskDatePicker ariaLabel="Time entry date" placeholder="Choose date" value={date} variant="field" onChange={setDate} /></div>
          <label><span className="label-s-semibold">Stage</span><select value={stage} onChange={(event) => setStage(event.target.value as StageKey)}>{engagement.stages.map((assignedStage) => <option value={assignedStage} key={assignedStage}>{stageLabels[assignedStage]}</option>)}</select></label>
          <label><span className="label-s-semibold">Hours</span><input min="0.25" max="24" step="0.25" type="number" value={hours} onChange={(event) => setHours(event.target.value)} /></label>
          <label className="is-wide"><span className="label-s-semibold">Note</span><textarea placeholder="What did you work on?" value={note} onChange={(event) => setNote(event.target.value)} /></label>
        </div>
        <footer>
          <Button size="M" variant="secondary" onClick={onClose}>Cancel</Button>
          {canSave ? <Button size="M" onClick={() => onSave({ id: `freelancer-time-${Date.now()}`, projectId: engagement.project.id, roleSlotId: engagement.roleSlotId, personId, stageId: stage, date, startMinutes: 0, hours: parsedHours, note: note.trim(), loggedAt: new Date(`${date}T17:00:00`).toISOString(), createdAt: new Date().toISOString() })}>Save time</Button> : <button className="freelancer-time-disabled-save label-m-semibold" type="button" disabled>Save time</button>}
        </footer>
      </section>
    </div>
  );
}
