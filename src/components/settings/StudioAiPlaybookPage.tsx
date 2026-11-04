"use client";

import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from "react";
import { Button } from "../../../Brisk DS/src/app/components/Button";
import { IconButton } from "../../../Brisk DS/src/app/components/IconButton";
import { Input } from "../../../Brisk DS/src/app/components/Input";
import { Textarea } from "../../../Brisk DS/src/app/components/Textarea";
import { Tabs } from "../../../Brisk DS/src/app/components/Tabs";
import { ConfirmationDialog } from "../../../Brisk DS/src/app/components/ConfirmationDialog";
import { BriskSelect } from "@/components/form/BriskSelect";
import { useBriskAi } from "@/components/ai/BriskAiContext";
import { useStudioSettingsUnsavedChanges } from "./StudioSettingsShell";
import { DsIcon } from "@/components/video-review/DsIcon";
import { initialStudioAiPlaybook, type StudioAiPlaybook } from "@/data/brisk-ai";
import { standardFilmmakerInstructions, filmmakerPlaybookExamples, normalisePlaybookLink } from "@/data/studio-ai-playbook";
import styles from "./StudioAiPlaybookPage.module.css";

type PlaybookTab = "instructions" | "references";
export function StudioAiPlaybookPage() {
  const { playbook, updatePlaybook } = useBriskAi();
  const { setHasUnsavedChanges } = useStudioSettingsUnsavedChanges();
  // Follow hydrated saved settings until the first local edit.
  const [edited, setEdited] = useState<StudioAiPlaybook | null>(null);
  const draft = edited ?? playbook;
  const [tab, setTab] = useState<PlaybookTab>("instructions");
  const [exampleId, setExampleId] = useState<string>(filmmakerPlaybookExamples[0].id);
  const [linkDraft, setLinkDraft] = useState("");
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");
  const [restoring, setRestoring] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const changed = JSON.stringify(draft) !== JSON.stringify(playbook) || Boolean(linkDraft.trim());
  const standard = draft.customInstructions === standardFilmmakerInstructions && draft.defaultModeId === "standard-filmmaker";
  const example = filmmakerPlaybookExamples.find((item) => item.id === exampleId) ?? filmmakerPlaybookExamples[0];
  const patch = (update: Partial<StudioAiPlaybook>) => setEdited({ ...draft, ...update });

  useEffect(() => setHasUnsavedChanges(changed), [changed, setHasUnsavedChanges]);
  useEffect(() => () => setHasUnsavedChanges(false), [setHasUnsavedChanges]);
  useEffect(() => {
    if (!toast) return;
    const timeout = window.setTimeout(() => setToast(""), 3600);
    return () => window.clearTimeout(timeout);
  }, [toast]);

  function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!changed) return;
    if (!draft.customInstructions.trim()) { setTab("instructions"); setError("Add instructions or restore the standard filmmaker."); return; }
    const pendingLink = linkDraft.trim() ? normalisePlaybookLink(linkDraft) : null;
    if (linkDraft.trim() && !pendingLink) { setTab("references"); setError("Enter a valid http or https website address."); return; }
    updatePlaybook({ ...draft, referenceLinks: pendingLink ? [...new Set([...draft.referenceLinks, pendingLink])] : draft.referenceLinks });
    setEdited(null); setLinkDraft(""); setError(""); setHasUnsavedChanges(false); setToast("AI Playbook saved.");
  }
  function cancel() { setEdited(null); setLinkDraft(""); setError(""); setHasUnsavedChanges(false); }
  function addFiles(event: ChangeEvent<HTMLInputElement>) {
    patch({ exampleReferences: [...new Set([...draft.exampleReferences, ...Array.from(event.target.files ?? [], (file) => file.name)])] });
    event.target.value = "";
  }
  function addLink() {
    const link = normalisePlaybookLink(linkDraft);
    if (!link) { setError("Enter a valid http or https website address."); return; }
    patch({ referenceLinks: [...new Set([...draft.referenceLinks, link])] });
    setLinkDraft(""); setError("");
  }

  return <section className="studio-settings-section" aria-label="Studio AI Playbook">
    <div className={styles.layout}>
      <form className="studio-production-form" onSubmit={save} noValidate>
        <div>
          <h2 className="headings-xs-bold">{standard ? "Standard filmmaker" : "Custom filmmaker"}</h2>
          <p className="paragraph-s studio-review-dialog-note">Ready to use. Adjust the instructions whenever your Studio needs something different.</p>
        </div>
        <Tabs<PlaybookTab> label="AI Playbook sections" value={tab} onValueChange={setTab} options={[{ value: "instructions", label: "Instructions" }, { value: "references", label: `References${draft.exampleReferences.length + draft.referenceLinks.length ? ` (${draft.exampleReferences.length + draft.referenceLinks.length})` : ""}` }]}>
          <div className={styles.fields}>
            {tab === "instructions" ? <>
              <Textarea label="Filmmaker instructions" rows={9} value={draft.customInstructions} onChange={(event) => { patch({ customInstructions: event.target.value }); setError(""); }} />
              <div><Button size="S" variant="ghost" disabled={standard} onClick={() => setRestoring(true)}>Restore standard filmmaker</Button></div>
            </> : <>
              <p className="paragraph-s">Add Studio references. Client-specific guidance belongs in each Client Brand Kit.</p>
              {draft.exampleReferences.length || draft.referenceLinks.length ? <div className="brisk-ai-reference-list">
                {draft.exampleReferences.map((name) => <div key={name}><span><DsIcon name="file-text" size={16} /><strong className="label-s-semibold">{name}</strong></span><IconButton aria-label={`Remove ${name}`} onClick={() => patch({ exampleReferences: draft.exampleReferences.filter((item) => item !== name) })}><DsIcon name="trash-simple" size={16} /></IconButton></div>)}
                {draft.referenceLinks.map((link) => <div key={link}><span><DsIcon name="link" size={16} />{normalisePlaybookLink(link) ? <a className="label-s-semibold" href={normalisePlaybookLink(link)!} target="_blank" rel="noreferrer">{link}</a> : <span className="label-s">{link}</span>}</span><IconButton aria-label={`Remove ${link}`} onClick={() => patch({ referenceLinks: draft.referenceLinks.filter((item) => item !== link) })}><DsIcon name="trash-simple" size={16} /></IconButton></div>)}
              </div> : <p className="paragraph-s">No references yet. The standard filmmaker works without them.</p>}
              <input className="sr-only" tabIndex={-1} aria-label="Choose reference files" ref={fileInputRef} type="file" multiple accept=".pdf,.doc,.docx,.txt,image/*" onChange={addFiles} />
              <div><Button size="S" variant="secondary" onClick={() => fileInputRef.current?.click()}><DsIcon name="upload-simple" size={16} />Add files</Button></div>
              <Input label="Reference link" placeholder="https://example.com" value={linkDraft} onChange={(event) => { setLinkDraft(event.target.value); setError(""); }} />
              <div><Button size="S" variant="secondary" disabled={!linkDraft.trim()} onClick={addLink}>Add link</Button></div>
            </>}
          </div>
        </Tabs>
        {error ? <p className="paragraph-s" role="alert">{error}</p> : null}
        <div className="studio-settings-form-actions"><Button size="S" variant="secondary" disabled={!changed} onClick={cancel}>Cancel</Button><Button size="S" type="submit" disabled={!changed}>Save AI Playbook</Button></div>
      </form>
      <aside className={`studio-production-form ${styles.preview}`} aria-label="Filmmaker example preview">
        <div><h2 className="headings-xs-bold">Example conversation</h2><p className="paragraph-s studio-review-dialog-note">Explore how the standard filmmaker can help.</p></div>
        <BriskSelect ariaLabel="Example conversation" clearable={false} searchable={false} options={filmmakerPlaybookExamples.map((item) => ({ value: item.id, label: item.label }))} value={exampleId} placeholder="Choose an example" onChange={(value) => { if (value) setExampleId(value); }} />
        <div className="brisk-ai-message is-user"><span className="label-xs-semibold">You</span><p className="paragraph-s">{example.prompt}</p></div>
        <div className="brisk-ai-message is-assistant"><header><span><DsIcon name="sparkle" size={16} /></span><strong className="label-s-semibold">Brisk AI</strong></header><p className="paragraph-s">{example.reply}</p></div>
        <p className="paragraph-s studio-review-dialog-note">Demo examples, not live AI responses. Editing instructions does not change this preview.</p>
      </aside>
    </div>
    <p className="paragraph-s studio-review-dialog-note">Studio guidance works alongside project context and Client Brand Kits. It cannot change permissions or make internal information visible to Clients.</p>
    {restoring ? <ConfirmationDialog title="Restore standard filmmaker?" description="This replaces your draft instructions and creative settings. References are kept. Save the playbook to apply it." confirmLabel="Restore standard" onCancel={() => setRestoring(false)} onConfirm={() => { setEdited({ ...initialStudioAiPlaybook, exampleReferences: [...draft.exampleReferences], referenceLinks: [...draft.referenceLinks] }); setRestoring(false); setError(""); }} /> : null}
    {toast ? <div className="studio-settings-toast label-s-semibold" role="status"><DsIcon name="check-circle" size={16} />{toast}</div> : null}
  </section>;
}
