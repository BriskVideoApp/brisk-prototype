"use client";

import { useId, useState } from "react";
import { Button } from "../../../Brisk DS/src/app/components/Button";
import { EditingDialog } from "../../../Brisk DS/src/app/components/EditingDialog";
import { Input } from "../../../Brisk DS/src/app/components/Input";
import { Radio } from "../../../Brisk DS/src/app/components/Radio";
import { BriskSelect } from "@/components/form/BriskSelect";
import { useStudioSettings } from "./StudioSettingsContext";
import { cloneTurnaround, defaultTurnaround, turnaroundLabels, turnaroundStages, validRule, type StudioTurnaround, type TurnaroundRule, type TurnaroundStage } from "@/data/turnaround";

type Editor = "shared" | "rounds" | TurnaroundStage;
export function TurnaroundSettingsSection() {
  const { studio, updateTurnaround } = useStudioSettings();
  const saved = studio.production.turnaround ?? defaultTurnaround;
  const [editor, setEditor] = useState<Editor | null>(null);
  const [draft, setDraft] = useState<StudioTurnaround>(() => cloneTurnaround(saved));
  const [stage, setStage] = useState<TurnaroundStage | "">("");
  const [notice, setNotice] = useState("");
  const formId = useId();
  const open = (target: Editor) => { const next = cloneTurnaround(saved); if (target !== "shared" && target !== "rounds" && !next.overrides[target]) next.overrides[target] = { ...next.shared }; setDraft(next); setEditor(target); };
  const rule = editor && editor !== "rounds" ? editor === "shared" ? draft.shared : draft.overrides[editor]! : draft.shared;
  const setRule = (next: TurnaroundRule) => setDraft((current) => editor === "shared" ? { ...current, shared: next } : { ...current, overrides: { ...current.overrides, [editor!]: next } });
  const isException = editor && editor !== "shared" && editor !== "rounds";
  const valid = editor === "rounds" ? draft.includedRevisionRounds === null || Number.isInteger(draft.includedRevisionRounds) && draft.includedRevisionRounds >= 0
    : validRule(rule) && Number.isInteger(draft.extraDaysPerMinute) && draft.extraDaysPerMinute >= 0;
  const changed = JSON.stringify(draft) !== JSON.stringify(saved) && (!isException || JSON.stringify(rule) !== JSON.stringify(saved.shared));
  const save = () => { updateTurnaround(draft); setEditor(null); setNotice("Turnaround settings saved. Active deadlines are unchanged."); };
  const summary = (value: TurnaroundRule) => value.mode === "dates" ? "Specific dates" : `${value.internalDays} working days internal · ${value.clientDays} working days to Client`;
  return <section className="studio-settings-subsection studio-production-section" aria-labelledby="turnaround-heading">
    <div className="studio-settings-section-heading turnaround-heading"><div><h2 id="turnaround-heading" className="headings-xs-bold">Turnaround times</h2><p className="paragraph-s">Set once for your Studio. Customise only the stages that need it.</p></div><Button size="S" variant="secondary" onClick={() => open("shared")}>Edit turnaround times</Button></div>
    <p className="label-s-semibold">{summary(saved.shared)}</p>
    {saved.shared.mode === "automatic" ? <p className="paragraph-s">{saved.shared.revisionDays} working days after each round of Client feedback.</p> : null}
    <details className="turnaround-details"><summary className="label-s-semibold">Timing rules</summary><p className="paragraph-s">Monday to Friday. Timers start on Waiting on Studio. Client WIP1 includes internal review.</p><p className="paragraph-s">Longer edits: {saved.extraDaysPerMinute} extra working {saved.extraDaysPerMinute === 1 ? "day" : "days"} per minute, with a 10-second buffer. First WIP only.</p></details>
    {turnaroundStages.filter((key) => saved.overrides[key]).map((key) => <div className="turnaround-summary-row" key={key}><div><strong className="label-s-semibold">{turnaroundLabels[key]}</strong><p className="paragraph-s">{summary(saved.overrides[key]!)}{saved.overrides[key]!.mode === "automatic" ? ` · ${saved.overrides[key]!.revisionDays} working days per feedback round` : ""}</p></div><Button size="S" variant="ghost" onClick={() => open(key)}>Change {turnaroundLabels[key]}</Button></div>)}
    <div className="turnaround-customise"><BriskSelect<TurnaroundStage> ariaLabel="Customise a stage" options={turnaroundStages.map((key) => ({ value: key, label: turnaroundLabels[key] }))} value={stage} placeholder="Customise a stage" searchable={false} onChange={(value) => { setStage(value || ""); if (value) { open(value); setStage(""); } }} /></div>
    <div className="turnaround-summary-row"><div><h3 className="label-s-semibold">Client revisions</h3><p className="paragraph-s">Included rounds: {saved.includedRevisionRounds ?? "Not set"}</p></div><Button size="S" variant="ghost" onClick={() => open("rounds")}>Edit included rounds</Button></div>
    <p className="label-xs">Changes apply to future cycles. Existing deadlines stay as agreed.</p>
    {notice ? <p className="paragraph-s" role="status">{notice}</p> : null}
    {editor ? <EditingDialog title={editor === "shared" ? "Studio turnaround times" : editor === "rounds" ? "Included Client revisions" : `${turnaroundLabels[editor]} turnaround`} onCancel={() => setEditor(null)} actions={<><Button size="S" variant="secondary" onClick={() => setEditor(null)}>Cancel</Button><Button size="S" form={formId} type="submit" disabled={!valid || !changed}>Save</Button></>}>
      <form id={formId} className="turnaround-form" onSubmit={(event) => { event.preventDefault(); if (valid && changed) save(); }}>
        {editor === "rounds" ? <Input size="S" label="Included revision rounds" type="number" min={0} step={1} placeholder="Not set" value={draft.includedRevisionRounds ?? ""} hint="A separate allowance, not a turnaround time." onChange={(event) => setDraft({ ...draft, includedRevisionRounds: event.target.value === "" ? null : Number(event.target.value) })} /> : <>
          <div className="turnaround-mode" role="group" aria-label="Deadline mode"><Radio name="turnaround-mode" label="Automatic" checked={rule.mode === "automatic"} onChange={() => setRule({ ...rule, mode: "automatic" })} /><Radio name="turnaround-mode" label="Specific dates" checked={rule.mode === "dates"} onChange={() => setRule({ ...rule, mode: "dates" })} /></div>
          {rule.mode === "dates" ? <p className="paragraph-s">Choose a date for each stage when it is Waiting on Studio.</p> : <>
            <div className="turnaround-fields"><Days label="Internal WIP1" value={rule.internalDays} onChange={(value) => setRule({ ...rule, internalDays: value })} /><Days label="Client WIP1" value={rule.clientDays} onChange={(value) => setRule({ ...rule, clientDays: value })} /></div>
            <p className="label-xs">Client WIP1 includes internal review. It cannot be earlier than the internal WIP.</p>
            <details className="turnaround-details"><summary className="label-s-semibold">More timing rules</summary><div className="turnaround-form"><Days label="After Client feedback" value={rule.revisionDays} onChange={(value) => setRule({ ...rule, revisionDays: value })} />{editor === "shared" ? <Input size="S" label="Longer edits" labelSuffix="extra working days per minute" type="number" min={0} step={1} required value={Number.isFinite(draft.extraDaysPerMinute) ? draft.extraDaysPerMinute : ""} hint="10-second buffer. First WIP only." onChange={(event) => setDraft({ ...draft, extraDaysPerMinute: event.target.value === "" ? NaN : Number(event.target.value) })} /> : null}</div></details>
          </>}
          {!valid ? <p className="paragraph-s" role="status">Use whole working days of at least 1. Client WIP1 must allow time for internal review.</p> : null}
          {isException && JSON.stringify(rule) === JSON.stringify(saved.shared) ? <p className="label-xs">This stage already uses the Studio default. Change a value to create an exception.</p> : null}
          {isException && saved.overrides[editor as TurnaroundStage] ? <Button size="S" variant="ghost" onClick={() => { const next = cloneTurnaround(saved); delete next.overrides[editor as TurnaroundStage]; updateTurnaround(next); setEditor(null); setNotice("Stage now uses the Studio default. Active deadlines are unchanged."); }}>Use Studio default</Button> : null}
        </>}
      </form>
    </EditingDialog> : null}
  </section>;
}
function Days({ label, value, onChange }: { label: string; value: number; onChange: (value: number) => void }) {
  return <Input size="S" label={label} labelSuffix="working days" type="number" required min={1} step={1} value={Number.isFinite(value) ? value : ""} onChange={(event) => onChange(event.target.value === "" ? NaN : Number(event.target.value))} />;
}
