"use client";

import { BriskSelect } from "@/components/form/BriskSelect";

import { EditingDialog } from "../../../Brisk DS/src/app/components/EditingDialog";

import { useEffect, useState } from "react";
import { Button } from "../../../Brisk DS/src/app/components/Button";
import { BriskDatePicker } from "@/components/form/BriskDatePicker";
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
    <> <EditingDialog title={<>{engagement.paymentBasis === "hourly" ? "Log hours" : "Log time"}</>} description={<>{engagement.project.clientBadge} - {engagement.roleLabel}<br />{engagement.project.name}</>} onCancel={onClose} size="standard" actions={<> <Button size="S" variant="secondary" onClick={onClose}>Cancel</Button>  {canSave ? <Button size="S" onClick={() => onSave({ id: `freelancer-time-${Date.now()}`, projectId: engagement.project.id, roleSlotId: engagement.roleSlotId, personId, stageId: stage, date, startMinutes: 0, hours: parsedHours, note: note.trim(), loggedAt: new Date(`${date}T17:00:00`).toISOString(), createdAt: new Date().toISOString() })}>Save time</Button> : <Button size="S" variant="primary"  type="button" disabled>Save time</Button>} </>}>  <div className="freelancer-time-fields">
          <div className="freelancer-time-date"><span className="label-s-semibold">Date</span><BriskDatePicker ariaLabel="Time entry date" placeholder="Choose date" value={date} variant="field" onChange={setDate} /></div>
          <label><span className="label-s-semibold">Stage</span><BriskSelect<string> ariaLabel={"Stage"} clearable={false} placeholder={"Choose an option"} value={stage} onChange={(value) => setStage(value as StageKey)} options={[...engagement.stages.map((assignedStage) => ({ value: assignedStage, label: (stageLabels[assignedStage]) }))]} /></label>
          <label><span className="label-s-semibold">Hours</span><input min="0.25" max="24" step="0.25" type="number" value={hours} onChange={(event) => setHours(event.target.value)} /></label>
          <label className="is-wide"><span className="label-s-semibold">Note</span><textarea placeholder="What did you work on?" value={note} onChange={(event) => setNote(event.target.value)} /></label>
        </div>  </EditingDialog> </>
  );
}
