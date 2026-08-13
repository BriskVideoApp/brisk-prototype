"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "../../../Brisk DS/src/app/components/Button";
import { Input } from "../../../Brisk DS/src/app/components/Input";
import type { Project, ProjectFileLocation } from "@/components/active-videos/types";
import { usePrototypeRole } from "@/components/navigation/PrototypeRoleContext";
import { useProjectFiles } from "@/components/project/ProjectFilesContext";
import { ProjectStageHeader } from "@/components/project/ProjectStageHeader";
import { DsIcon } from "@/components/video-review/DsIcon";
import {
  formatFileLocationDate,
  formatFileLocationRelativeDate,
  getFileLocationDisplayLabel,
  getFileLocationHref,
  getFileLocationOpenLabel,
  getFileLocationUserName,
} from "@/lib/project-files";

const currentFileUserByRole = {
  "Studio Staff": { id: "user-tom", name: "Tom Editor" },
  "Studio Freelancer": { id: "user-jordan", name: "Jordan Lee" },
  Customer: { id: "user-jess", name: "Jess Taylor" },
} as const;

export function ProjectFilesPage({ project }: { project: Project }) {
  const router = useRouter();
  const { allPages, hasLoadedRole, selectedRole } = usePrototypeRole();
  const { addFileLocation, fileLocationsByProjectId, removeFileLocation, updateFileLocation } = useProjectFiles();
  const locations = fileLocationsByProjectId[project.id] ?? [];
  const canManage = selectedRole === "Studio Staff";
  const currentUser = currentFileUserByRole[selectedRole];
  const [isAdding, setIsAdding] = useState(false);

  useEffect(() => {
    if (hasLoadedRole && selectedRole === "Customer" && !allPages) {
      router.replace(`/projects/${project.id}/stages/brief`);
    }
  }, [allPages, hasLoadedRole, project.id, router, selectedRole]);

  if (!hasLoadedRole || (selectedRole === "Customer" && !allPages)) return null;

  const saveNewLocation = (url: string, label: string) => {
    const trimmedUrl = url.trim();
    if (!trimmedUrl) return;

    const now = new Date().toISOString();
    addFileLocation(project.id, {
      url: trimmedUrl,
      label: label.trim() || undefined,
      notes: undefined,
      last_confirmed_at: null,
      last_confirmed_by: null,
      created_at: now,
      created_by: currentUser.id,
      updated_at: now,
      updated_by: currentUser.id,
    });
    setIsAdding(false);
  };

  const updateLocation = (index: number, nextLocation: ProjectFileLocation) => {
    updateFileLocation(project.id, index, nextLocation);
  };

  const removeLocation = (index: number) => {
    const shouldRemove = window.confirm(
      "Remove this file location? The files aren't deleted - just the link from Brisk.",
    );

    if (shouldRemove) removeFileLocation(project.id, index);
  };

  return (
    <main className="project-files-shell">
      <div className="project-files-main">
        <ProjectStageHeader activeUtility="files" project={project} />
        <section className="project-files-content" aria-labelledby="project-files-heading">
          <div className="project-files-heading-row">
            <div>
              <span className="project-files-kicker label-xs-semibold">PROJECT UTILITY</span>
              <h1 id="project-files-heading">Project Files</h1>
              <p className="label-s">Links to the external storage your team already uses.</p>
            </div>
            {locations.length > 0 ? (
              <span className="project-files-count label-xs-semibold">
                {locations.length} {locations.length === 1 ? "location" : "locations"}
              </span>
            ) : null}
          </div>

          {locations.length === 0 ? (
            <section className="project-files-empty" aria-label="No file locations">
              <span className="project-files-empty-icon" aria-hidden="true">
                <DsIcon name="folder-plus" size={24} />
              </span>
              <h2>No file location set yet</h2>
              <p className="label-s">
                Paste a link to where the project files live. Can be a Shade link, Dropbox URL, LucidLink path, or anything else your team uses.
              </p>
              {canManage ? <FileLocationForm submitLabel="Save location" onSubmit={saveNewLocation} /> : null}
            </section>
          ) : (
            <div className="project-file-location-list">
              {locations.map((location, index) => (
                <FileLocationCard
                  canManage={canManage}
                  currentUserId={currentUser.id}
                  index={index}
                  key={`${location.created_at}-${index}`}
                  location={location}
                  onRemove={() => removeLocation(index)}
                  onUpdate={(nextLocation) => updateLocation(index, nextLocation)}
                />
              ))}
            </div>
          )}

          {canManage && locations.length > 0 ? (
            isAdding ? (
              <section className="project-files-add-panel" aria-label="Add another file location">
                <div className="project-files-add-heading">
                  <h2>Add another location</h2>
                  <button className="project-files-text-action label-s-semibold" type="button" onClick={() => setIsAdding(false)}>
                    Cancel
                  </button>
                </div>
                <FileLocationForm submitLabel="Save location" onSubmit={saveNewLocation} />
              </section>
            ) : (
              <Button size="S" type="button" variant="secondary" className="project-files-add-button" onClick={() => setIsAdding(true)}>
                <DsIcon name="plus" size={16} />
                Add another location
              </Button>
            )
          ) : null}
        </section>
      </div>
    </main>
  );
}

