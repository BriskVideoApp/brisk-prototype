import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { KeyboardEvent } from "react";
import { DsIcon } from "@/components/video-review/DsIcon";
import type { MediaAssetComment, MediaAssetView, MediaFolder, MediaStorageLocation, MediaTranscriptNote } from "@/data/media";
import type { MediaCapabilities } from "@/lib/media";
import { formatMediaBytes, formatMediaDuration } from "@/lib/media";
import { MediaAssetActions } from "./MediaAssetCard";
import { MediaPreview } from "./MediaPreview";

export type MediaAssetDrawerTab = "details" | "comments" | "transcript";
export type MediaMentionOption = { id: string; label: string; kind: "person" | "project" };
type Props = {
  asset: MediaAssetView;
  projectName: string;
  folders: MediaFolder[];
  comments: MediaAssetComment[];
  transcriptNotes: MediaTranscriptNote[];
  storageLocations: MediaStorageLocation[];
  capabilities: MediaCapabilities;
  globalScope: boolean;
  mentionOptions: MediaMentionOption[];
  activeTab: MediaAssetDrawerTab;
  onTabChange: (tab: MediaAssetDrawerTab) => void;
  onRename: (id: string, name: string) => void;
  onClose: () => void;
  onComment: (asset: MediaAssetView) => void;
  onTranscript: (asset: MediaAssetView) => void;
  onShare: (asset: MediaAssetView) => void;
  onDownload: (asset: MediaAssetView) => void;
  onDelete: (asset: MediaAssetView) => void;
  onArchive: (asset: MediaAssetView) => void;
  onRestore: (asset: MediaAssetView) => void;
  onRetry: (asset: MediaAssetView) => void;
  onAddComment: (assetId: string, body: string) => void;
};
const tabs: { id: MediaAssetDrawerTab; label: string }[] = [{ id: "details", label: "Details" }, { id: "comments", label: "Comments" }, { id: "transcript", label: "Transcript" }];

export function MediaAssetDrawer(props: Props) {
  const [draftName, setDraftName] = useState(props.asset.name);
  const [commentDraft, setCommentDraft] = useState("");
  useEffect(() => { setDraftName(props.asset.name); setCommentDraft(""); }, [props.asset.id, props.asset.name]);
  const assetComments = props.comments.filter((comment) => comment.assetId === props.asset.id);
  const notes = props.transcriptNotes.filter((note) => note.assetId === props.asset.id);
  return <aside className="media-inspector" aria-label={`Inspect ${props.asset.name}`}>
    <div className="media-inspector-header"><input className="media-inspector-name" value={draftName} aria-label="Filename" readOnly={!props.capabilities.canMoveAssets} onChange={(event) => setDraftName(event.target.value)} onBlur={() => props.onRename(props.asset.id, draftName)} onKeyDown={(event) => { if (event.key === "Enter") event.currentTarget.blur(); }} /><button className="media-icon-button" type="button" aria-label="Close asset drawer" data-tooltip="Close" onClick={props.onClose}><DsIcon name="x-close-cross" size={18} /></button></div>
    <MediaAssetActions asset={props.asset} capabilities={props.capabilities} onComment={props.onComment} onTranscript={props.onTranscript} onShare={props.onShare} onDownload={props.onDownload} onDelete={props.onDelete} onArchive={props.onArchive} onRestore={props.onRestore} onRetry={props.onRetry} />
    <MediaPreview asset={props.asset} onRetry={() => props.onRetry(props.asset)} />
    <div className="media-inspector-tabs" role="tablist" aria-label="Asset information">{tabs.map((tab) => <button className={`label-xs-semibold ${props.activeTab === tab.id ? "is-active" : ""}`} type="button" role="tab" key={tab.id} aria-selected={props.activeTab === tab.id} onClick={() => props.onTabChange(tab.id)}>{tab.label}</button>)}</div>
    <div className="media-inspector-body" role="tabpanel">
      {props.activeTab === "details" ? <Details asset={props.asset} projectName={props.projectName} folders={props.folders} storageLocations={props.storageLocations} globalScope={props.globalScope} showTechnicalStorage={props.capabilities.canViewStorage} /> : null}
      {props.activeTab === "comments" ? <><div className="media-comment-thread">{assetComments.length ? assetComments.map((comment) => <article className={`media-comment is-${comment.audience}`} key={comment.id}><div><strong className="label-s-semibold">{comment.authorName}</strong><span className="media-comment-tag label-xs-semibold">{comment.audience === "internal" ? "Filmmaker" : "Client"}</span></div>{comment.timecodeSeconds !== undefined ? <button className="media-timecode label-xs-semibold" type="button">{formatMediaDuration(comment.timecodeSeconds)}</button> : null}<p className="label-s">{comment.body}</p></article>) : <p className="media-tab-empty label-s">No comments on this file yet.</p>}</div>{props.capabilities.canComment ? <MediaCommentComposer assetId={props.asset.id} mentionOptions={props.mentionOptions} onSubmit={props.onAddComment} /> : null}</> : null}
      {props.activeTab === "transcript" ? props.asset.kind !== "video" && props.asset.kind !== "audio" ? <p className="media-tab-empty label-s">Transcripts are available for video and audio files only.</p> : props.asset.transcriptStatus !== "ready" ? <p className="media-tab-empty label-s">{props.asset.transcriptStatus === "processing" ? "Transcript is processing." : "No transcript is available yet."}</p> : <div className="media-transcript-lines">{notes.map((note) => <button className="media-transcript-line" type="button" key={`${note.assetId}-${note.timecode}`}><span className="media-timecode label-xs-semibold">{note.timecode}</span><span className="label-s">{note.text}</span></button>)}</div> : null}
    </div>
  </aside>;
}

