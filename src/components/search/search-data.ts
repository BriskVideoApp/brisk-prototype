import { recoverLegacyScriptDraft } from "@/data/project-legacy-recovery";
import { getProjectFixture } from "@/data/project-fixtures";
import type { PrototypeState } from "@/data/prototype-state";
import { canViewProject, type PrototypeViewer } from "@/data/prototype-access";
import { chatMessages, directMessages, groupMessages, directConversations, groupConversations } from "@/data/chat";
import { isStoredChatState } from "@/components/chat/chat-persistence";
import type { ChatMessage } from "@/components/chat/types";
import type { MediaAssetView } from "@/data/media";
import { scriptVersions, type ScriptComment, type ScriptVersion } from "@/data/script";
import { clientNewScriptVersions, clientNewVideoScriptProject } from "@/data/prototype-scenarios";

export type SearchKind = "Videos" | "Chat" | "Briefs" | "Scripts" | "Media" | "People" | "Clients" | "Brand Kits" | "Expenses" | "Pages";
export type SearchEntry = {
  id: string;
  source: string;
  kind: SearchKind;
  title: string;
  text: string;
  meta: string;
  href: string;
  projectId?: string;
  conversationId?: string;
  onSelect?: () => void;
};

/** Read-only. Searching never restores, migrates or saves a document. */
function readSaved(key: string): unknown {
  try { return JSON.parse(window.localStorage.getItem(key) ?? "null") as unknown; }
  catch { return null; }
}

function readScriptVersions(key: string): { versions: ScriptVersion[]; selectedVersionId: string; comments: ScriptComment[] } | null {
  const saved = readSaved(key);
  if (!saved || typeof saved !== "object") return null;
  const draft = saved as { versions?: ScriptVersion[]; selectedVersionId?: string; comments?: ScriptComment[] };
  if (!Array.isArray(draft.versions) || typeof draft.selectedVersionId !== "string") return null;
  if (!draft.versions.every((version) => typeof version.id === "string" && Array.isArray(version.rows)
    && version.rows.every((row) => typeof row.id === "string" && typeof row.words === "string" && typeof row.visuals === "string"))) return null;
  return { versions: draft.versions, selectedVersionId: draft.selectedVersionId, comments: Array.isArray(draft.comments) ? draft.comments : [] };
}