function FileLocationCard({
  canManage,
  currentUserId,
  index,
  location,
  onRemove,
  onUpdate,
}: {
  canManage: boolean;
  currentUserId: string;
  index: number;
  location: ProjectFileLocation;
  onRemove: () => void;
  onUpdate: (location: ProjectFileLocation) => void;
}) {
  const [hasCopied, setHasCopied] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [notesDraft, setNotesDraft] = useState(location.notes ?? "");
  const addedBy = getFileLocationUserName(location.created_by) ?? "Unknown user";
  const confirmedBy = getFileLocationUserName(location.last_confirmed_by);

  useEffect(() => {
    setNotesDraft(location.notes ?? "");
  }, [location.notes]);

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(location.url);
      setHasCopied(true);
      window.setTimeout(() => setHasCopied(false), 1400);
    } catch {
      setHasCopied(false);
    }
  };

  const markConfirmed = () => {
    const now = new Date().toISOString();
    onUpdate({
      ...location,
      last_confirmed_at: now,
      last_confirmed_by: currentUserId,
      updated_at: now,
      updated_by: currentUserId,
    });
  };

  const saveLocationEdit = (url: string, label: string) => {
    const trimmedUrl = url.trim();
    if (!trimmedUrl) return;

    onUpdate({
      ...location,
      url: trimmedUrl,
      label: label.trim() || undefined,
      updated_at: new Date().toISOString(),
      updated_by: currentUserId,
    });
    setIsEditing(false);
  };

  const saveNotes = () => {
    const nextNotes = notesDraft.trim();
    if (nextNotes === (location.notes ?? "")) return;

    onUpdate({
      ...location,
      notes: nextNotes || undefined,
      updated_at: new Date().toISOString(),
      updated_by: currentUserId,
    });
  };

  return (
    <article className="project-file-location-card">
      <div className="project-file-location-heading">
        <div className="project-file-location-title">
          <span className="project-file-location-number label-xs-semibold">{index + 1}</span>
          <div>
            <h2>{getFileLocationDisplayLabel(location)}</h2>
            <span className="project-file-location-url label-xs">{location.url}</span>
          </div>
        </div>
        {canManage ? (
          <div className="project-file-location-edit-actions">
            <button className="project-files-text-action label-s-semibold" type="button" onClick={() => setIsEditing((current) => !current)}>
              Edit
            </button>
            <button className="project-files-text-action is-remove label-s-semibold" type="button" onClick={onRemove}>
              Remove
            </button>
          </div>
        ) : null}
      </div>

      {isEditing ? (
        <div className="project-file-location-edit-form">
          <FileLocationForm
            initialLabel={location.label ?? ""}
            initialUrl={location.url}
            submitLabel="Save changes"
            onSubmit={saveLocationEdit}
          />
          <button className="project-files-text-action label-s-semibold" type="button" onClick={() => setIsEditing(false)}>
            Cancel editing
          </button>
        </div>
      ) : (
        <div className="project-file-location-open-actions">
          <a
            className="project-files-open-button label-s-semibold"
            href={getFileLocationHref(location.url)}
            target="_blank"
            rel="noopener"
          >
            <DsIcon name="folder-open" size={18} />
            {getFileLocationOpenLabel(location)}
          </a>
          <Button size="S" type="button" variant="secondary" className="project-files-copy-button" onClick={copyLink}>
            <DsIcon name={hasCopied ? "check" : "copy"} size={16} />
            {hasCopied ? "Copied" : "Copy link"}
          </Button>
        </div>
      )}

      <p className="project-file-location-meta label-xs">
        Added by {addedBy} · {formatFileLocationRelativeDate(location.created_at)} · Last confirmed working: {formatFileLocationDate(location.last_confirmed_at)}
        {confirmedBy ? ` by ${confirmedBy}` : ""}
      </p>
      <button className="project-files-confirm-action label-s-semibold" type="button" onClick={markConfirmed}>
        <DsIcon name="check-circle" size={16} />
        Mark as confirmed working
      </button>

      <label className="project-file-location-notes">
        <span className="label-xs-semibold">Notes</span>
        {canManage ? (
          <textarea
            className="label-s"
            rows={3}
            value={notesDraft}
            placeholder="Editor notes on file structure - e.g. renders live in /04_Exports"
            onBlur={saveNotes}
            onChange={(event) => setNotesDraft(event.target.value)}
          />
        ) : (
          <span className={`project-file-location-notes-readonly label-s ${location.notes ? "" : "is-empty"}`}>
            {location.notes || "No file structure notes yet."}
          </span>
        )}
      </label>
    </article>
  );
}

function FileLocationForm({
  initialLabel = "",
  initialUrl = "",
  submitLabel,
  onSubmit,
}: {
  initialLabel?: string;
  initialUrl?: string;
  submitLabel: string;
  onSubmit: (url: string, label: string) => void;
}) {
  const [url, setUrl] = useState(initialUrl);
  const [label, setLabel] = useState(initialLabel);

  const submit = () => {
    if (!url.trim()) return;
    onSubmit(url, label);
    setUrl("");
    setLabel("");
  };

  return (
    <div className="project-file-location-form">
      <Input
        label="Link or path"
        placeholder="Paste a URL or file path"
        size="M"
        type="text"
        value={url}
        onChange={(event) => setUrl(event.target.value)}
      />
      <Input
        label="Label (optional)"
        placeholder="e.g. Working files"
        size="M"
        type="text"
        value={label}
        onChange={(event) => setLabel(event.target.value)}
      />
      <div className="project-file-location-form-action">
        <Button size="S" type="button" variant="primary" onClick={submit}>
          {submitLabel}
        </Button>
      </div>
    </div>
  );
}
