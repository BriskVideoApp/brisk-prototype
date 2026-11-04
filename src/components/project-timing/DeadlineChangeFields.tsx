"use client";

import { Radio } from "../../../Brisk DS/src/app/components/Radio";
import { Textarea } from "../../../Brisk DS/src/app/components/Textarea";
import { DeadlineDateTimePicker } from "./StageDeadlinePanel";

export function DeadlineChangeFields({ action, currentDate, formId, hasPending, onActionChange, onDateChange,
  onMessageChange, message, recipient, showMessage = true, staff, value }: {
  action: "change" | "propose";
  currentDate: string;
  formId: string;
  hasPending: boolean;
  onActionChange: (action: "change" | "propose") => void;
  onDateChange: (value: string) => void;
  onMessageChange: (value: string) => void;
  message: string;
  recipient: string;
  showMessage?: boolean;
  staff: boolean;
  value: string;
}) {
  return <>
    <p className="final-delivery-note label-s">Current deadline · {currentDate}</p>
    {staff ? <div className="turnaround-mode" role="group" aria-label="Delivery date action">
      <Radio name={`${formId}-action`} label="Change date" checked={action === "change"} onChange={() => onActionChange("change")} />
      <Radio name={`${formId}-action`} label="Propose change" checked={action === "propose"} onChange={() => onActionChange("propose")} />
    </div> : <p className="label-s">Propose a change for the Studio to agree.</p>}
    <div className="final-delivery-dates"><span className="label-s-semibold">New deadline</span>
      <DeadlineDateTimePicker ariaLabel="New deadline" dialogAutoFocus={!staff} value={value} onChange={onDateChange} />
    </div>
    <p className="final-delivery-note label-xs">Sydney time. {action === "change"
      ? "Saved changes take effect immediately and appear in project Chat."
      : `The current date stays until the ${recipient} agrees.`}</p>
    {showMessage ? <Textarea label={`Message to ${recipient}`} labelSuffix="Optional" rows={2} value={message}
      onChange={(event) => onMessageChange(event.target.value)} /> : null}
    {action === "change" && hasPending ? <p className="final-delivery-note label-xs">Saving replaces the pending proposal and updates the deadline immediately.</p> : null}
  </>;
}