export function buildSearchEntries(state: PrototypeState, viewer: PrototypeViewer | null, assets: MediaAssetView[], timing: ChatMessage[]): SearchEntry[] {
  if (!viewer) return [];
  const projects = state.projects.filter((project) => canViewProject(viewer, project, state));
  const projectIds = new Set(projects.map((project) => project.id));
  const entries: SearchEntry[] = [];
  for (const project of projects) {
    const meta = `${project.clientName} · ${project.name}`;
    entries.push({ id: `video:${project.id}`, source: "videos", kind: "Videos", title: project.name,
      text: `${project.name} ${project.clientName} ${project.clientBadge}`, meta: project.clientName,
      href: `/active-videos?project=${encodeURIComponent(project.id)}`, projectId: project.id });
    const brief = state.projectBriefSnapshots.find((snapshot) => snapshot.projectId === project.id && snapshot.workspaceId === viewer.workspaceId);
    for (const field of Object.values(brief?.fields ?? {})) {
      if (!field.value.trim() || brief?.configuration.excludedFieldIds.includes(field.id)) continue;
      entries.push({ id: `brief:${project.id}:${field.id}`, source: `brief:${project.id}`, kind: "Briefs", title: field.label,
        text: field.value, meta, projectId: project.id,
        href: `/projects/${encodeURIComponent(project.id)}/stages/brief?searchField=${field.id}` });
    }
    const isolated = project.id !== "harbour-health-care-journey" && project.id !== clientNewVideoScriptProject.id && Boolean(getProjectFixture(project.id));
    const current = readScriptVersions(`brisk-script-draft-${isolated ? "v2" : "v1"}:${viewer.workspaceId}:${project.id}`);
    const old = isolated ? readScriptVersions(`brisk-script-draft-v1:${viewer.workspaceId}:${project.id}`) : null;
    let legacy: typeof old = null;
    try { legacy = old ? recoverLegacyScriptDraft(old) : null; } catch { /* Ignore an unreadable legacy draft. */ }
    const saved = current ?? legacy;
    const versions = saved?.versions ?? (project.id === "harbour-health-care-journey" ? scriptVersions
      : project.id === clientNewVideoScriptProject.id ? clientNewScriptVersions : []);
    const version = versions.find((candidate) => candidate.id === saved?.selectedVersionId) ?? versions.at(-1);
    version?.rows.filter((row) => !row.deletedMeta).forEach((row, index) => {
      if (!row.words.trim() && !row.visuals.trim()) return;
      entries.push({ id: `script:${project.id}:${row.id}`, source: `script:${project.id}`, kind: "Scripts",
        title: `Row ${index + 1}`, text: `${row.words} ${row.visuals}`, meta: `${meta} · ${version.label}`,
        projectId: project.id, href: `/projects/${encodeURIComponent(project.id)}/script?searchRow=${encodeURIComponent(row.id)}&version=${encodeURIComponent(version.id)}` });
    });
  }
  const savedChat = readSaved(`brisk-chat-v1:${viewer.workspaceId}`);
  const chat = isStoredChatState(savedChat) ? savedChat : {
    messages: [...chatMessages, ...directMessages, ...groupMessages], dmConversations: directConversations, groupConversations,
  };
  const conversations = [...chat.dmConversations, ...chat.groupConversations].filter((conversation) => conversation.memberIds.includes(viewer.chatUserId));
  const byId = new Map([...chat.messages, ...timing].map((message) => [message.id, message]));
  for (const message of byId.values()) {
    if (message.deletedAt || typeof message.body !== "string") continue;
    const project = projects.find((candidate) => candidate.id === message.projectId);
    const conversation = conversations.find((candidate) => candidate.id === message.projectId);
    if (!project && !conversation) continue;
    if (project && viewer.role === "Customer" && message.channel !== "external") continue;
    entries.push({ id: `chat:${message.id}`, source: `chat:${message.projectId}`, kind: "Chat", title: conversation?.title ?? project?.name ?? "Chat",
      text: `${message.body} ${message.attachments.map((attachment) => attachment.name).join(" ")}`,
      meta: conversation ? "Private conversation" : `${project?.clientName} · ${message.channel === "internal" ? "Internal" : "External"} Chat`,
      projectId: project?.id, conversationId: message.projectId,
      href: `/chat?message=${encodeURIComponent(message.id)}${project ? `&project=${encodeURIComponent(project.id)}` : ""}` });
  }
  for (const asset of assets) {
    if (!projectIds.has(asset.projectId)) continue;
    const project = projects.find((candidate) => candidate.id === asset.projectId)!;
    entries.push({ id: `media:${asset.id}`, source: "media", kind: "Media", title: asset.name, text: `${asset.name} ${project.name} ${project.clientName}`,
      meta: `${project.clientName} · ${project.name}${asset.archivedAt ? " · Archived" : ""}`, projectId: project.id,
      href: `/projects/${encodeURIComponent(project.id)}/stages/media?asset=${encodeURIComponent(asset.id)}` });
  }
  return entries;
}

export function searchEntries(entries: SearchEntry[], query: string, includeContext = true): SearchEntry[] {
  const terms = query.trim().toLocaleLowerCase("en-AU").split(/\s+/u).filter(Boolean);
  if (!terms.length) return [];
  return entries.filter((entry) => terms.every((term) => `${entry.title} ${entry.text} ${includeContext ? entry.meta : ""}`.toLocaleLowerCase("en-AU").includes(term)))
    .sort((a, b) => Number(b.title.toLocaleLowerCase("en-AU").includes(query.toLocaleLowerCase("en-AU"))) - Number(a.title.toLocaleLowerCase("en-AU").includes(query.toLocaleLowerCase("en-AU"))));
}

export function matchesSearchText(text: string, query: string): boolean {
  const normalised = text.toLocaleLowerCase("en-AU");
  return query.trim().toLocaleLowerCase("en-AU").split(/\s+/u).filter(Boolean).every((term) => normalised.includes(term));
}
