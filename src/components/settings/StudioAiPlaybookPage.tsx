"use client";

import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react";
import { Button } from "../../../Brisk DS/src/app/components/Button";
import { Input } from "../../../Brisk DS/src/app/components/Input";
import { useBriskAi } from "@/components/ai/BriskAiContext";
import { BriskSelect } from "@/components/form/BriskSelect";
import { useStudioSettingsUnsavedChanges } from "@/components/settings/StudioSettingsShell";
import { DsIcon } from "@/components/video-review/DsIcon";
import {
  cloneStudioAiPlaybook,
  filmmakerModes,
  type BriskAiResponseLength,
  type BriskAiTone,
  type FilmmakerModeId,
  type StudioAiPlaybook,
} from "@/data/brisk-ai";

const toneOptions: ReadonlyArray<{ value: BriskAiTone; label: BriskAiTone }> = [
  { value: "Direct and constructive", label: "Direct and constructive" },
  { value: "Warm and supportive", label: "Warm and supportive" },
  { value: "Challenging and candid", label: "Challenging and candid" },
];

const responseLengthOptions: ReadonlyArray<{ value: BriskAiResponseLength; label: BriskAiResponseLength }> = [
  { value: "Concise", label: "Concise" },
  { value: "Balanced", label: "Balanced" },
  { value: "Detailed", label: "Detailed" },
];

