"use client";

import { useId, useState } from "react";
import { Button } from "../../../Brisk DS/src/app/components/Button";
import { EditingDialog } from "../../../Brisk DS/src/app/components/EditingDialog";
import { Input } from "../../../Brisk DS/src/app/components/Input";
import { Radio } from "../../../Brisk DS/src/app/components/Radio";
import { BriskSelect } from "@/components/form/BriskSelect";
import { DsIcon } from "@/components/video-review/DsIcon";
import { useStudioSettings } from "./StudioSettingsContext";
import { SettingsSummaryRow } from "./SettingsSummaryRow";
import { cloneTurnaround, defaultTurnaround, extraVideoDays, turnaroundLabels, turnaroundStages, validRule, type StudioTurnaround, type TurnaroundRule, type TurnaroundStage } from "@/data/turnaround";

export function TurnaroundSettingsSection({ onSaved }: { onSaved: (message: string) => void }) {
  const { studio, updateTurnaround } = useStudioSettings();
  const saved = studio.production.turnaround ?? defaultTurnaround;
  const [editor, setEditor] = useState<"timing" | "rounds" | null>(null);
  const [draft, setDraft] = useState<StudioTurnaround>(() => cloneTurnaround(saved));
  const [stage, setStage] = useState<TurnaroundStage | "">("");
  const formId = useId();
  const exceptions = turnaroundStages.filter((key) => saved.overrides[key]);
  const valid = editor === "rounds"
    ? draft.includedRevisionRounds === null || Number.isInteger(draft.includedRevisionRounds) && draft.includedRevisionRounds >= 0
    : validRule(draft.shared) && Object.values(draft.overrides).every(validRule)
      && Number.isInteger(draft.extraDaysPerMinute) && draft.extraDaysPerMinute >= 0;
  const changed = JSON.stringify(draft) !== JSON.stringify(saved);

  function open(target: "timing" | "rounds") {
    setDraft(cloneTurnaround(saved));
    setStage("");
    setEditor(target);
  }

  function setStageRule(nextRule: TurnaroundRule) {
    if (!stage) return;
    setDraft((current) => {
      const overrides = { ...current.overrides };
      if (JSON.stringify(nextRule) === JSON.stringify(current.shared)) delete overrides[stage];
      else overrides[stage] = nextRule;
      return { ...current, overrides };
    });
  }

  return <>
    <SettingsSummaryRow title={<span className="headings-xs-bold production-timing-heading">Turnaround times</span>} headingAs="h2" className="production-timing" actionPlacement="heading" action={<Button size="S" variant="secondary" onClick={() => open("timing")}>Edit timing</Button>}>
      {saved.shared.mode === "automatic" ? <>
        <p className="paragraph-s">First WIP (work in progress) for each stage.</p>
        <ol className="production-timing-flow" aria-label="First WIP timeline">
          <TimingMilestone day={0} title="Work starts" description="Filmmaker starts the first draft." />
          <TimingMilestone day={saved.shared.internalDays} interval={saved.shared.internalDays} title="Send WIP to team" description="Filmmaker shares internally for feedback." />
          <TimingMilestone day={saved.shared.clientDays} interval={saved.shared.clientDays - saved.shared.internalDays} additional title="Send WIP to Client" description="Studio sends the reviewed draft to the Client." />
        </ol>
        <dl className="production-timing-summary">
          <TimingSummary label="After Client feedback" days={saved.shared.revisionDays} description="Filmmaker returns the revised WIP." />
          <div>
            <dt className="label-s-semibold">Longer videos</dt>
            <dd className="label-m-semibold">{saved.extraDaysPerMinute > 0 ? `+${workingDays(saved.extraDaysPerMinute)} per extra minute` : "No extra time"}</dd>
            <dd className="paragraph-s production-timing-description">{saved.extraDaysPerMinute > 0
              ? "For Edit and Animation videos longer than 1 min 10 sec, allow extra time for the first team and Client WIPs."
              : "Longer Edit and Animation videos use the same first-WIP deadlines."}</dd>
            {saved.extraDaysPerMinute > 0 ? <dd className="paragraph-s production-timing-description">Example: a 2-minute video adds {workingDays(extraVideoDays(120, saved.extraDaysPerMinute))} to each deadline.</dd> : null}
          </div>
        </dl>
        <p className="paragraph-s production-timing-note">Working days are Monday to Friday. Client feedback time is excluded.</p>
      </> : <><strong className="label-m-semibold">Choose dates for each stage manually</strong><p className="paragraph-s">Set review dates in the project when your Studio starts work.</p></>}
      {exceptions.length > 0 ? <p className="paragraph-s">Custom timing: {exceptions.map((key) => turnaroundLabels[key]).join(", ")}.</p> : null}
    </SettingsSummaryRow>
    <SettingsSummaryRow title="Included revision rounds" headingAs="h2" action={<Button size="S" variant="secondary" onClick={() => open("rounds")}>Edit rounds</Button>}>
      <strong className="label-m-semibold">{saved.includedRevisionRounds === null ? "Not set" : `${saved.includedRevisionRounds} ${saved.includedRevisionRounds === 1 ? "round" : "rounds"}`}</strong>
    </SettingsSummaryRow>
    {editor ? <EditingDialog title={editor === "timing" ? "Edit turnaround times" : "Included revision rounds"} onCancel={() => setEditor(null)}
      description={editor === "timing" ? "Working days from when work starts. Changes apply to future stages and revisions." : undefined}
      actions={<>
        <Button size="S" variant="secondary" onClick={() => setEditor(null)}>Cancel</Button>
        <Button size="S" form={formId} type="submit" disabled={!valid || !changed}>{editor === "timing" ? "Save timing" : "Save rounds"}</Button>
      </>}>
      <form id={formId} className="turnaround-form" onSubmit={(event) => {
        event.preventDefault();
        if (!valid || !changed) return;
        // Each editor saves only its own fields, preserving other settings.
        updateTurnaround(editor === "rounds"
          ? { ...cloneTurnaround(saved), includedRevisionRounds: draft.includedRevisionRounds }
          : { ...draft, includedRevisionRounds: saved.includedRevisionRounds });
        setEditor(null);
        onSaved(editor === "timing" ? "Timing saved. Active deadlines are unchanged." : "Revision rounds saved.");
      }}>
        {editor === "rounds" ? <Input size="S" label="Included revision rounds" type="number" min={0} step={1} placeholder="Not set"
          value={draft.includedRevisionRounds ?? ""} hint="An optional allowance. This does not automatically limit Client feedback."
          onChange={(event) => setDraft({ ...draft, includedRevisionRounds: event.target.value === "" ? null : Number(event.target.value) })} /> : <>
          <TimingRuleFields rule={draft.shared} onChange={(shared) => setDraft({ ...draft, shared })} />
          <p className="paragraph-s">Monday to Friday, using {studio.details.timezone}. Client feedback time is excluded. Active deadlines stay unchanged.</p>
          <details className="turnaround-details">
            <summary className="label-s-semibold">Stage exceptions</summary>
            <div className="turnaround-form">
              <p className="paragraph-s">All stages use the Studio timing unless customised below.</p>
              <BriskSelect<TurnaroundStage> ariaLabel="Customise a stage" searchable={false} clearable={false}
                options={turnaroundStages.map((key) => ({ value: key, label: `${turnaroundLabels[key]}${draft.overrides[key] ? " · Custom" : ""}` }))}
                value={stage} placeholder="Choose a stage" onChange={(value) => setStage(value || "")} />
              {stage ? <>
                <TimingRuleFields key={stage} rule={draft.overrides[stage] ?? draft.shared} onChange={setStageRule} />
                {draft.overrides[stage] ? <Button size="S" variant="ghost" onClick={() => {
                  const overrides = { ...draft.overrides };
                  delete overrides[stage];
                  setDraft({ ...draft, overrides });
                }}>Use Studio default</Button> : <p className="paragraph-s">Using Studio timing.</p>}
              </> : null}
            </div>
          </details>
          <details className="turnaround-details">
            <summary className="label-s-semibold">Longer videos</summary>
            <Input size="S" label="Extra working days per minute" type="number" min={0} step={1} required
              value={Number.isFinite(draft.extraDaysPerMinute) ? draft.extraDaysPerMinute : ""}
              hint="First Edit and Animation WIPs only. Added to both deadlines for each minute beyond 1 min 10 sec, rounding partial minutes up."
              onChange={(event) => setDraft({ ...draft, extraDaysPerMinute: event.target.value === "" ? NaN : Number(event.target.value) })} />
            {Number.isInteger(draft.extraDaysPerMinute) && draft.extraDaysPerMinute >= 0 ? <p className="paragraph-s">For example, a 2-minute video adds {workingDays(extraVideoDays(120, draft.extraDaysPerMinute))} to both first WIP deadlines.</p> : null}
          </details>
          {!valid ? <p className="paragraph-s" role="status">Use whole working days of at least 1. The Client target must be the same day as, or later than, the Studio target. Check any stage exceptions too. Extra days can be 0.</p> : null}
        </>}
      </form>
    </EditingDialog> : null}
  </>;
}