function MediaCommentComposer({ assetId, mentionOptions, onSubmit }: { assetId: string; mentionOptions: MediaMentionOption[]; onSubmit: (assetId: string, body: string) => void }) {
  const [draft, setDraft] = useState("");
  const [cursor, setCursor] = useState(0);
  const [isMentionMenuOpen, setIsMentionMenuOpen] = useState(false);
  const [selectedMentionIndex, setSelectedMentionIndex] = useState(0);
  const [pendingCursor, setPendingCursor] = useState<number | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const mention = getActiveMention(draft, cursor);
  const suggestions = mention && isMentionMenuOpen
    ? mentionOptions.filter((option) => option.label.toLowerCase().includes(mention.query.toLowerCase())).slice(0, 6)
    : [];

  useEffect(() => {
    if (pendingCursor === null) return;
    textareaRef.current?.focus();
    textareaRef.current?.setSelectionRange(pendingCursor, pendingCursor);
    setCursor(pendingCursor);
    setPendingCursor(null);
  }, [pendingCursor]);

  useEffect(() => {
    setSelectedMentionIndex((current) => Math.min(current, Math.max(0, suggestions.length - 1)));
  }, [suggestions.length]);

  const postComment = () => {
    if (!draft.trim()) return;
    onSubmit(assetId, draft);
    setDraft("");
    setCursor(0);
    setIsMentionMenuOpen(false);
  };

  const chooseMention = (option: MediaMentionOption) => {
    if (!mention) return;
    const nextDraft = `${draft.slice(0, mention.start)}@${option.label} ${draft.slice(cursor)}`;
    const nextCursor = mention.start + option.label.length + 2;
    setDraft(nextDraft);
    setPendingCursor(nextCursor);
    setIsMentionMenuOpen(false);
  };

  const updateCursor = (nextCursor: number) => {
    setCursor(nextCursor);
    setIsMentionMenuOpen(Boolean(getActiveMention(draft, nextCursor)));
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
      event.preventDefault();
      postComment();
      return;
    }
    if (suggestions.length === 0) return;
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setSelectedMentionIndex((current) => (current + 1) % suggestions.length);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setSelectedMentionIndex((current) => (current - 1 + suggestions.length) % suggestions.length);
    } else if (event.key === "Enter" || event.key === "Tab") {
      event.preventDefault();
      chooseMention(suggestions[selectedMentionIndex]);
    } else if (event.key === "Escape") {
      event.preventDefault();
      setIsMentionMenuOpen(false);
    }
  };

  return <form className="media-comment-composer" onSubmit={(event) => { event.preventDefault(); postComment(); }}>
    <label className="label-xs-semibold" htmlFor="media-comment-draft">Add comment</label>
    <div className="media-comment-input-wrap">
      <textarea
        ref={textareaRef}
        id="media-comment-draft"
        className="label-s"
        value={draft}
        placeholder="Write a comment"
        onChange={(event) => {
          setDraft(event.target.value);
          const nextCursor = event.target.selectionStart ?? event.target.value.length;
          setCursor(nextCursor);
          setSelectedMentionIndex(0);
          setIsMentionMenuOpen(Boolean(getActiveMention(event.target.value, nextCursor)));
        }}
        onClick={(event) => updateCursor(event.currentTarget.selectionStart ?? 0)}
        onKeyUp={(event) => {
          if (["Enter", "Tab", "Escape"].includes(event.key)) return;
          updateCursor(event.currentTarget.selectionStart ?? 0);
        }}
        onKeyDown={handleKeyDown}
        aria-controls={suggestions.length ? "media-mention-list" : undefined}
        aria-expanded={suggestions.length > 0}
      />
      {suggestions.length ? <div className="media-mention-list" id="media-mention-list" role="listbox" aria-label="Mention suggestions">
        {suggestions.map((option, index) => <button className={`media-mention-option ${index === selectedMentionIndex ? "is-selected" : ""}`} type="button" role="option" aria-selected={index === selectedMentionIndex} key={option.id} onMouseDown={(event) => { event.preventDefault(); chooseMention(option); }}><span className="media-mention-option-mark" aria-hidden="true">{option.kind === "person" ? "@" : "#"}</span><span><strong className="label-s-semibold">{option.label}</strong><small className="label-xs">{option.kind === "person" ? "Person" : "Project"}</small></span></button>)}
      </div> : null}
    </div>
    <p className="media-comment-hint label-xs">Type @ to mention people or projects · Cmd+Enter to post</p>
    <button className="media-primary-button label-s-semibold" type="submit" disabled={!draft.trim()}>Comment</button>
  </form>;
}