export function StudioAiPlaybookPage() {
  const { playbook, updatePlaybook } = useBriskAi();
  const { setHasUnsavedChanges } = useStudioSettingsUnsavedChanges();
  const [draft, setDraft] = useState<StudioAiPlaybook>(() => cloneStudioAiPlaybook(playbook));
  const [toast, setToast] = useState("");
  const hasChanges = useMemo(() => JSON.stringify(draft) !== JSON.stringify(playbook), [draft, playbook]);

  useEffect(() => setHasUnsavedChanges(hasChanges), [hasChanges, setHasUnsavedChanges]);
  useEffect(() => () => setHasUnsavedChanges(false), [setHasUnsavedChanges]);
  useEffect(() => {
    if (!toast) return;
    const timeout = window.setTimeout(() => setToast(""), 3600);
    return () => window.clearTimeout(timeout);
  }, [toast]);

  const updateField = <Key extends keyof StudioAiPlaybook,>(key: Key, value: StudioAiPlaybook[Key]) => {
    setDraft((current) => ({ ...current, [key]: value }));
  };

  const savePlaybook = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    updatePlaybook(draft);
    setHasUnsavedChanges(false);
    setToast("Studio AI Playbook updated.");
  };

  const discardChanges = () => {
    setDraft(cloneStudioAiPlaybook(playbook));
    setHasUnsavedChanges(false);
  };

  const addExampleReference = () => {
    const nextReference = `Northstar approved script ${draft.exampleReferences.length + 1}.pdf`;
    updateField("exampleReferences", [...draft.exampleReferences, nextReference]);
  };

  return (
    <section className="studio-settings-section brisk-ai-playbook-settings" aria-labelledby="studio-ai-playbook-heading">
      <div className="brisk-ai-playbook-explainer" id="studio-ai-playbook-heading">
        <article>
          <span><DsIcon name="settings" size={20} /></span>
          <div><strong className="label-m-semibold">Studio AI Playbook</strong><p className="paragraph-s">Defines how your Studio wants Brisk AI to work across the workspace. Client-specific understanding comes from the AI Brand Profile inside each Client Brand Kit.</p></div>
        </article>
      </div>

      <form className="studio-production-form brisk-ai-playbook-form" onSubmit={savePlaybook}>
        <PlaybookSection title="Default behaviour" description="Choose the starting creative approach and answer style for new conversations.">
          <div className="studio-settings-field-grid">
            <label className="studio-settings-select-field">
              <span className="label-m-semibold">Default creative approach</span>
              <BriskSelect<FilmmakerModeId>
                ariaLabel="Default creative approach"
                clearable={false}
                options={filmmakerModes.map((mode) => ({ value: mode.id, label: mode.label, icon: mode.icon }))}
                placeholder="Choose a creative approach"
                searchable={false}
                value={draft.defaultModeId}
                onChange={(defaultModeId) => {
                  if (defaultModeId) updateField("defaultModeId", defaultModeId);
                }}
              />
              <span className="label-xs">New conversations use this approach automatically.</span>
            </label>
            <label className="studio-settings-select-field">
              <span className="label-m-semibold">Tone</span>
              <BriskSelect<BriskAiTone>
                ariaLabel="Studio AI tone"
                clearable={false}
                options={toneOptions}
                placeholder="Choose a tone"
                searchable={false}
                value={draft.tone}
                onChange={(tone) => {
                  if (tone) updateField("tone", tone);
                }}
              />
            </label>
            <label className="studio-settings-select-field">
              <span className="label-m-semibold">Response length</span>
              <BriskSelect<BriskAiResponseLength>
                ariaLabel="Default AI response length"
                clearable={false}
                options={responseLengthOptions}
                placeholder="Choose a response length"
                searchable={false}
                value={draft.responseLength}
                onChange={(responseLength) => {
                  if (responseLength) updateField("responseLength", responseLength);
                }}
              />
            </label>
          </div>
        </PlaybookSection>

        <PlaybookSection title="Studio principles" description="Give Brisk AI the practical standards your team applies to creative and production decisions.">
          <div className="brisk-ai-playbook-text-grid">
            <PlaybookTextArea label="Creative principles" value={draft.creativePrinciples} onChange={(value) => updateField("creativePrinciples", value)} />
            <PlaybookTextArea label="Production principles" value={draft.productionPrinciples} onChange={(value) => updateField("productionPrinciples", value)} />
            <PlaybookTextArea label="Always consider" value={draft.alwaysConsider} onChange={(value) => updateField("alwaysConsider", value)} />
            <PlaybookTextArea label="Avoid" value={draft.avoid} onChange={(value) => updateField("avoid", value)} />
          </div>
          <PlaybookTextArea label="Custom instructions" value={draft.customInstructions} onChange={(value) => updateField("customInstructions", value)} />
        </PlaybookSection>

        <PlaybookSection title="Custom creative approach" description="Define one Studio-specific approach using your own behaviour and examples.">
          <Input label="Approach name" value={draft.customModeName} onChange={(event) => updateField("customModeName", event.target.value)} />
          <PlaybookTextArea label="Behaviour and examples" value={draft.customModeBehaviour} onChange={(value) => updateField("customModeBehaviour", value)} />
          <p className="brisk-ai-playbook-rule label-xs"><DsIcon name="info" size={14} />Creative approaches shape how Brisk responds. They never override access, project facts, the Client AI Brand Profile or explicitly selected sources.</p>
        </PlaybookSection>

        <PlaybookSection title="Example files and references" description="Mocked examples help demonstrate how approved work can guide future responses.">
          <div className="brisk-ai-reference-list">
            {draft.exampleReferences.map((reference) => (
              <div key={reference}><span><DsIcon name="file-text" size={16} /><strong className="label-s-semibold">{reference}</strong></span><button type="button" aria-label={`Remove ${reference}`} onClick={() => updateField("exampleReferences", draft.exampleReferences.filter((item) => item !== reference))}><DsIcon name="x-close-cross" size={14} /></button></div>
            ))}
          </div>
          <Button size="S" type="button" variant="secondary" onClick={addExampleReference}><DsIcon name="plus" size={14} />Add mocked reference</Button>
        </PlaybookSection>

        <PlaybookSection title="Client access" description="Brisk AI is available to every Client across all of their videos.">
          <p className="brisk-ai-playbook-rule label-xs"><DsIcon name="check-circle" size={14} />Clients can use their own AI Brand Profile, assigned projects, released work and Client-visible comments. Internal comments, other Clients and unrelated projects remain private.</p>
        </PlaybookSection>

        <div className="studio-settings-form-actions">
          <Button size="M" type="button" variant="secondary" onClick={discardChanges}>Discard changes</Button>
          <Button size="M" type="submit">Save AI Playbook</Button>
        </div>
      </form>

      {toast ? <div className="studio-settings-toast label-s-semibold" role="status"><DsIcon name="check-circle" size={16} />{toast}</div> : null}
    </section>
  );
}

function PlaybookSection({ children, description, title }: { children: ReactNode; description: string; title: string }) {
  return (
    <section className="studio-settings-subsection studio-production-section">
      <div className="studio-settings-section-heading"><div><h2 className="headings-xs-bold">{title}</h2><p className="paragraph-s">{description}</p></div></div>
      {children}
    </section>
  );
}

function PlaybookTextArea({ label, onChange, value }: { label: string; onChange: (value: string) => void; value: string }) {
  return <label className="brisk-ai-playbook-textarea"><span className="label-m-semibold">{label}</span><textarea className="paragraph-s" value={value} onChange={(event) => onChange(event.target.value)} /></label>;
}