function TimingRuleFields({ rule, onChange }: { rule: TurnaroundRule; onChange: (rule: TurnaroundRule) => void }) {
  const modeName = useId();
  return <div className="turnaround-form">
    <div className="turnaround-mode" role="group" aria-label="Deadline mode">
      <Radio name={modeName} label="Calculate dates automatically" checked={rule.mode === "automatic"} onChange={() => onChange({ ...rule, mode: "automatic" })} />
      <Radio name={modeName} label="Set dates manually" checked={rule.mode === "dates"} onChange={() => onChange({ ...rule, mode: "dates" })} />
    </div>
    {rule.mode === "automatic" ? <>
      <p className="paragraph-s">Both first WIP deadlines count from when work starts.</p>
      <Days label="Team WIP due" value={rule.internalDays} hint="Filmmaker sends the draft for internal feedback." onChange={(internalDays) => onChange({ ...rule, internalDays })} />
      <Days label="Client WIP due" value={rule.clientDays} hint="Studio sends the reviewed draft to the Client. Includes internal review time." onChange={(clientDays) => onChange({ ...rule, clientDays })} />
      <Days label="Revisions after Client feedback" value={rule.revisionDays} hint="Filmmaker returns the updated draft after Client feedback." onChange={(revisionDays) => onChange({ ...rule, revisionDays })} />
    </> : <p className="paragraph-s">Choose stage dates in the project when it is Waiting on Studio.</p>}
  </div>;
}

