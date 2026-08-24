import Link from "next/link";
import { useEffect, useState } from "react";
import { DsIcon } from "@/components/video-review/DsIcon";
import type { MediaAssetComment, MediaAssetVersion, MediaAssetView, MediaFolder, MediaStorageLocation, MediaTranscriptNote } from "@/data/media";
import type { MediaCapabilities } from "@/lib/media";
import { formatMediaBytes, formatMediaDuration } from "@/lib/media";
import { MediaAssetActions } from "./MediaAssetCard";
import { MediaPreview } from "./MediaPreview";

export type MediaAssetDrawerTab = "details" | "comments" | "transcript" | "versions";
type Props = {
  asset: MediaAssetView;
  projectName: string;
  folders: MediaFolder[];
  versions: MediaAssetVersion[];
  comments: MediaAssetComment[];
  transcriptNotes: MediaTranscriptNote[];
  storageLocations: MediaStorageLocation[];
  capabilities: MediaCapabilities;
  globalScope: boolean;
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
const tabs: { id: MediaAssetDrawerTab; label: string }[] = [{ id: "details", label: "Details" }, { id: "comments", label: "Comments" }, { id: "transcript", label: "Transcript" }, { id: "versions", label: "Versions" }];

export function MediaAssetDrawer(props: Props) {
  const [draftName, setDraftName] = useState(props.asset.name);
  const [commentDraft, setCommentDraft] = useState("");
  useEffect(() => { setDraftName(props.asset.name); setCommentDraft(""); }, [props.asset.id, props.asset.name]);
  const assetComments = props.comments.filter((comment) => comment.assetId === props.asset.id);
  const assetVersions = props.versions.filter((version) => version.assetId === props.asset.id).toSorted((a, b) => b.number - a.number);
  const notes = props.transcriptNotes.filter((note) => note.assetId === props.asset.id);
  return <aside className="media-inspector" aria-label={`Inspect ${props.asset.name}`}>
    <div className="media-inspector-header"><input className="media-inspector-name" value={draftName} aria-label="Filename" readOnly={!props.capabilities.canMoveAssets} onChange={(event) => setDraftName(event.target.value)} onBlur={() => props.onRename(props.asset.id, draftName)} onKeyDown={(event) => { if (event.key === "Enter") event.currentTarget.blur(); }} /><button className="media-icon-button" type="button" aria-label="Close asset drawer" data-tooltip="Close" onClick={props.onClose}><DsIcon name="x-close-cross" size={18} /></button></div>
    <MediaAssetActions asset={props.asset} capabilities={props.capabilities} onComment={props.onComment} onTranscript={props.onTranscript} onShare={props.onShare} onDownload={props.onDownload} onDelete={props.onDelete} onArchive={props.onArchive} onRestore={props.onRestore} onRetry={props.onRetry} />
    <MediaPreview asset={props.asset} onRetry={() => props.onRetry(props.asset)} />
    <div className="media-inspector-tabs" role="tablist" aria-label="Asset information">{tabs.map((tab) => <button className={`label-xs-semibold ${props.activeTab === tab.id ? "is-active" : ""}`} type="button" role="tab" key={tab.id} aria-selected={props.activeTab === tab.id} onClick={() => props.onTabChange(tab.id)}>{tab.label}</button>)}</div>
    <div className="media-inspector-body" role="tabpanel">
      {props.activeTab === "details" ? <Details asset={props.asset} projectName={props.projectName} folders={props.folders} storageLocations={props.storageLocations} globalScope={props.globalScope} showTechnicalStorage={props.capabilities.canViewStorage} /> : null}
      {props.activeTab === "comments" ? <><div className="media-comment-thread">{assetComments.length ? assetComments.map((comment) => <article className={`media-comment is-${comment.audience}`} key={comment.id}><div><strong className="label-s-semibold">{comment.authorName}</strong><span className="media-comment-tag label-xs-semibold">{comment.audience === "internal" ? "Filmmaker" : "Client"}</span></div>{comment.timecodeSeconds !== undefined ? <button className="media-timecode label-xs-semibold" type="button">{formatMediaDuration(comment.timecodeSeconds)}</button> : null}<p className="label-s">{comment.body}</p></article>) : <p className="media-tab-empty label-s">No comments on this file yet.</p>}</div>{props.capabilities.canComment ? <form className="media-comment-composer" onSubmit={(event) => { event.preventDefault(); props.onAddComment(props.asset.id, commentDraft); setCommentDraft(""); }}><label className="label-xs-semibold" htmlFor="media-comment-draft">Add comment</label><textarea id="media-comment-draft" className="label-s" value={commentDraft} placeholder="Write a comment" onChange={(event) => setCommentDraft(event.target.value)} /><button className="media-primary-button label-s-semibold" type="submit" disabled={!commentDraft.trim()}>Comment</button></form> : null}</> : null}
      {props.activeTab === "transcript" ? props.asset.kind !== "video" && props.asset.kind !== "audio" ? <p className="media-tab-empty label-s">Transcripts are available for video and audio files only.</p> : props.asset.transcriptStatus !== "ready" ? <p className="media-tab-empty label-s">{props.asset.transcriptStatus === "processing" ? "Transcript is processing." : "No transcript is available yet."}</p> : <div className="media-transcript-lines">{notes.map((note) => <button className="media-transcript-line" type="button" key={`${note.assetId}-${note.timecode}`}><span className="media-timecode label-xs-semibold">{note.timecode}</span><span className="label-s">{note.text}</span></button>)}</div> : null}
      {props.activeTab === "versions" ? <div className="media-version-list">{assetVersions.map((version, index) => <div className="media-version-row" key={version.id}><span className="media-version-number label-s-semibold">v{version.number}</span><div><strong className="label-s-semibold">{index === 0 ? "Current version" : props.asset.name}</strong><span className="label-xs">{new Intl.DateTimeFormat("en-AU", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(version.uploadedAt))} · {formatMediaBytes(version.sizeBytes)}</span></div></div>)}</div> : null}
    </div>
  </aside>;
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
