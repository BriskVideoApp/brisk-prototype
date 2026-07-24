"use client";

import {
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type KeyboardEvent,
} from "react";
import type { Project } from "@/components/active-videos/types";
import { CommentCountBadge } from "@/components/CommentCountBadge";
import { ProjectStageHeader } from "@/components/project/ProjectStageHeader";
import { DsIcon } from "@/components/video-review/DsIcon";
import {
  initialMastersDeliverables,
  mastersDurationOptions,
  mastersFormatOptions,
  type DeliverableStatus,
  type MastersComment,
  type MastersDeliverable,
  type MastersRole,
  type MastersVersion,
} from "@/data/masters";

type CommentFilter = "all" | "unresolved" | "internal" | "external";
type RequestTab = "cutdown" | "reformat" | "script";

const commentFilters: Array<{ value: CommentFilter; label: string }> = [
  { value: "all", label: "All" },
  { value: "unresolved", label: "Unresolved" },
  { value: "internal", label: "Internal" },
  { value: "external", label: "External" },
];

export function MastersPage({ project }: { project: Project }) {
  const [role] = useState<MastersRole>("Studio Staff");
  const [deliverables, setDeliverables] = useState<MastersDeliverable[]>(() =>
    structuredClone(initialMastersDeliverables),
  );
  const [expandedDeliverableId, setExpandedDeliverableId] = useState<string | null>(
    initialMastersDeliverables.find((deliverable) => deliverable.name === "Main Video")?.id
      ?? initialMastersDeliverables[0]?.id
      ?? null,
  );
  const [selectedVersionByDeliverable, setSelectedVersionByDeliverable] = useState<Record<string, string>>({});
  const [commentFilter, setCommentFilter] = useState<CommentFilter>("all");
  const [currentTimeSeconds, setCurrentTimeSeconds] = useState(12);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [toast, setToast] = useState("");
  const [openVersionMenuId, setOpenVersionMenuId] = useState<string | null>(null);
  const [openRowMenuId, setOpenRowMenuId] = useState<string | null>(null);
  const [editingNameId, setEditingNameId] = useState<string | null>(null);
  const [isBulkApproveOpen, setIsBulkApproveOpen] = useState(false);
  const [requestSourceId, setRequestSourceId] = useState<string | null>(null);
  const [requestTab, setRequestTab] = useState<RequestTab>("cutdown");
  const [requestName, setRequestName] = useState("");
  const [requestFormat, setRequestFormat] = useState("9:16");
  const [requestDuration, setRequestDuration] = useState("30 secs");
  const [requestNotes, setRequestNotes] = useState("");
  const [commentDraft, setCommentDraft] = useState("");
  const uploadInputRef = useRef<HTMLInputElement>(null);
  const uploadTargetIdRef = useRef<string | null>(null);

  const isFilmmaker = role !== "Customer";
  const expandedDeliverable = deliverables.find((deliverable) => deliverable.id === expandedDeliverableId);
  const readyDeliverables = deliverables.filter(
    (deliverable) => deliverable.status === "Ready for review" && deliverable.versions.length > 0,
  );
  const hasCaptionChild = (deliverableId: string) =>
    deliverables.some((deliverable) => deliverable.parentDeliverableId === deliverableId);

  const visibleComments = useMemo(() => {
    if (!expandedDeliverable) return [];
    return [...expandedDeliverable.comments]
      .reverse()
      .filter((comment) => role !== "Customer" || comment.visibility === "external")
      .filter((comment) => {
        if (commentFilter === "all") return true;
        if (commentFilter === "unresolved") return !comment.resolved;
        return comment.visibility === commentFilter;
      });
  }, [commentFilter, expandedDeliverable, role]);

  const showToast = (message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(""), 2600);
  };

  const closeMenus = () => {
    setOpenRowMenuId(null);
    setOpenVersionMenuId(null);
  };

  const expandDeliverable = (deliverableId: string) => {
    if (expandedDeliverableId === deliverableId) {
      setExpandedDeliverableId(null);
      closeMenus();
      return;
    }

    const deliverable = deliverables.find((item) => item.id === deliverableId);
    const version = deliverable ? getPresentedVersion(deliverable, selectedVersionByDeliverable) : undefined;
    setExpandedDeliverableId(deliverableId);
    setCommentFilter("all");
    setCurrentTimeSeconds(version ? Math.min(12, version.durationSeconds) : 0);
    setIsPlaying(false);
    closeMenus();
  };

  const moveRowFocus = (deliverableId: string, direction: -1 | 1) => {
    const currentIndex = deliverables.findIndex((deliverable) => deliverable.id === deliverableId);
    const next = deliverables[currentIndex + direction];
    if (!next) return;
    document.getElementById(`masters-row-${next.id}`)?.focus();
  };

  const selectVersion = (deliverableId: string, versionId: string) => {
    setSelectedVersionByDeliverable((current) => ({ ...current, [deliverableId]: versionId }));
    setExpandedDeliverableId(deliverableId);
    setCurrentTimeSeconds(0);
    setIsPlaying(false);
    setOpenVersionMenuId(null);
  };

  const setCurrentVersion = (deliverableId: string, versionId: string) => {
    selectVersion(deliverableId, versionId);
    setDeliverables((current) => current.map((deliverable) =>
      deliverable.id === deliverableId ? { ...deliverable, currentVersionId: versionId } : deliverable,
    ));
    showToast("Current version updated.");
  };

  const approveDeliverable = (deliverableId: string) => {
    setDeliverables((current) => current.map((deliverable) => {
      if (deliverable.id !== deliverableId || deliverable.status !== "Ready for review") return deliverable;
      const version = getPresentedVersion(deliverable, selectedVersionByDeliverable)
        ?? deliverable.versions[deliverable.versions.length - 1];
      if (!version) return deliverable;
      return {
        ...deliverable,
        approvedVersionId: version.id,
        currentVersionId: version.id,
        status: "Delivered",
        versions: deliverable.versions.map((item) => ({ ...item, approved: item.id === version.id })),
      };
    }));
    showToast("Version approved and marked as delivered.");
  };

  const approveAllReady = () => {
    const readyIds = new Set(readyDeliverables.map((deliverable) => deliverable.id));
    setDeliverables((current) => current.map((deliverable) => {
      if (!readyIds.has(deliverable.id)) return deliverable;
      const latest = deliverable.versions[deliverable.versions.length - 1];
      if (!latest) return deliverable;
      return {
        ...deliverable,
        approvedVersionId: latest.id,
        currentVersionId: latest.id,
        status: "Delivered",
        versions: deliverable.versions.map((version) => ({ ...version, approved: version.id === latest.id })),
      };
    }));
    setIsBulkApproveOpen(false);
    showToast(`${readyDeliverables.length} deliverable${readyDeliverables.length === 1 ? "" : "s"} approved.`);
  };

  const openUpload = (deliverableId: string) => {
    uploadTargetIdRef.current = deliverableId;
    setExpandedDeliverableId(deliverableId);
    window.setTimeout(() => uploadInputRef.current?.click(), 0);
  };

  const uploadVersion = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    const target = deliverables.find((deliverable) => deliverable.id === uploadTargetIdRef.current);
    if (!file || !target) return;

    const nextNumber = Math.max(0, ...target.versions.map((version) => version.number)) + 1;
    const previousVersion = getPresentedVersion(target, selectedVersionByDeliverable);
    const nextVersion: MastersVersion = {
      id: `${target.id}-v${nextNumber}-${Date.now()}`,
      number: nextNumber,
      filename: file.name,
      uploadedAt: new Date().toISOString(),
      uploadedBy: "Tom Evans",
      codec: target.kind === "captions" ? "UTF-8 subtitles" : "H.264 High",
      resolution: target.kind === "captions" ? "Timed text" : target.format === "9:16" ? "1080 × 1920" : "3840 × 2160",
      fileSize: formatFileSize(file.size),
      durationSeconds: previousVersion?.durationSeconds ?? durationLabelToSeconds(target.duration),
      shadePath: `Shade/${project.name}/Masters/${target.name}/V${nextNumber}`,
      approved: false,
    };

    setDeliverables((current) => current.map((deliverable) =>
      deliverable.id === target.id
        ? {
            ...deliverable,
            versions: [...deliverable.versions, nextVersion],
            currentVersionId: nextVersion.id,
            status: "Ready for review",
          }
        : deliverable,
    ));
    setSelectedVersionByDeliverable((current) => ({ ...current, [target.id]: nextVersion.id }));
    setCurrentTimeSeconds(0);
    event.target.value = "";
    showToast(`V${nextNumber} uploaded. This deliverable is now in review.`);
  };

  const deleteVersion = (deliverableId: string, versionId: string) => {
    setDeliverables((current) => current.map((deliverable) => {
      if (deliverable.id !== deliverableId) return deliverable;
      const versions = deliverable.versions.filter((version) => version.id !== versionId);
      const approvedVersionId = deliverable.approvedVersionId === versionId ? undefined : deliverable.approvedVersionId;
      const currentVersionId = deliverable.currentVersionId === versionId
        ? versions[versions.length - 1]?.id
        : deliverable.currentVersionId;
      return {
        ...deliverable,
        versions,
        approvedVersionId,
        currentVersionId,
        status: versions.length ? deliverable.status : "Not started",
      };
    }));
    setSelectedVersionByDeliverable((current) => {
      const next = { ...current };
      delete next[deliverableId];
      return next;
    });
    showToast("Version removed from this prototype.");
  };

  const deleteDeliverable = (deliverableId: string) => {
    const remaining = deliverables.filter((deliverable) => deliverable.id !== deliverableId);
    setDeliverables(remaining);
    if (expandedDeliverableId === deliverableId) setExpandedDeliverableId(remaining[0]?.id ?? null);
    closeMenus();
    showToast("Deliverable removed from this prototype.");
  };

  const openRequest = (deliverable: MastersDeliverable) => {
    setRequestSourceId(deliverable.id);
    setRequestTab("cutdown");
    setRequestName(`30s cut from ${deliverable.name}`);
    setRequestFormat(deliverable.format);
    setRequestDuration("30 secs");
    setRequestNotes("");
  };

  const submitRequest = () => {
    const source = deliverables.find((deliverable) => deliverable.id === requestSourceId);
    if (!source || !requestName.trim()) return;
    const id = `requested-${Date.now()}`;
    const requested: MastersDeliverable = {
      id,
      briefDeliverableId: `client-request-${id}`,
      name: requestName.trim(),
      platform: source.platform,
      format: requestTab === "reformat" ? requestFormat : source.format,
      duration: requestTab === "cutdown" ? requestDuration : source.duration,
      captions: source.captions,
      status: "Requested",
      versions: [],
      comments: requestNotes.trim()
        ? [{
            id: `request-note-${Date.now()}`,
            author: "Jess Taylor",
            initials: "JT",
            visibility: "external",
            body: requestNotes.trim(),
            createdAgo: "Just now",
            resolved: false,
          }]
        : [],
      isRequested: true,
      addedBy: "client-request",
      kind: "video",
    };
    setDeliverables((current) => [...current, requested]);
    setExpandedDeliverableId(id);
    setRequestSourceId(null);
    showToast("Request added to the delivery register.");
  };

  const postComment = () => {
    if (!expandedDeliverable || !commentDraft.trim()) return;
    const comment: MastersComment = {
      id: `masters-comment-${Date.now()}`,
      author: role === "Customer" ? "Jess Taylor" : "Tom Evans",
      initials: role === "Customer" ? "JT" : "TE",
      visibility: role === "Customer" ? "external" : "internal",
      timecodeSeconds: currentTimeSeconds,
      body: commentDraft.trim(),
      createdAgo: "Just now",
      resolved: false,
    };
    setDeliverables((current) => current.map((deliverable) =>
      deliverable.id === expandedDeliverable.id
        ? { ...deliverable, comments: [...deliverable.comments, comment] }
        : deliverable,
    ));
    setCommentDraft("");
  };

  return (
    <main className="masters-shell">
      <ProjectStageHeader project={project} activeStage="masters" />

      <section className={`masters-register-workspace ${expandedDeliverable ? "has-comments-rail" : ""}`}>
        <section className="masters-register">
          <header className="masters-register-header">
            <h1>Deliverables</h1>
          </header>

          <section className="masters-delivery-register" aria-label="Deliverables register">
            <div className="masters-register-column-header" aria-hidden="true">
              <span>Deliverable</span>
              <span>Brief</span>
              <span>Version</span>
              <span>Status</span>
              <span />
            </div>
            {deliverables.length ? (
              <div className="masters-deliverable-list">
                {deliverables.map((deliverable) => {
                  const selectedVersion = getPresentedVersion(deliverable, selectedVersionByDeliverable);
                  const expanded = deliverable.id === expandedDeliverableId;
                  return (
                    <div className={`masters-deliverable-item ${expanded ? "expanded" : ""}`} key={deliverable.id}>
                      <DeliverableRow
                        deliverable={deliverable}
                        expanded={expanded}
                        selectedVersion={selectedVersion}
                        commentCount={deliverable.comments.filter((comment) => role !== "Customer" || comment.visibility === "external").length}
                        isFilmmaker={isFilmmaker}
                        hideCaptions={hasCaptionChild(deliverable.id)}
                        editingName={editingNameId === deliverable.id}
                        versionMenuOpen={openVersionMenuId === deliverable.id}
                        rowMenuOpen={openRowMenuId === deliverable.id}
                        onChangeName={(name) => setDeliverables((current) => current.map((item) =>
                          item.id === deliverable.id ? { ...item, name } : item,
                        ))}
                        onDelete={() => deleteDeliverable(deliverable.id)}
                        onDownload={() => selectedVersion && downloadPrototypeFile(selectedVersion.filename, showToast)}
                        onEditName={() => setEditingNameId(editingNameId === deliverable.id ? null : deliverable.id)}
                        onMoveFocus={(direction) => moveRowFocus(deliverable.id, direction)}
                        onSelect={() => expandDeliverable(deliverable.id)}
                        onSelectVersion={(versionId) => selectVersion(deliverable.id, versionId)}
                        onSetCurrent={() => selectedVersion && setCurrentVersion(deliverable.id, selectedVersion.id)}
                        onToggleRowMenu={() => {
                          setOpenRowMenuId(openRowMenuId === deliverable.id ? null : deliverable.id);
                          setOpenVersionMenuId(null);
                        }}
                        onToggleVersionMenu={() => {
                          setOpenVersionMenuId(openVersionMenuId === deliverable.id ? null : deliverable.id);
                          setOpenRowMenuId(null);
                        }}
                      />
                      {expanded ? (
                        <ExpandedDeliverable
                          deliverable={deliverable}
                          version={selectedVersion}
                          role={role}
                          isFilmmaker={isFilmmaker}
                          currentTimeSeconds={currentTimeSeconds}
                          isPlaying={isPlaying}
                          isMuted={isMuted}
                          onApprove={() => approveDeliverable(deliverable.id)}
                          onDeleteVersion={(versionId) => deleteVersion(deliverable.id, versionId)}
                          onDownload={(versionToDownload) => downloadPrototypeFile(versionToDownload.filename, showToast)}
                          onRequestRecut={() => openRequest(deliverable)}
                          onSeek={setCurrentTimeSeconds}
                          onSelectComment={(comment) => {
                            if (typeof comment.timecodeSeconds === "number") setCurrentTimeSeconds(comment.timecodeSeconds);
                          }}
                          onSelectVersion={(versionId) => selectVersion(deliverable.id, versionId)}
                          onSetCurrent={(versionId) => setCurrentVersion(deliverable.id, versionId)}
                          onToggleMuted={() => setIsMuted((current) => !current)}
                          onTogglePlaying={() => setIsPlaying((current) => !current)}
                          onUpload={() => openUpload(deliverable.id)}
                        />
                      ) : null}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="masters-page-empty">
                <DsIcon name="film-strip" size={28} />
                <h2>Nothing here yet</h2>
              </div>
            )}
          </section>
        </section>

        {expandedDeliverable ? (
          <aside className="masters-comments-rail" aria-label={`${expandedDeliverable.name} comments`}>
            <header className="masters-comments-rail-header">
              <div>
                <h2>Comments ({expandedDeliverable.comments.length})</h2>
                <span className="label-xs">{expandedDeliverable.name}</span>
              </div>
            </header>
            <CommentsPanel
              comments={visibleComments}
              filter={commentFilter}
              role={role}
              currentTimeSeconds={currentTimeSeconds}
              draft={commentDraft}
              onChangeDraft={setCommentDraft}
              onFilter={setCommentFilter}
              onPost={postComment}
              onSelect={(comment) => {
                if (typeof comment.timecodeSeconds === "number") setCurrentTimeSeconds(comment.timecodeSeconds);
              }}
            />
          </aside>
        ) : null}

        <footer className="masters-action-footer" aria-label="Masters actions">
          <div className="masters-action-footer-inner">
            <button className="masters-footer-share" type="button" aria-label="Copy share link" onClick={() => copyShareLink("all-deliverables", showToast)}>
              <DsIcon name="link" size={20} />
            </button>
            <button className="masters-secondary-button label-s-semibold" type="button" disabled={deliverables.length === 0} onClick={() => downloadPrototypeFile(`${project.name}-Masters.zip`, showToast)}>
              <DsIcon name="download" size={18} />Download all (.zip)
            </button>
            <button className="masters-primary-button label-s-semibold" type="button" disabled={readyDeliverables.length === 0} onClick={() => setIsBulkApproveOpen(true)}>
              <DsIcon name="thumbs-up-like-fill" size={20} />Approve all
            </button>
          </div>
        </footer>
      </section>

      <input ref={uploadInputRef} className="sr-only" type="file" onChange={uploadVersion} />
      {isBulkApproveOpen ? (
        <BulkApproveDialog
          deliverables={readyDeliverables}
          onCancel={() => setIsBulkApproveOpen(false)}
          onConfirm={approveAllReady}
        />
      ) : null}
      {requestSourceId ? (
        <RequestDialog
          source={deliverables.find((deliverable) => deliverable.id === requestSourceId)}
          tab={requestTab}
          name={requestName}
          format={requestFormat}
          duration={requestDuration}
          notes={requestNotes}
          onCancel={() => setRequestSourceId(null)}
          onChangeDuration={setRequestDuration}
          onChangeFormat={setRequestFormat}
          onChangeName={setRequestName}
          onChangeNotes={setRequestNotes}
          onChangeTab={setRequestTab}
          onSubmit={submitRequest}
        />
      ) : null}
      {toast ? <div className="masters-toast label-s-semibold" role="status">{toast}</div> : null}
    </main>
  );
}

function DeliverableRow({
  deliverable,
  expanded,
  selectedVersion,
  commentCount,
  isFilmmaker,
  hideCaptions,
  editingName,
  versionMenuOpen,
  rowMenuOpen,
  onChangeName,
  onDelete,
  onDownload,
  onEditName,
  onMoveFocus,
  onSelect,
  onSelectVersion,
  onSetCurrent,
  onToggleRowMenu,
  onToggleVersionMenu,
}: {
  deliverable: MastersDeliverable;
  expanded: boolean;
  selectedVersion?: MastersVersion;
  commentCount: number;
  isFilmmaker: boolean;
  hideCaptions: boolean;
  editingName: boolean;
  versionMenuOpen: boolean;
  rowMenuOpen: boolean;
  onChangeName: (name: string) => void;
  onDelete: () => void;
  onDownload: () => void;
  onEditName: () => void;
  onMoveFocus: (direction: -1 | 1) => void;
  onSelect: () => void;
  onSelectVersion: (versionId: string) => void;
  onSetCurrent: () => void;
  onToggleRowMenu: () => void;
  onToggleVersionMenu: () => void;
}) {
  const versionCount = deliverable.versions.length;
  const isMainVideo = deliverable.name === "Main Video";
  const selectedIsCurrent = Boolean(selectedVersion && selectedVersion.id === deliverable.currentVersionId);

  return (
    <article
      id={`masters-row-${deliverable.id}`}
      className={`masters-deliverable-row ${expanded ? "expanded" : ""} ${deliverable.parentDeliverableId ? "is-child" : ""}`}
      role="button"
      tabIndex={0}
      aria-expanded={expanded}
      onClick={onSelect}
      onKeyDown={(event: KeyboardEvent<HTMLElement>) => {
        if (event.key === "Enter" || event.key === " ") { event.preventDefault(); onSelect(); }
        if (event.key === "Escape" && expanded) { event.preventDefault(); onSelect(); }
        if (event.key === "ArrowDown") { event.preventDefault(); onMoveFocus(1); }
        if (event.key === "ArrowUp") { event.preventDefault(); onMoveFocus(-1); }
      }}
    >
      <span className="masters-disclosure" aria-hidden="true"><DsIcon name="caret-right" size={16} /></span>
      <DeliverableThumbnail deliverable={deliverable} version={selectedVersion} />
      <div className="masters-row-name-zone">
        <div className="masters-row-name-line">
          {editingName ? (
            <input
              className="masters-row-name-input label-s-semibold"
              autoFocus
              value={deliverable.name}
              onChange={(event) => onChangeName(event.target.value)}
              onBlur={onEditName}
              onClick={(event) => event.stopPropagation()}
            />
          ) : <span className="masters-row-name label-s-semibold">{deliverable.name}</span>}
          {deliverable.isRequested ? <span className="masters-requested-tag label-xs-semibold">Client request</span> : null}
          {isFilmmaker && !isMainVideo && !editingName ? (
            <button
              className="masters-edit-name"
              type="button"
              aria-label={`Edit ${deliverable.name}`}
              onClick={(event) => { event.stopPropagation(); onEditName(); }}
            >
              <DsIcon name="pencil-simple" size={13} />
            </button>
          ) : null}
        </div>
      </div>
      <span className="masters-comment-indicator" aria-label={commentCount === 0 ? "No comments" : undefined}>
        <DsIcon name="chat-circle" size={20} />
        <CommentCountBadge count={commentCount} label={`${commentCount} ${commentCount === 1 ? "comment" : "comments"}`} />
      </span>
      <div className="masters-row-meta-zone">
        <span className="label-s">{formatMetadata(deliverable, hideCaptions)}</span>
        {selectedVersion ? (
          <span className="masters-file-hover label-xs">
            {selectedVersion.filename} · {selectedVersion.codec} · {selectedVersion.resolution} · {selectedVersion.fileSize}
          </span>
        ) : null}
      </div>
      <div className="masters-version-control">
        {versionCount ? (
          <button
            className="masters-version-chip label-xs-semibold"
            type="button"
            aria-expanded={versionMenuOpen}
            onClick={(event) => { event.stopPropagation(); onToggleVersionMenu(); }}
          >
            V{selectedVersion?.number ?? deliverable.versions[versionCount - 1].number}<DsIcon name="caret-down" size={11} />
          </button>
        ) : <span className="masters-no-version label-xs">-</span>}
        {versionMenuOpen ? (
          <div className="masters-version-menu" onClick={(event) => event.stopPropagation()}>
            {[...deliverable.versions].reverse().map((version) => (
              <button
                className={`label-xs-semibold ${version.id === selectedVersion?.id ? "selected" : ""}`}
                key={version.id}
                type="button"
                onClick={() => onSelectVersion(version.id)}
              >
                <span>V{version.number}</span><span>{formatShortDate(version.uploadedAt)}</span>
              </button>
            ))}
          </div>
        ) : null}
      </div>
      <StatusPill status={deliverable.status} />
      <div className="masters-row-menu-wrap">
        <button
          className="masters-row-menu-button"
          type="button"
          aria-label={`Actions for ${deliverable.name}`}
          aria-expanded={rowMenuOpen}
          onClick={(event) => { event.stopPropagation(); onToggleRowMenu(); }}
        >
          <DsIcon name="dots-three" size={15} />
        </button>
        {rowMenuOpen ? (
          <div className="masters-row-menu" onClick={(event) => event.stopPropagation()}>
            {selectedVersion ? <button className="label-xs-semibold" type="button" onClick={onDownload}><DsIcon name="download" size={14} />Download</button> : null}
            {selectedVersion && !selectedIsCurrent ? <button className="label-xs-semibold" type="button" onClick={onSetCurrent}><DsIcon name="eye" size={14} />Set as current</button> : null}
            {isFilmmaker ? <button className="delete label-xs-semibold" type="button" onClick={onDelete}><DsIcon name="trash" size={14} />Delete</button> : null}
          </div>
        ) : null}
      </div>
    </article>
  );
}

function DeliverableThumbnail({ deliverable, version }: { deliverable: MastersDeliverable; version?: MastersVersion }) {
  const isDelivered = deliverable.status === "Delivered" || deliverable.status === "Approved";
  return (
    <span className={`masters-row-thumbnail ${version && isDelivered ? "has-poster" : "placeholder"}`} aria-hidden="true">
      {deliverable.kind === "captions"
        ? <DsIcon name="file-text" size={18} />
        : version && isDelivered
          ? <DsIcon name="play" size={18} />
          : <span className="label-xs-semibold">{deliverable.format}</span>}
    </span>
  );
}

function ExpandedDeliverable({
  deliverable,
  version,
  role,
  isFilmmaker,
  currentTimeSeconds,
  isPlaying,
  isMuted,
  onApprove,
  onDeleteVersion,
  onDownload,
  onRequestRecut,
  onSeek,
  onSelectComment,
  onSelectVersion,
  onSetCurrent,
  onToggleMuted,
  onTogglePlaying,
  onUpload,
}: {
  deliverable: MastersDeliverable;
  version?: MastersVersion;
  role: MastersRole;
  isFilmmaker: boolean;
  currentTimeSeconds: number;
  isPlaying: boolean;
  isMuted: boolean;
  onApprove: () => void;
  onDeleteVersion: (versionId: string) => void;
  onDownload: (version: MastersVersion) => void;
  onRequestRecut: () => void;
  onSeek: (seconds: number) => void;
  onSelectComment: (comment: MastersComment) => void;
  onSelectVersion: (versionId: string) => void;
  onSetCurrent: (versionId: string) => void;
  onToggleMuted: () => void;
  onTogglePlaying: () => void;
  onUpload: () => void;
}) {
  return (
    <section className="masters-expanded-panel" aria-label={`${deliverable.name} delivery details`}>
      {version ? (
        <CompactPlayer
          deliverable={deliverable}
          version={version}
          comments={deliverable.comments.filter((comment) => role !== "Customer" || comment.visibility === "external")}
          currentTimeSeconds={currentTimeSeconds}
          isPlaying={isPlaying}
          isMuted={isMuted}
          onSeek={onSeek}
          onSelectComment={onSelectComment}
          onToggleMuted={onToggleMuted}
          onTogglePlaying={onTogglePlaying}
        />
      ) : (
        <div className="masters-inline-empty">
          <DsIcon name={deliverable.kind === "captions" ? "file-text" : "film-strip"} size={26} />
          <strong>Nothing delivered here yet.</strong>
          {isFilmmaker ? (
            <button className="masters-secondary-button label-xs-semibold" type="button" onClick={onUpload}>
              <DsIcon name="upload-simple" size={14} />Upload V1
            </button>
          ) : null}
        </div>
      )}

      <div className="masters-expanded-actions">
        {version ? (
          <button
            className="masters-secondary-button label-s-semibold"
            type="button"
            disabled={deliverable.status !== "Ready for review"}
            onClick={onApprove}
          >
            <DsIcon name="check" size={16} />Approve this version
          </button>
        ) : null}
        {version ? (
          <button className="masters-secondary-button label-s-semibold" type="button" onClick={() => onDownload(version)}>
            <DsIcon name="download" size={16} />Download
          </button>
        ) : null}
        {role === "Customer" && deliverable.kind === "video" ? (
          <button className="masters-tertiary-button label-s-semibold" type="button" onClick={onRequestRecut}>
            Request recut
          </button>
        ) : null}
      </div>

      <div className="masters-inline-versions-heading">
        <h3>Versions</h3>
        <span className="label-xs-semibold">{deliverable.versions.length}</span>
      </div>
      <VersionsPanel
        deliverable={deliverable}
        selectedVersionId={version?.id}
        isFilmmaker={isFilmmaker}
        onDelete={onDeleteVersion}
        onDownload={onDownload}
        onSelect={onSelectVersion}
        onSetCurrent={onSetCurrent}
        onUpload={onUpload}
      />
    </section>
  );
}

function CompactPlayer({
  deliverable,
  version,
  comments,
  currentTimeSeconds,
  isPlaying,
  isMuted,
  onSeek,
  onSelectComment,
  onToggleMuted,
  onTogglePlaying,
}: {
  deliverable: MastersDeliverable;
  version: MastersVersion;
  comments: MastersComment[];
  currentTimeSeconds: number;
  isPlaying: boolean;
  isMuted: boolean;
  onSeek: (seconds: number) => void;
  onSelectComment: (comment: MastersComment) => void;
  onToggleMuted: () => void;
  onTogglePlaying: () => void;
}) {
  const duration = version.durationSeconds || durationLabelToSeconds(deliverable.duration);
  const progress = Math.min(100, (currentTimeSeconds / duration) * 100);
  const timecodedComments = comments.filter((comment) => typeof comment.timecodeSeconds === "number");

  return (
    <div className="masters-compact-player" key={`${deliverable.id}-${version.id}`}>
      <div className="masters-compact-player-top">
        <span className={`masters-player-version label-xs-semibold ${version.approved ? "approved" : ""}`}>
          V{version.number}{version.approved ? " · Approved" : " · In review"}
        </span>
      </div>
      <div className="masters-inline-frame">
        <div className="masters-player-orb"><span>{deliverable.kind === "captions" ? "SRT" : deliverable.name.slice(0, 2).toUpperCase()}</span></div>
      </div>
      <div className="masters-compact-controls">
        <div className="masters-timeline-row">
          <span className="label-xs-semibold">{formatTime(currentTimeSeconds)}</span>
          <div
            className="masters-timeline"
            role="slider"
            aria-label="Video timeline"
            aria-valuemin={0}
            aria-valuemax={duration}
            aria-valuenow={Math.round(currentTimeSeconds)}
            tabIndex={0}
            onPointerDown={(event) => {
              const rect = event.currentTarget.getBoundingClientRect();
              onSeek(quantiseToFrame(Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width)) * duration));
            }}
            onKeyDown={(event) => {
              if (event.key === "ArrowLeft") onSeek(Math.max(0, quantiseToFrame(currentTimeSeconds - 1 / 25)));
              if (event.key === "ArrowRight") onSeek(Math.min(duration, quantiseToFrame(currentTimeSeconds + 1 / 25)));
            }}
          >
            <span className="masters-timeline-progress" style={{ width: `${progress}%` }} />
            <span className="masters-playhead" style={{ left: `${progress}%` }} />
            {timecodedComments.map((comment) => (
              <button
                className={`masters-comment-marker ${comment.visibility}`}
                key={comment.id}
                type="button"
                aria-label={`Open ${comment.visibility} comment at ${formatTime(comment.timecodeSeconds ?? 0)}`}
                style={{ left: `${((comment.timecodeSeconds ?? 0) / duration) * 100}%` }}
                onPointerDown={(event) => { event.stopPropagation(); onSelectComment(comment); }}
              />
            ))}
          </div>
          <span className="label-xs">{formatTime(duration)}</span>
        </div>
        <div className="masters-control-row">
          <div>
            <button type="button" aria-label="Step back five seconds" onClick={() => onSeek(Math.max(0, currentTimeSeconds - 5))}><DsIcon name="arrow-counter-clockwise" size={16} /></button>
            <button className="play" type="button" aria-label={isPlaying ? "Pause" : "Play"} onClick={onTogglePlaying}><DsIcon name={isPlaying ? "pause" : "play"} size={16} /></button>
            <button type="button" aria-label="Step forward five seconds" onClick={() => onSeek(Math.min(duration, currentTimeSeconds + 5))}><DsIcon name="arrow-clockwise" size={16} /></button>
          </div>
          <div>
            <button type="button" aria-label={isMuted ? "Unmute" : "Mute"} onClick={onToggleMuted}><DsIcon name="speaker-high" size={16} /></button>
            <button type="button" aria-label="Fullscreen"><DsIcon name="frame-corners" size={16} /></button>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatusGlyph({ status }: { status: DeliverableStatus }) {
  const complete = status === "Approved" || status === "Delivered";
  return <span className={`masters-status-glyph is-${slugStatus(status)}`} aria-label={status}>{complete ? <DsIcon name="check" size={12} /> : null}</span>;
}

function StatusPill({ status }: { status: DeliverableStatus }) {
  return <span className={`masters-status-pill label-xs-semibold is-${slugStatus(status)}`}>{statusLabel(status)}</span>;
}

function VersionsPanel({ deliverable, selectedVersionId, isFilmmaker, onDelete, onDownload, onSelect, onSetCurrent, onUpload }: { deliverable: MastersDeliverable; selectedVersionId?: string; isFilmmaker: boolean; onDelete: (versionId: string) => void; onDownload: (version: MastersVersion) => void; onSelect: (versionId: string) => void; onSetCurrent: (versionId: string) => void; onUpload: () => void }) {
  const versions = [...deliverable.versions].reverse();
  const nextNumber = Math.max(0, ...deliverable.versions.map((version) => version.number)) + 1;
  return (
    <div className="masters-versions-panel">
      <div className="masters-inline-panel-toolbar">
        <p className="label-s">Every upload stays in the version stack.</p>
        {isFilmmaker ? <button className="masters-secondary-button label-xs-semibold" type="button" onClick={onUpload}><DsIcon name="upload-simple" size={14} />Upload V{nextNumber}</button> : null}
      </div>
      <div className="masters-version-list">
        {versions.length ? versions.map((version) => {
          const isCurrent = version.id === deliverable.currentVersionId;
          return (
            <article className={`masters-version-card ${version.id === selectedVersionId ? "selected" : ""}`} key={version.id}>
              <button className="masters-version-select" type="button" onClick={() => onSelect(version.id)}>
                <span className="masters-version-thumbnail"><DsIcon name={deliverable.kind === "captions" ? "file-text" : "play"} size={18} /></span>
                <span className="masters-version-copy"><span className="label-s-semibold">V{version.number}</span><span className="label-xs">{version.filename}</span><span className="label-xs">{formatShortDate(version.uploadedAt)} · {version.uploadedBy}</span></span>
              </button>
              <span className={`masters-version-state label-xs-semibold ${version.approved ? "approved" : ""}`}>{version.approved ? "Approved" : isCurrent ? "Current" : "Previous"}</span>
              <div className="masters-version-card-actions">
                {!isCurrent ? <button type="button" aria-label={`Set V${version.number} as current`} data-tooltip="Set as current" onClick={() => onSetCurrent(version.id)}><DsIcon name="eye" size={14} /></button> : null}
                <button type="button" aria-label={`Download V${version.number}`} data-tooltip="Download" onClick={() => onDownload(version)}><DsIcon name="download" size={14} /></button>
                {isFilmmaker ? <button className="delete" type="button" aria-label={`Delete V${version.number}`} data-tooltip="Delete" onClick={() => onDelete(version.id)}><DsIcon name="trash" size={14} /></button> : null}
              </div>
            </article>
          );
        }) : <div className="masters-panel-empty"><DsIcon name="upload-simple" size={22} /><strong>No versions yet</strong><span className="label-s">Upload V1 to begin the review loop.</span></div>}
      </div>
    </div>
  );
}

function CommentsPanel({ comments, filter, role, currentTimeSeconds, draft, onChangeDraft, onFilter, onPost, onSelect }: { comments: MastersComment[]; filter: CommentFilter; role: MastersRole; currentTimeSeconds: number; draft: string; onChangeDraft: (draft: string) => void; onFilter: (filter: CommentFilter) => void; onPost: () => void; onSelect: (comment: MastersComment) => void }) {
  return (
    <div className="masters-comments-panel">
      <div className="masters-comment-filters">{commentFilters.filter((item) => role !== "Customer" || item.value !== "internal").map((item) => <button className={`label-xs-semibold ${filter === item.value ? "active" : ""}`} key={item.value} type="button" onClick={() => onFilter(item.value)}>{item.label}</button>)}</div>
      <div className="masters-comment-list">
        {comments.length ? comments.map((comment) => (
          <button className={`masters-comment-card ${comment.visibility} ${comment.resolved ? "resolved" : ""}`} key={comment.id} type="button" onClick={() => onSelect(comment)}>
            <span className="masters-comment-avatar label-xs-semibold">{comment.initials}</span>
            <span><span className="masters-comment-author label-s-semibold">{comment.author} <small>{comment.createdAgo}</small></span><span className="masters-comment-tags">{typeof comment.timecodeSeconds === "number" ? <span className="timecode label-xs-semibold">{formatTime(comment.timecodeSeconds)}</span> : <span className="label-xs-semibold">Overall</span>}<span className="label-xs-semibold">{comment.visibility === "internal" ? "Internal" : "External"}</span></span><span className="masters-comment-body label-s">{comment.body}</span></span>
          </button>
        )) : <div className="masters-panel-empty"><DsIcon name="chat-circle" size={22} /><strong>No comments here</strong><span className="label-s">This filter is all clear.</span></div>}
      </div>
      <div className="masters-comment-composer"><span className="label-xs">Posting {role === "Customer" ? "to the studio" : "internally"} at {formatTime(currentTimeSeconds)}</span><textarea rows={3} value={draft} placeholder={`Comment on ${formatTime(currentTimeSeconds)}…`} onChange={(event) => onChangeDraft(event.target.value)} onKeyDown={(event) => { if ((event.metaKey || event.ctrlKey) && event.key === "Enter") onPost(); }} /><div><span className="masters-timecode-chip label-xs-semibold">@{formatTime(currentTimeSeconds)}</span><button type="button" aria-label="Post comment" disabled={!draft.trim()} onClick={onPost}><DsIcon name="paper-plane-tilt" size={16} /></button></div></div>
    </div>
  );
}

function BulkApproveDialog({ deliverables, onCancel, onConfirm }: { deliverables: MastersDeliverable[]; onCancel: () => void; onConfirm: () => void }) {
  return <div className="masters-modal-backdrop" role="presentation" onMouseDown={onCancel}><section className="masters-modal" role="dialog" aria-modal="true" aria-labelledby="bulk-approve-title" onMouseDown={(event) => event.stopPropagation()}><div className="masters-modal-header"><div><span className="masters-modal-kicker label-xs-semibold">FINAL CHECK</span><h2 id="bulk-approve-title">Approve all ready?</h2></div><button type="button" aria-label="Close" onClick={onCancel}><DsIcon name="x-close-cross" size={18} /></button></div><p className="label-s">You are approving the current version of each deliverable below. Any future upload will need a new approval.</p><ul className="masters-approval-list">{deliverables.map((deliverable) => { const latest = deliverable.versions[deliverable.versions.length - 1]; return <li key={deliverable.id}><StatusGlyph status="Ready for review" /><span><strong className="label-s-semibold">{deliverable.name}</strong><small className="label-xs">V{latest.number} · {latest.filename}</small></span></li>; })}</ul><div className="masters-modal-actions"><button className="masters-secondary-button label-s-semibold" type="button" onClick={onCancel}>Cancel</button><button className="masters-primary-button label-s-semibold" type="button" onClick={onConfirm}><DsIcon name="checks" size={16} />Approve {deliverables.length} ready</button></div></section></div>;
}

function RequestDialog({ source, tab, name, format, duration, notes, onCancel, onChangeDuration, onChangeFormat, onChangeName, onChangeNotes, onChangeTab, onSubmit }: { source?: MastersDeliverable; tab: RequestTab; name: string; format: string; duration: string; notes: string; onCancel: () => void; onChangeDuration: (value: string) => void; onChangeFormat: (value: string) => void; onChangeName: (value: string) => void; onChangeNotes: (value: string) => void; onChangeTab: (tab: RequestTab) => void; onSubmit: () => void }) {
  return <div className="masters-modal-backdrop" role="presentation" onMouseDown={onCancel}><section className="masters-modal masters-request-modal" role="dialog" aria-modal="true" aria-labelledby="request-title" onMouseDown={(event) => event.stopPropagation()}><div className="masters-modal-header"><div><span className="masters-modal-kicker label-xs-semibold">NEW DELIVERABLE</span><h2 id="request-title">Request a cut-down or reformat</h2></div><button type="button" aria-label="Close" onClick={onCancel}><DsIcon name="x-close-cross" size={18} /></button></div><p className="label-s">Source master: <strong>{source?.name}</strong>. Your note stays attached to this request, not the source master.</p><div className="masters-request-tabs" role="tablist">{(["cutdown", "reformat", "script"] as RequestTab[]).map((option) => <button className={`label-s-semibold ${tab === option ? "active" : ""}`} key={option} type="button" role="tab" aria-selected={tab === option} onClick={() => onChangeTab(option)}>{option === "cutdown" ? "Cut-Downs" : option === "reformat" ? "Reformats" : "Script optional"}</button>)}</div><div className="masters-request-form"><label><span className="label-xs-semibold">Request name</span><input value={name} onChange={(event) => onChangeName(event.target.value)} /></label>{tab === "cutdown" ? <label><span className="label-xs-semibold">Duration</span><select value={duration} onChange={(event) => onChangeDuration(event.target.value)}>{mastersDurationOptions.map((option) => <option key={option}>{option}</option>)}</select></label> : null}{tab === "reformat" ? <label><span className="label-xs-semibold">Format</span><select value={format} onChange={(event) => onChangeFormat(event.target.value)}>{mastersFormatOptions.map((option) => <option key={option}>{option}</option>)}</select></label> : null}{tab === "script" ? <p className="masters-request-hint label-s">Add an optional script or wording note below. The filmmaker will confirm the edit approach.</p> : null}<label><span className="label-xs-semibold">Comments</span><textarea rows={4} value={notes} placeholder="What should change in this new deliverable?" onChange={(event) => onChangeNotes(event.target.value)} /></label></div><div className="masters-modal-actions"><button className="masters-secondary-button label-s-semibold" type="button" onClick={onCancel}>Cancel</button><button className="masters-primary-button label-s-semibold" type="button" disabled={!name.trim()} onClick={onSubmit}>Submit request</button></div></section></div>;
}

function getPresentedVersion(deliverable: MastersDeliverable, selections: Record<string, string>) {
  const selectedId = selections[deliverable.id];
  return deliverable.versions.find((version) => version.id === selectedId)
    ?? deliverable.versions.find((version) => version.id === deliverable.currentVersionId)
    ?? deliverable.versions.find((version) => version.id === deliverable.approvedVersionId)
    ?? deliverable.versions[deliverable.versions.length - 1];
}

function formatMetadata(deliverable: MastersDeliverable, hideCaptions: boolean) {
  if (deliverable.kind === "captions") return `Captions · ${deliverable.duration}${deliverable.deadline ? ` · Due ${formatDate(deliverable.deadline)}` : ""}`;
  const values = [deliverable.platform, deliverable.format, deliverable.duration];
  if (!hideCaptions && !deliverable.captions.includes("None")) values.push(deliverable.captions.join(" + "));
  if (deliverable.deadline) values.push(`Due ${formatDate(deliverable.deadline)}`);
  return values.join(" · ");
}

function formatDate(value: string) { return new Intl.DateTimeFormat("en-AU", { day: "numeric", month: "short" }).format(new Date(`${value}T12:00:00`)); }
function formatShortDate(value: string) { return new Intl.DateTimeFormat("en-AU", { day: "numeric", month: "short", year: "numeric" }).format(new Date(value)); }
function formatTime(seconds: number) { const safe = Math.max(0, Math.round(seconds)); return `${String(Math.floor(safe / 60)).padStart(2, "0")}:${String(safe % 60).padStart(2, "0")}`; }
function quantiseToFrame(seconds: number) { return Math.round(seconds * 25) / 25; }
function slugStatus(status: DeliverableStatus) { return status.toLowerCase().replaceAll(" ", "-"); }
function statusLabel(status: DeliverableStatus) {
  if (status === "Ready for review") return "Waiting on client";
  if (status === "In progress" || status === "Requested") return "Waiting on studio";
  return status;
}
function durationLabelToSeconds(value: string) { const minuteMatch = value.match(/(\d+)\s*min/); const secondMatch = value.match(/(\d+)\s*sec/); return (minuteMatch ? Number(minuteMatch[1]) * 60 : 0) + (secondMatch ? Number(secondMatch[1]) : 0) || 60; }
function formatFileSize(bytes: number) { if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`; return `${(bytes / 1024 / 1024).toFixed(1)} MB`; }

function downloadPrototypeFile(filename: string, showToast: (message: string) => void) {
  const blob = new Blob([`Brisk prototype download: ${filename}\n`], { type: "text/plain" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
  showToast(`Downloading ${filename}`);
}

async function copyShareLink(deliverableId: string, showToast: (message: string) => void) {
  try { await navigator.clipboard?.writeText(`https://share.brisk.prototype/masters/${deliverableId}`); } catch { /* Prototype feedback remains available when clipboard access is blocked. */ }
  showToast("Share link copied.");
}
