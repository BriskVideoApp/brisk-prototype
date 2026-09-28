"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "../../../../Brisk DS/src/app/components/Button";
import { Input } from "../../../../Brisk DS/src/app/components/Input";
import { usePrototypeState } from "@/components/prototype-state/PrototypeStateContext";
import { usePrototypeViewer } from "@/components/prototype-state/usePrototypeViewer";
import { initialBriefFields, type BriefFields } from "@/data/brief";
import { getNextClientProjectCode } from "@/data/project-naming";
import { getProjectStageHref } from "@/data/project-fixtures";
import { clientNewVideoProject } from "@/data/prototype-scenarios";
import { northStarWorkspaceId, selectScopedClient } from "@/data/prototype-state";

const legacyBriefStorageKey = `brisk-client-first-video-brief-v1:${northStarWorkspaceId}:${clientNewVideoProject.id}`;

export default function ClientStartVideoRoute() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { state, hasHydrated, createClientVideo } = usePrototypeState();
  const viewer = usePrototypeViewer();
  const [name, setName] = useState("");
  const [loadedDraftKey, setLoadedDraftKey] = useState<string | null>(null);
  const clientId = viewer?.role === "Customer" ? viewer.clientId
    : viewer?.role === "Studio Staff" ? searchParams.get("client") : null;
  const client = viewer && clientId
    ? selectScopedClient(state, viewer.workspaceId, clientId)
    : null;
  const isStudioPreview = viewer?.role === "Studio Staff";
  const canStart = Boolean(client && viewer?.role === "Customer" && client.contacts.some((contact) => contact.id === viewer.id && contact.portalAccess !== "Paused")
    && state.invitations.some((invitation) => invitation.userId === viewer.id
      && invitation.clientId === client.id && invitation.workspaceId === viewer.workspaceId
      && invitation.status !== "Expired"));
  const draftStorageKey = canStart && client ? `brisk-client-video-name-draft-v1:${client.workspaceId}:${client.id}` : null;
  const code = client
    ? getNextClientProjectCode(client.badge, state.projects.flatMap((project) => project.code ? [project.code] : []))
    : null;

  useEffect(() => {
    if (!draftStorageKey) return;
    setName(window.localStorage.getItem(draftStorageKey) ?? "");
    setLoadedDraftKey(draftStorageKey);
  }, [draftStorageKey]);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canStart || !client || !viewer || !name.trim()) return;
    const legacyFields = client.id === clientNewVideoProject.clientId ? readLegacyBriefFields() : undefined;
    const project = createClientVideo({ clientId: client.id, userId: viewer.id, name: name.trim(), fields: legacyFields });
    if (!project) return;
    if (draftStorageKey) window.localStorage.removeItem(draftStorageKey);
    if (legacyFields) window.localStorage.removeItem(legacyBriefStorageKey);
    router.push(getProjectStageHref(project.id, "brief"));
  }

  if (!hasHydrated || (draftStorageKey && loadedDraftKey !== draftStorageKey)) return null;
  if ((!canStart && !isStudioPreview) || !client || !code || !viewer) {
    return <main className="client-video-naming-unavailable"><h1 className="headings-s-bold">Start Video unavailable</h1><p className="paragraph-s">Open a Client portal to start a video.</p></main>;
  }

  return (
    <main className="client-video-naming-page">
      <form className="client-video-naming-form" onSubmit={handleSubmit}>
        <span className="label-xs-semibold">START VIDEO</span>
        <h1 className="headings-s-bold">Name your video</h1>
        <p className="paragraph-s">Give this video a name your team will recognise. Its project code will be assigned when you continue.</p>
        {isStudioPreview ? <p className="paragraph-s">Studio preview. Switch to the Client role to create a video here.</p> : null}
        <div className="client-video-naming-fields">
          <div className="client-video-naming-code">
            <span className="label-m-semibold">Project code</span>
            <strong className="label-l-semibold">{code}</strong>
          </div>
          <Input
            id="client-video-name"
            label="Video name"
            placeholder="For example, Customer story"
            value={name}
            onChange={(event) => {
              setName(event.target.value);
              if (draftStorageKey) window.localStorage.setItem(draftStorageKey, event.target.value);
            }}
          />
        </div>
        <p className="paragraph-s client-video-naming-preview">This video will appear as <strong>{code}_{name.trim() || "Video name"}</strong>.</p>
        <div className="client-video-naming-actions">
          <Button type="button" variant="secondary" onClick={() => router.back()}>Cancel</Button>
          <Button type="submit" disabled={isStudioPreview || !name.trim()}>Continue to Brief</Button>
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