function workingDays(value: number) { return `${value} working ${value === 1 ? "day" : "days"}`; }

function TimingMilestone({ day, interval, additional = false, title, description }: { day: number; interval?: number; additional?: boolean; title: string; description: string }) {
  return <li className={`production-timing-milestone ${interval === undefined ? "is-start" : ""}`}>
    <span className="production-timing-day headings-s-bold">{interval === undefined ? "Day 0" : `By day ${day}`}</span>
    <div className="production-timing-track" aria-hidden="true">
      {interval !== undefined ? <TimingArrow days={interval} additional={additional} /> : null}
      <span className="production-timing-point" />
    </div>
    <strong className="label-m-semibold">{title}</strong>
    <p className="paragraph-s">{description}</p>
  </li>;
}

function TimingArrow({ days, additional }: { days: number; additional: boolean }) {
  return <div className="production-timing-arrow">
    <span className="label-xs production-timing-interval">{days === 0 ? "Same day" : `${days} ${additional ? "more " : ""}working ${days === 1 ? "day" : "days"}`}</span>
    <DsIcon name="arrow-right" size={16} />
  </div>;
}

function TimingSummary({ label, days, description }: { label: string; days: number; description: string }) {
  return <div>
    <dt className="label-s-semibold">{label}</dt>
    <dd className="label-m-semibold">{workingDays(days)}</dd>
    <dd className="paragraph-s production-timing-description">{description}</dd>
  </div>;
}

function Days({ label, value, hint, onChange }: { label: string; value: number; hint: string; onChange: (value: number) => void }) {
  return <Input size="S" label={label} labelSuffix="working days" type="number" required min={1} step={1}
    hint={hint} value={Number.isFinite(value) ? value : ""} onChange={(event) => onChange(event.target.value === "" ? NaN : Number(event.target.value))} />;
}
