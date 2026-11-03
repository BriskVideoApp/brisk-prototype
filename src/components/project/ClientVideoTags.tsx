"use client";

import { useState } from "react";
import { ProjectTags } from "@/components/project/ProjectTags";
import { usePrototypeState } from "@/components/prototype-state/PrototypeStateContext";
import { usePrototypeViewer } from "@/components/prototype-state/usePrototypeViewer";
import { canActOnProject, canViewProject } from "@/data/prototype-access";
import type { TagClass } from "@/data/project-tags";

export function ClientVideoTags({ projectId, projectName }: { projectId: string; projectName: string }) {
  const { state, updateClientVideoTag } = usePrototypeState();
  const viewer = usePrototypeViewer();
  const [isOpen, setIsOpen] = useState(false);
  const workspaceId = state.session.activeWorkspaceId;
  const project = state.projects.find((item) => item.id === projectId && item.workspaceId === workspaceId);
  if (!project || !canViewProject(viewer, project, state)) return null;
  const collection = state.clientVideoTags?.find((item) => item.workspaceId === workspaceId && item.clientId === project.clientId);
  const canEdit = (viewer?.role === "Customer" && viewer.clientId === project.clientId)
    || (viewer?.role === "Studio Staff" && canActOnProject(viewer, project, state, "edit"));
  const tags = collection?.projectTags[projectId] ?? [];

  function update(tag: string, colour?: TagClass, remove = false) {
    if (!canEdit || !project) return;
    updateClientVideoTag(project.clientId, projectId, tag, colour, remove);
    setIsOpen(false);
  }

  return <ProjectTags projectName={projectName} tags={tags}
    tagOptions={Object.keys(collection?.colours ?? {})} tagClasses={collection?.colours ?? {}}
    isTagMenuOpen={isOpen && canEdit} onToggleTagMenu={() => setIsOpen((open) => !open)}
    onAddTag={(tag) => update(tag)} onRemoveTag={(tag) => update(tag, undefined, true)}
    onCreateTag={update} readOnly={!canEdit} showAddAction />;
}
