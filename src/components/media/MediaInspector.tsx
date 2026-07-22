import { useEffect, useMemo, useState } from "react";
import { DsIcon } from "@/components/video-review/DsIcon";
import type { MediaAsset, MediaFolder, MediaTranscriptNote } from "@/data/media";
import { MediaAssetActions, MediaThumbnail } from "./MediaAssetCard";

export type MediaInspectorTab = "details" | "comments" | "transcript" | "versions";

type MediaInspectorProps = {
  asset: MediaAsset;
  folders: MediaFolder[];
  transcriptNotes: MediaTranscriptNote[];
  activeTab: MediaInspectorTab;
  onTabChange: (tab: MediaInspectorTab) => void;
  onRename: (assetId: string, name: string) => void;
  onClose: () => void;
  onComment: (asset: MediaAsset) => void;
  onTranscript: (asset: MediaAsset) => void;
  onShare: (asset: MediaAsset) => void;
  onDownload: (asset: MediaAsset) => void;
  onDelete: (asset: MediaAsset) => void;
};

const tabs: { id: MediaInspectorTab; label: string }[] = [
  { id: "details", label: "Details" },
  { id: "comments", label: "Comments" },
  { id: "transcript", label: "Transcript" },
  { id: "versions", label: "Versions" },
];

export function MediaInspector(props: MediaInspectorProps) {
  const [draftName, setDraftName] = useState(props.asset.name);

  useEffect(() => {
    setDraftName(props.asset.name);
  }, [props.asset.id, props.asset.name]);

  return (
    <aside className="media-inspector" aria-label={`Inspect ${props.asset.name}`}>
      <div className="media-inspector-header">
        <input
          className="media-inspector-name"
          value={draftName}
          aria-label="Filename"
          onChange={(event) => setDraftName(event.target.value)}
          onBlur={() => props.onRename(props.asset.id, draftName)}
          onKeyDown={(event) => {
            if (event.key === "Enter") event.currentTarget.blur();
          }}
        />
        <button className="media-icon-button" type="button" aria-label="Close inspector" data-tooltip="Close" onClick={props.onClose}>
          <DsIcon name="x-close-cross" size={18} />
        </button>
      </div>
      <MediaAssetActions
        asset={props.asset}
        onComment={props.onComment}
        onTranscript={props.onTranscript}
        onShare={props.onShare}
        onDownload={props.onDownload}
        onDelete={props.onDelete}
      />
      <InspectorPreview asset={props.asset} />
      <div className="media-inspector-tabs" role="tablist" aria-label="Asset information">
        {tabs.map((tab) => (
          <button
            className={`label-xs-semibold ${props.activeTab === tab.id ? "is-active" : ""}`}
            type="button"
            role="tab"
            key={tab.id}
            aria-selected={props.activeTab === tab.id}
            onClick={() => props.onTabChange(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <div className="media-inspector-body" role="tabpanel">
        {props.activeTab === "details" ? <DetailsTab asset={props.asset} folders={props.folders} /> : null}
        {props.activeTab === "comments" ? <CommentsTab asset={props.asset} /> : null}
        {props.activeTab === "transcript" ? <TranscriptTab asset={props.asset} notes={props.transcriptNotes} /> : null}
        {props.activeTab === "versions" ? <VersionsTab asset={props.asset} /> : null}
      </div>
    </aside>
  );
}

function InspectorPreview({ asset }: { asset: MediaAsset }) {
  if (asset.kind === "video") {
    return (
      <div className="media-inspector-preview is-video">
        <video controls poster={asset.thumbnailUrl} aria-label={`Video preview for ${asset.name}`} />
      </div>
    );
  }

  if (asset.kind === "audio") {
    return (
      <div className="media-inspector-preview is-audio">
        <MediaThumbnail asset={asset} />
        <audio controls aria-label={`Audio preview for ${asset.name}`} />
      </div>
    );
  }

  if (asset.kind === "image" && asset.thumbnailUrl) {
    return <div className="media-inspector-preview is-image" style={{ backgroundImage: `url("${asset.thumbnailUrl}")` }} />;
  }

  return (
    <div className="media-inspector-preview is-document">
      <DsIcon name="file-text" size={40} />
      <span className="label-s-semibold">Document preview</span>
    </div>
  );
}

function DetailsTab({ asset, folders }: { asset: MediaAsset; folders: MediaFolder[] }) {
  const folderName = folders.find((folder) => folder.id === asset.folderId)?.name ?? "All media";
  const uploaded = new Intl.DateTimeFormat("en-AU", { day: "2-digit", month: "long", year: "numeric" }).format(new Date(asset.uploadedAt));
  const details = [
    ["Kind", asset.kind],
    ["Size", asset.sizeLabel],
    ["Duration", asset.durationLabel ?? "-"],
    ["Uploaded", uploaded],
    ["Uploaded by", asset.ownerName],
    ["Folder", folderName],
  ];

  return (
    <dl className="media-detail-list">
      {details.map(([label, value]) => (
        <div key={label}><dt className="label-xs">{label}</dt><dd className="label-s-semibold">{value}</dd></div>
      ))}
      {asset.linkedScriptRowId ? (
        <div><dt className="label-xs">Linked script row</dt><dd><button className="media-inline-link label-s-semibold" type="button">{asset.linkedScriptRowId}</button></dd></div>
      ) : null}
    </dl>
  );
}

function CommentsTab({ asset }: { asset: MediaAsset }) {
  if (asset.commentCount === 0) {
    return <p className="media-tab-empty label-s">No comments on this file yet.</p>;
  }

  return (
    <div className="media-comment-thread">
      <article className="media-comment is-internal">
        <div><strong className="label-s-semibold">Maddie Lee</strong><span className="media-comment-tag label-xs-semibold">Internal</span></div>
        {(asset.kind === "video" || asset.kind === "audio") ? <button className="media-timecode label-xs-semibold" type="button">00:24</button> : null}
        <p className="label-s">This is the strongest take. Keep the pause before the product reveal.</p>
      </article>
      {asset.commentCount > 1 ? (
        <article className="media-comment is-external">
          <div><strong className="label-s-semibold">Avery Taylor</strong><span className="media-comment-tag label-xs-semibold">External</span></div>
          {(asset.kind === "video" || asset.kind === "audio") ? <button className="media-timecode label-xs-semibold" type="button">01:12</button> : null}
          <p className="label-s">The customer story lands clearly here. Please hold on the final line.</p>
        </article>
      ) : null}
    </div>
  );
}

function TranscriptTab({ asset, notes }: { asset: MediaAsset; notes: MediaTranscriptNote[] }) {
  const [query, setQuery] = useState("");
  const canTranscribe = asset.kind === "video" || asset.kind === "audio";
  const filteredNotes = useMemo(() => notes.filter((note) => note.text.toLowerCase().includes(query.toLowerCase())), [notes, query]);

  if (!canTranscribe) {
    return <p className="media-tab-empty label-s">Transcripts are available for video and audio files only.</p>;
  }

  if (asset.transcriptStatus !== "ready") {
    return <p className="media-tab-empty label-s">{asset.transcriptStatus === "processing" ? "Transcript is processing." : "No transcript is available yet."}</p>;
  }

  return (
    <div className="media-transcript-tab">
      <div className="media-transcript-tools">
        <label className="media-search-shell"><DsIcon name="search" size={16} /><input className="label-s" value={query} placeholder="Search transcript" onChange={(event) => setQuery(event.target.value)} /></label>
        <button className="media-icon-button" type="button" aria-label="Copy transcript" data-tooltip="Copy transcript" onClick={() => navigator.clipboard?.writeText(notes.map((note) => `${note.timecode} ${note.text}`).join("\n"))}><DsIcon name="copy" size={16} /></button>
      </div>
      <div className="media-transcript-lines">
        {filteredNotes.map((note) => (
          <button className="media-transcript-line" type="button" key={`${note.assetId}-${note.timecode}`}>
            <span className="media-timecode label-xs-semibold">{note.timecode}</span>
            <span className="label-s">{note.text}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function VersionsTab({ asset }: { asset: MediaAsset }) {
  return (
    <div className="media-version-list">
      {["v3", "v2", "v1"].map((version, index) => (
        <div className="media-version-row" key={version}>
          <span className="media-version-number label-s-semibold">{version}</span>
          <div><strong className="label-s-semibold">{index === 0 ? "Current version" : asset.name}</strong><span className="label-xs">{index + 6} Jul 2026 · {index === 2 ? "Avery Taylor" : asset.ownerName}</span></div>
        </div>
      ))}
    </div>
  );
}
