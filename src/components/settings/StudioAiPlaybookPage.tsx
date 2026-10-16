"use client";

import { useEffect, useMemo, useRef, useState, type ChangeEvent, type FormEvent } from "react";
import { Button } from "../../../Brisk DS/src/app/components/Button";
import { Input } from "../../../Brisk DS/src/app/components/Input";
import { useBriskAi } from "@/components/ai/BriskAiContext";
import { useStudioSettingsUnsavedChanges } from "@/components/settings/StudioSettingsShell";
import { DsIcon } from "@/components/video-review/DsIcon";
import { cloneStudioAiPlaybook, type StudioAiPlaybook } from "@/data/brisk-ai";

export function StudioAiPlaybookPage() {
  const { playbook, updatePlaybook } = useBriskAi();
  const { setHasUnsavedChanges } = useStudioSettingsUnsavedChanges();
  const [draft, setDraft] = useState<StudioAiPlaybook>(() => cloneStudioAiPlaybook(playbook));
  const [linkDraft, setLinkDraft] = useState("");
  const [toast, setToast] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const hasChanges = useMemo(() => JSON.stringify(draft) !== JSON.stringify(playbook), [draft, playbook]);

  useEffect(() => setHasUnsavedChanges(hasChanges), [hasChanges, setHasUnsavedChanges]);
  useEffect(() => () => setHasUnsavedChanges(false), [setHasUnsavedChanges]);
  useEffect(() => {
    if (!toast) return;
    const timeout = window.setTimeout(() => setToast(""), 3600);
    return () => window.clearTimeout(timeout);
  }, [toast]);

  const savePlaybook = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    updatePlaybook(draft);
    setHasUnsavedChanges(false);
    setToast("AI Playbook saved.");
  };

  const discardChanges = () => {
    setDraft(cloneStudioAiPlaybook(playbook));
    setLinkDraft("");
    setHasUnsavedChanges(false);
  };

  const addFiles = (event: ChangeEvent<HTMLInputElement>) => {
    const names = Array.from(event.target.files ?? [], (file) => file.name);
    setDraft((current) => ({
      ...current,
      exampleReferences: [...new Set([...current.exampleReferences, ...names])],
    }));
    event.target.value = "";
  };

  const addLink = () => {
    const value = linkDraft.trim();
    if (!value) return;
    const link = /^https?:\/\//iu.test(value) ? value : `https://${value}`;
    setDraft((current) => ({
      ...current,
      referenceLinks: [...new Set([...current.referenceLinks, link])],
    }));
    setLinkDraft("");
  };

  return (
    <section className="studio-settings-section brisk-ai-playbook-settings" aria-labelledby="studio-ai-playbook-heading">
      <form className="studio-production-form brisk-ai-playbook-form" onSubmit={savePlaybook}>
        <section className="studio-settings-subsection studio-production-section">
          <div className="studio-settings-section-heading">
            <div>
              <h2 className="headings-xs-bold" id="studio-ai-playbook-heading">Instructions</h2>
              <p className="paragraph-s">Tell Brisk AI how your Studio works. Client brand guidance stays in each Client Brand Kit.</p>
            </div>
          </div>
          <label className="brisk-ai-playbook-textarea">
            <span className="label-m-semibold">Studio instructions</span>
            <textarea
              className="paragraph-s"
              value={draft.customInstructions}
              onChange={(event) => setDraft((current) => ({ ...current, customInstructions: event.target.value }))}
              placeholder="What should Brisk AI know about your Studio's work?"
            />
          </label>
        </section>

        <section className="studio-settings-subsection studio-production-section">
          <div className="studio-settings-section-heading">
            <div>
              <h2 className="headings-xs-bold">References</h2>
              <p className="paragraph-s">Add approved files and links that should guide Brisk AI.</p>
            </div>
          </div>

          {draft.exampleReferences.length || draft.referenceLinks.length ? <div className="brisk-ai-reference-list">
            {draft.exampleReferences.map((name) => (
              <div key={name}>
                <span><DsIcon name="file-text" size={16} /><strong className="label-s-semibold">{name}</strong></span>
                <button type="button" aria-label={`Remove ${name}`} onClick={() => setDraft((current) => ({ ...current, exampleReferences: current.exampleReferences.filter((item) => item !== name) }))}><DsIcon name="x-close-cross" size={14} /></button>
              </div>
            ))}
            {draft.referenceLinks.map((link) => (
              <div key={link}>
                <span><DsIcon name="link" size={16} /><a className="label-s-semibold" href={link} target="_blank" rel="noreferrer">{link}</a></span>
                <button type="button" aria-label={`Remove ${link}`} onClick={() => setDraft((current) => ({ ...current, referenceLinks: current.referenceLinks.filter((item) => item !== link) }))}><DsIcon name="x-close-cross" size={14} /></button>
              </div>
            ))}
          </div> : <p className="paragraph-s">No references added yet.</p>}

          <div className="brisk-ai-reference-actions">
            <input className="sr-only" ref={fileInputRef} type="file" multiple accept=".pdf,.doc,.docx,.txt,image/*" onChange={addFiles} />
            <Button size="S" type="button" variant="secondary" onClick={() => fileInputRef.current?.click()}><DsIcon name="plus" size={14} />Upload files</Button>
            <div className="brisk-ai-reference-link-entry">
              <Input label="Reference link" type="url" value={linkDraft} onChange={(event) => setLinkDraft(event.target.value)} />
              <Button size="S" type="button" variant="secondary" onClick={addLink}>Add link</Button>
            </div>
          </div>
        </section>

        <div className="studio-settings-form-actions">
          <Button size="M" type="button" variant="secondary" onClick={discardChanges}>Discard changes</Button>
          <Button size="M" type="submit">Save AI Playbook</Button>
        </div>
      </form>
      {toast ? <div className="studio-settings-toast label-s-semibold" role="status"><DsIcon name="check-circle" size={16} />{toast}</div> : null}
    </section>
  );
}