function getActiveMention(value: string, cursor: number) {
  const beforeCursor = value.slice(0, cursor);
  const match = /(?:^|\s)@([^\s@]*)$/u.exec(beforeCursor);
  if (!match) return null;
  return { query: match[1], start: cursor - match[1].length - 1 };
}

function Details({ asset, projectName, folders, storageLocations, globalScope, showTechnicalStorage }: { asset: MediaAssetView; projectName: string; folders: MediaFolder[]; storageLocations: MediaStorageLocation[]; globalScope: boolean; showTechnicalStorage: boolean }) {
  const displayFolderId = asset.folderId ?? asset.archivedFolderId;
  const values: [string, string][] = [["Kind", asset.kind], ["Size", formatMediaBytes(asset.sizeBytes)], ...(asset.durationSeconds !== undefined ? [["Duration", formatMediaDuration(asset.durationSeconds)] as [string, string]] : []), ["Uploaded", new Intl.DateTimeFormat("en-AU", { day: "2-digit", month: "long", year: "numeric" }).format(new Date(asset.uploadedAt))], ["Uploaded by", asset.uploadedByName], ["Project", projectName], [asset.archivedAt ? "Previous folder" : "Folder", folders.find((folder) => folder.id === displayFolderId)?.name ?? "All media"], ["Storage location", storageLocations.find((location) => location.id === asset.storageLocationId)?.label ?? "Brisk Storage"], ["Original", asset.originalAvailable ? "Available" : "Original file unavailable"], ["Playback", playbackStatus(asset.status)], ...(showTechnicalStorage ? [["Source location", asset.sourceLocationLabel] as [string, string], ["Provider file ID", asset.providerFileId] as [string, string], ...(asset.muxPlaybackId ? [["Playback ID", asset.muxPlaybackId] as [string, string]] : [])] : [])];
  return <dl className="media-detail-list">{values.map(([label, value]) => <div key={label}><dt className="label-xs">{label}</dt><dd className="label-s-semibold">{value}</dd></div>)}{asset.linkedScriptRowId ? <div><dt className="label-xs">Linked script row</dt><dd><Link className="media-inline-link label-s-semibold" href={`/projects/${asset.projectId}/script#${asset.linkedScriptRowId}`}>{asset.linkedScriptRowId}</Link></dd></div> : null}{globalScope ? <div><dt className="label-xs">Project link</dt><dd><Link className="media-inline-link label-s-semibold" href={`/projects/${asset.projectId}/stages/media`}>Open project media</Link></dd></div> : null}</dl>;
}

function playbackStatus(status: MediaAssetView["status"]) {
  if (status === "uploading") return "Uploading";
  if (status === "stored") return "Original stored";
  if (status === "preparing") return "Preparing playback";
  if (status === "failed") return "Failed - retry";
  return "Ready";
}
