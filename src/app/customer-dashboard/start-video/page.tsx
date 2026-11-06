"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "../../../../Brisk DS/src/app/components/Button";
import { Input } from "../../../../Brisk DS/src/app/components/Input";
import { usePrototypeState } from "@/components/prototype-state/PrototypeStateContext";
import { usePrototypeViewer } from "@/components/prototype-state/usePrototypeViewer";
import { initialBriefFields, type BriefFields } from "@/data/brief";
import { getDefaultProjectCodePrefix } from "@/data/clients";
import { getNextClientProjectCode } from "@/data/project-naming";
import { getProjectStageHref } from "@/data/project-fixtures";
import { clientNewVideoProject } from "@/data/prototype-scenarios";
import { northStarWorkspaceId, selectScopedClient } from "@/data/prototype-state";

const legacyBriefStorageKey = `brisk-client-first-video-brief-v1:${northStarWorkspaceId}:${clientNewVideoProject.id}`;

export default function ClientStartVideoRoute() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { state, hasHydrated, createClientVideo, createProject } = usePrototypeState();
  const viewer = usePrototypeViewer();
  const [name, setName] = useState("");
  const [loadedDraftKey, setLoadedDraftKey] = useState<string | null>(null);
  const submitting = useRef(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [saveError, setSaveError] = useState("");
  const requestedClient = searchParams.get("client");
  const clientId = viewer?.role === "Customer" ? viewer.clientId
    : viewer?.role === "Studio Staff" ? requestedClient : null;
  const client = viewer && clientId
    ? selectScopedClient(state, viewer.workspaceId, clientId)
    : null;
  const canStart = Boolean(client && (!requestedClient || requestedClient === client.id) && (viewer?.role === "Studio Staff" || (viewer?.role === "Customer"
    && client.contacts.some((contact) => contact.id === viewer.id && contact.portalAccess !== "Paused")
    && state.invitations.some((invitation) => invitation.userId === viewer.id
      && invitation.clientId === client.id && invitation.workspaceId === viewer.workspaceId
      && invitation.status !== "Expired"))));
  const draftStorageKey = canStart && client ? `brisk-client-video-name-draft-v1:${client.workspaceId}:${client.id}` : null;
  const code = client
    ? getNextClientProjectCode(client.projectCodePrefix ?? getDefaultProjectCodePrefix(client.name), state.projects.flatMap((project) => project.code ? [project.code] : []))
    : null;

  useEffect(() => {
    if (!draftStorageKey) return;
    setName(window.localStorage.getItem(draftStorageKey) ?? "");
    setLoadedDraftKey(draftStorageKey);
  }, [draftStorageKey]);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting.current || !canStart || !client || !viewer || !name.trim()) return;
    submitting.current = true;
    setIsSubmitting(true);
    setSaveError("");
    const legacyFields = client.id === clientNewVideoProject.clientId ? readLegacyBriefFields() : undefined;
    const project = viewer.role === "Studio Staff"
      ? createProject({ clientId: client.id, name: name.trim() })
      : createClientVideo({ clientId: client.id, userId: viewer.id, name: name.trim(), fields: legacyFields });
    if (!project) {
      submitting.current = false;
      setIsSubmitting(false);
      setSaveError("The video could not be created. Open the Client portal and try again.");
      return;
    }
    if (draftStorageKey) window.localStorage.removeItem(draftStorageKey);
    if (legacyFields) window.localStorage.removeItem(legacyBriefStorageKey);
    router.push(getProjectStageHref(project.id, "brief"));
  }

  if (!hasHydrated || (draftStorageKey && loadedDraftKey !== draftStorageKey)) return null;
  if (!canStart || !client || !code || !viewer) {
    return <main className="client-video-naming-unavailable"><h1 className="headings-s-bold">Start Video unavailable</h1><p className="paragraph-s">Open a Client portal to start a video.</p></main>;
  }

  if (!state.studioBriefTemplates.some((template) => template.workspaceId === viewer.workspaceId)) {
    return <main className="client-video-naming-unavailable">
      <h1 className="headings-s-bold">Studio setup is incomplete</h1>
      <p className="paragraph-s">The Studio needs a Brief template before a video can be created.</p>
      {viewer.role === "Studio Staff" && <Button onClick={() => router.push("/studio-onboard")}>Continue Studio setup</Button>}
      <Button variant="secondary" onClick={() => router.back()}>Back</Button>
    </main>;
  }

  return (
    <main className="client-video-naming-page">
      <form className="client-video-naming-form" onSubmit={handleSubmit}>
        <h1 className="headings-s-bold">Name {client.name}&apos;s video</h1>
        <div className="client-video-naming-fields">
          <div className="client-video-naming-code">
            <span className="label-m-semibold">Project code</span>
            <strong className="label-l-semibold">{code}</strong>
          </div>
          <Input
            id="client-video-name"
            label="Video name"
            placeholder="Eg Customer Story"
            value={name}
            onChange={(event) => {
              setName(event.target.value);
              if (draftStorageKey) window.localStorage.setItem(draftStorageKey, event.target.value);
            }}
          />
        </div>
        {saveError && <p role="alert" className="paragraph-s">{saveError}</p>}
        <div className="client-video-naming-actions">
          <Button type="button" variant="secondary" onClick={() => router.back()}>Cancel</Button>
          <Button type="submit" disabled={isSubmitting || !name.trim()}>Continue to Brief</Button>
        </div>
      </form>
    </main>
  );
}

function readLegacyBriefFields(): BriefFields | undefined {
  try {
    const stored = window.localStorage.getItem(legacyBriefStorageKey);
    const parsed: unknown = stored ? JSON.parse(stored) : null;
    const fields = parsed && typeof parsed === "object" ? parsed as Partial<BriefFields> : null;
    const valid = fields && Object.keys(initialBriefFields).every((key) => {
      const field = fields[key as keyof BriefFields];
      return field && typeof field.value === "string";
    });
    return valid ? fields as BriefFields : undefined;
  } catch {
    return undefined;
  }
}
