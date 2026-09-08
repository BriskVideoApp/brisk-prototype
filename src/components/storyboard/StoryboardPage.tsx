"use client";

import Link from "next/link";
import {
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type DragEvent,
} from "react";
import { Button } from "../../../Brisk DS/src/app/components/Button";
import type { Project } from "@/components/active-videos/types";
import { CommentRail } from "@/components/comment-rail/CommentRail";
import { useMediaLibrary } from "@/components/media/MediaLibraryContext";
import { usePrototypeRole } from "@/components/navigation/PrototypeRoleContext";
import type { PrototypeRole } from "@/components/navigation/PrototypeRoleContext";
import { ProjectStageHeader } from "@/components/project/ProjectStageHeader";
import { useProjectStageStatus } from "@/components/project/ProjectStageStatusContext";
import { ShareActionRow } from "@/components/share/ShareActionRow";
import {
  ScriptMediaPicker,
  scriptMediaPickerOptions,
} from "@/components/script/ScriptMediaPicker";
import { ScriptDocumentControls } from "@/components/script/ScriptDocumentControls";
import { ScriptVersionControl } from "@/components/script/ScriptVersionControl";
import { ReusableScriptAvEditor } from "@/components/script/ScriptPage";
import { StoryboardFrameReview } from "@/components/storyboard/StoryboardFrameReview";
import { useStoryboard } from "@/components/storyboard/StoryboardContext";
import { DsIcon } from "@/components/video-review/DsIcon";
import type { ReviewComment } from "@/components/video-review/types";
import type {
  ScriptComment,
  ScriptMediaItem,
  ScriptMediaType,
  ScriptRow,
} from "@/data/script";
import type { StoryboardFrame, StoryboardImage } from "@/data/storyboard";
import { reviewUsers } from "@/data/video-review";
import {
  openDocumentExportPreview,
  type StoryboardExportPayload,
} from "@/lib/document-export";

type StoryboardView = "board" | "av";
type PendingEdit = { label: string; action: () => void };
type MediaPickerOrigin = "image" | "menu" | "review";
type StoryboardDropTarget = {
  frameId: string;
  position: "before" | "after";
};
const storyboardOverallCommentAnchor = { kind: "overall", label: "Overall" } as const;

export function StoryboardPage({ project }: { project: Project }) {
  const { selectedRole } = usePrototypeRole();
  const { addAssets, assetViews } = useMediaLibrary();
  const { getProjectStages } = useProjectStageStatus();
  const {
    addFrame,
    approveStoryboard,
    createBlankVersion,
    createStoryboard,
    deleteFrame,
    deleteVersion,
    duplicateFrame,
    duplicateVersion,
    getStoryboard,
    insertFrame,
    makeEditableVersion,
    reorderFrame,
    requestStoryboardReview,
    redoStoryboard,
    renameVersion,
    selectVersion,
    undoStoryboard,
    unapproveStoryboard,
    updateFrame,
    updateFrameComments,
  } = useStoryboard();
  const record = getStoryboard(project.id);
  const currentVersion = record?.versions.find((version) => version.id === record.currentVersionId)
    ?? record?.versions.at(-1);
  const scriptStatus = getProjectStages(project).script;
  const isScriptApproved = scriptStatus.state === "done";
  const isStoryboardApproved = Boolean(currentVersion?.approvedSnapshot && record?.status.state === "done");
  const [view, setView] = useState<StoryboardView>("board");
  const [isCreateConfirmationOpen, setIsCreateConfirmationOpen] = useState(false);
  const [isDeleteVersionConfirmationOpen, setIsDeleteVersionConfirmationOpen] = useState(false);
  const [isActionsOpen, setIsActionsOpen] = useState(false);
  const [isCommentsOverviewOpen, setIsCommentsOverviewOpen] = useState(false);
  const [isVersionsPanelOpen, setIsVersionsPanelOpen] = useState(false);
  const [commentsPanelTop, setCommentsPanelTop] = useState(0);
  const [pendingEdit, setPendingEdit] = useState<PendingEdit | null>(null);
  const [openMediaPicker, setOpenMediaPicker] = useState<{ frameId: string; origin: MediaPickerOrigin } | null>(null);
  const [openFrameMenuId, setOpenFrameMenuId] = useState<string | null>(null);
  const [reviewFrameId, setReviewFrameId] = useState<string | null>(null);
  const [draggingFrameId, setDraggingFrameId] = useState<string | null>(null);
  const [dropTarget, setDropTarget] = useState<StoryboardDropTarget | null>(null);
  const [uploadFrameId, setUploadFrameId] = useState<string | null>(null);
  const [toast, setToast] = useState("");
  const uploadInputRef = useRef<HTMLInputElement>(null);
  const toolbarRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const linkedFrameId = new URLSearchParams(window.location.search).get("frame");
    if (linkedFrameId) setReviewFrameId(linkedFrameId);
  }, []);

  const runEditableAction = (label: string, action: () => void) => {
    if (isStoryboardApproved) {
      setPendingEdit({ label, action });
      return;
    }
    action();
  };

  const imageUrlFor = (image: StoryboardImage | null) => {
    if (!image) return undefined;
    if (image.sourceUrl) return image.sourceUrl;
    return assetViews.find((asset) => asset.id === image.assetId)?.thumbnailUrl;
  };

  const setFrameImage = (frameId: string, image: StoryboardImage | null) => {
    runEditableAction(image ? "change an image" : "remove an image", () => {
      updateFrame(project.id, frameId, (frame) => ({ ...frame, image }));
      setOpenMediaPicker(null);
      setToast(image ? "Frame image updated." : "Frame image removed.");
    });
  };

  const selectImageSource = (frameId: string, source: ScriptMediaType) => {
    if (source === "upload") {
      setUploadFrameId(frameId);
      uploadInputRef.current?.click();
      setOpenMediaPicker(null);
      return;
    }

    if (source === "library") {
      const mediaAsset = assetViews.find((asset) => (
        asset.projectId === project.id
        && !asset.archivedAt
        && Boolean(asset.thumbnailUrl)
      ));
      if (!mediaAsset) {
        setToast("Add an image to project Media first.");
        setOpenMediaPicker(null);
        return;
      }
      setFrameImage(frameId, {
        id: `storyboard-image-${Date.now()}`,
        source,
        label: mediaAsset.name,
        assetId: mediaAsset.id,
      });
      return;
    }

    if (source === "stock") {
      setFrameImage(frameId, {
        id: `storyboard-image-${Date.now()}`,
        source,
        label: "Stock image reference",
      });
      return;
    }

    const sourceUrl = window.prompt("Paste an image link");
    if (!sourceUrl?.trim()) return;
    setFrameImage(frameId, {
      id: `storyboard-image-${Date.now()}`,
      source,
      label: "Linked storyboard image",
      sourceUrl: sourceUrl.trim(),
    });
  };

  const uploadImage = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    const frameId = uploadFrameId;
    if (!file || !frameId) {
      event.target.value = "";
      return;
    }
    const sourceUrl = URL.createObjectURL(file);
    const [assetId] = addAssets(project.id, null, [{
      name: file.name,
      kind: "image",
      sizeBytes: file.size,
      thumbnailUrl: sourceUrl,
    }]);
    setFrameImage(frameId, {
      id: `storyboard-image-${Date.now()}`,
      source: "upload",
      label: file.name,
      assetId,
      sourceUrl,
    });
    setUploadFrameId(null);
    event.target.value = "";
  };

  const reorder = (frameId: string, targetFrameId: string, position: StoryboardDropTarget["position"]) => {
    runEditableAction("reorder frames", () => {
      reorderFrame(project.id, frameId, targetFrameId, position);
      setDraggingFrameId(null);
      setDropTarget(null);
      setToast("Storyboard order updated. The Script order is unchanged.");
    });
  };

  const copyFrameLink = async (frameId: string) => {
    const url = new URL(`/projects/${project.id}/stages/storyboard`, window.location.origin);
    url.searchParams.set("frame", frameId);
    try {
      await navigator.clipboard?.writeText(url.toString());
    } catch {
      // Clipboard access can be blocked in the prototype.
    }
    setToast("Link copied. Anyone with project access can view this frame.");
  };

  const downloadFrameImage = (frame: StoryboardFrame, frameNumber: number) => {
    const imageUrl = imageUrlFor(frame.image);
    if (!imageUrl || !frame.image) return;
    const download = document.createElement("a");
    download.href = imageUrl;
    download.download = frame.image.label || `Storyboard frame ${frameNumber}`;
    download.rel = "noopener";
    download.target = "_blank";
    download.click();
    setToast(`Downloading ${frame.image.label}.`);
  };

  const downloadCurrentVersion = () => {
    if (!currentVersion) return;
    const payload: StoryboardExportPayload = {
      kind: "storyboard",
      projectId: project.id,
      projectName: project.name,
      clientName: project.clientName,
      studioName: "North Star Films",
      documentTitle: currentVersion.snapshotName,
      versionLabel: currentVersion.label,
      createdAt: currentVersion.createdAt,
      rows: toReusableScriptRows(currentVersion.frames),
    };
    openDocumentExportPreview(payload);
    setToast(`PDF preview opened for ${currentVersion.label}.`);
  };

  const openAllComments = () => {
    setCommentsPanelTop(toolbarRef.current?.getBoundingClientRect().bottom ?? 0);
    setIsCommentsOverviewOpen((isOpen) => !isOpen);
    setIsActionsOpen(false);
    setIsVersionsPanelOpen(false);
  };

  const renameCurrentVersion = () => {
    if (!currentVersion) return;
    const displayName = window.prompt("Rename version", currentVersion.displayName ?? project.name);
    if (!displayName?.trim()) return;
    renameVersion(project.id, currentVersion.id, displayName);
    setToast("Storyboard version renamed.");
  };

  const reviewedFrame = currentVersion?.frames.find((frame) => frame.id === reviewFrameId);
  const reviewedFrameNumber = reviewedFrame && currentVersion
    ? currentVersion.frames.findIndex((frame) => frame.id === reviewedFrame.id) + 1
    : 0;
  const scriptRows = currentVersion ? toReusableScriptRows(currentVersion.frames) : [];
  const scriptCommentsByRow = currentVersion ? toReusableScriptComments(currentVersion.frames) : new Map<string, ScriptComment[]>();
  const allStoryboardComments = [...scriptCommentsByRow.values()].flat();
  const visibleStoryboardComments = selectedRole === "Customer"
    ? allStoryboardComments.filter((comment) => comment.visibility === "external")
    : allStoryboardComments;

  return (
    <main className={`storyboard-shell ${isCommentsOverviewOpen ? "comments-overview-open" : ""}`}>
      <ProjectStageHeader activeStage="storyboard" project={project} />
      <input ref={uploadInputRef} type="file" accept="image/*" hidden onChange={uploadImage} />

      {record && currentVersion ? (
        <>
          <div className="storyboard-toolbar" ref={toolbarRef}>
            <div className="storyboard-toolbar-controls">
              <div className="storyboard-view-toggle" role="group" aria-label="Storyboard view">
                <button className={`label-s-semibold ${view === "board" ? "active" : ""}`} type="button" aria-pressed={view === "board"} onClick={() => setView("board")}>
                  <DsIcon name="grid-four" size={16} /> Board
                </button>
                <button className={`label-s-semibold ${view === "av" ? "active" : ""}`} type="button" aria-pressed={view === "av"} onClick={() => setView("av")}>
                  <DsIcon name="columns" size={16} /> AV
                </button>
              </div>
              <ScriptVersionControl
                currentShortLabel={currentVersion.label.replace(/^v(?=\d)/u, "V")}
                isOpen={isVersionsPanelOpen}
                items={record.versions.map((version) => ({
                  id: version.id,
                  shortLabel: version.label.replace(/^v(?=\d)/u, "V"),
                  displayName: version.displayName?.trim() || project.name,
                  metaLabel: version.id === currentVersion.id
                    ? "Current • Saved"
                    : version.approvedSnapshot && version.approvedAt
                      ? `Approved ${version.approvedAt}`
                      : `Last edited ${version.createdAt}`,
                  isCurrent: version.id === currentVersion.id,
                  isSelected: version.id === currentVersion.id,
                }))}
                onCreateVersion={() => {
                  createBlankVersion(project.id, selectedRole === "Customer" ? "Customer" : "Studio");
                  setToast("Blank Storyboard version created.");
                }}
                onDuplicateCurrentVersion={() => {
                  duplicateVersion(project.id, currentVersion.id, selectedRole === "Customer" ? "Customer" : "Studio");
                  setToast("Storyboard version duplicated.");
                }}
                onOpenChange={(isOpen) => {
                  setIsVersionsPanelOpen(isOpen);
                  if (isOpen) {
                    setIsActionsOpen(false);
                    setIsCommentsOverviewOpen(false);
                  }
                }}
                onRenameCurrentVersion={renameCurrentVersion}
                onSelectVersion={(versionId) => selectVersion(project.id, versionId)}
              />
            </div>
            <div className="storyboard-toolbar-meta">
              <div className="script-document-actions" aria-label="Storyboard controls">
                <ScriptDocumentControls
                  actionsLabel="Storyboard"
                  isActionsOpen={isActionsOpen}
                  isCommentsOpen={isCommentsOverviewOpen}
                  onActionsOpenChange={(isOpen) => {
                    setIsActionsOpen(isOpen);
                    if (isOpen) {
                      setIsCommentsOverviewOpen(false);
                      setIsVersionsPanelOpen(false);
                    }
                  }}
                  onCommentsToggle={openAllComments}
                  actions={[
                    {
                      id: "undo",
                      label: "Undo",
                      icon: "arrow-counter-clockwise",
                      onSelect: () => runEditableAction("undo the last change", () => {
                        undoStoryboard(project.id);
                        setToast("Last Storyboard change undone.");
                      }),
                    },
                    {
                      id: "redo",
                      label: "Redo",
                      icon: "arrow-clockwise",
                      onSelect: () => runEditableAction("redo the last change", () => {
                        redoStoryboard(project.id);
                        setToast("Storyboard change restored.");
                      }),
                    },
                    {
                      id: "download-pdf",
                      label: "Download PDF",
                      dividerBefore: true,
                      onSelect: downloadCurrentVersion,
                    },
                    {
                      id: "delete-version",
                      label: "Delete version",
                      dividerBefore: true,
                      tone: "danger",
                      disabled: currentVersion.approvedSnapshot || record.versions.length <= 1,
                      title: currentVersion.approvedSnapshot
                        ? "The approved version can't be deleted. Unapprove or approve a different version first."
                        : record.versions.length <= 1 ? "A Storyboard needs at least one version." : undefined,
                      onSelect: () => setIsDeleteVersionConfirmationOpen(true),
                    },
                  ]}
                />
              </div>
            </div>
          </div>

          {view === "board" ? (
            <StoryboardBoard
              frames={currentVersion.frames}
              draggingFrameId={draggingFrameId}
              dropTarget={dropTarget}
              openFrameMenuId={openFrameMenuId}
              openMediaPicker={openMediaPicker}
              imageUrlFor={imageUrlFor}
              onDelete={(frameId) => runEditableAction("delete a frame", () => deleteFrame(project.id, frameId))}
              onAdd={() => runEditableAction("add a frame", () => addFrame(project.id))}
              onDragEnd={() => {
                setDraggingFrameId(null);
                setDropTarget(null);
              }}
              onDragStart={(event, frameId) => {
                if (isStoryboardApproved) {
                  event.preventDefault();
                  setPendingEdit({ label: "reorder frames", action: () => undefined });
                  return;
                }
                setDraggingFrameId(frameId);
                event.dataTransfer.effectAllowed = "move";
              }}
              onDrop={(target) => {
                if (draggingFrameId) reorder(draggingFrameId, target.frameId, target.position);
              }}
              onDropTarget={setDropTarget}
              onDuplicate={(frameId) => runEditableAction("duplicate a frame", () => duplicateFrame(project.id, frameId))}
              onDurationChange={(frameId, durationSeconds) => runEditableAction("change a frame duration", () => {
                updateFrame(project.id, frameId, (frame) => ({ ...frame, durationSeconds }));
              })}
              onCopyLink={(frameId) => void copyFrameLink(frameId)}
              onDownload={downloadFrameImage}
              onImageSource={selectImageSource}
              onOpenFrame={setReviewFrameId}
              onRemoveImage={(frameId) => setFrameImage(frameId, null)}
              onToggleFrameMenu={(frameId) => setOpenFrameMenuId((current) => current === frameId ? null : frameId)}
              onToggleMedia={(frameId, origin, isOpen) => setOpenMediaPicker(isOpen ? { frameId, origin } : null)}
            />
          ) : (
            <ReusableScriptAvEditor
              rows={scriptRows}
              commentsByRow={scriptCommentsByRow}
              isApproved={isStoryboardApproved}
              onAddMediaItem={selectImageSource}
              onAddRowAfter={(frameId) => insertFrame(project.id, frameId, "after")}
              onAddRowBefore={(frameId) => insertFrame(project.id, frameId, "before")}
              onDeleteRow={(frameId) => deleteFrame(project.id, frameId)}
              onDuplicateRow={(frameId) => duplicateFrame(project.id, frameId)}
              onOpenRowComment={setReviewFrameId}
              onReorderRows={(frameId, beforeFrameId) => reorder(frameId, beforeFrameId, "before")}
              onRequestEdit={() => setPendingEdit({ label: "edit the Storyboard", action: () => undefined })}
              onSetField={(frameId, field, value) => updateFrame(project.id, frameId, (frame) => ({ ...frame, [field]: value }))}
            />
          )}

          {isCommentsOverviewOpen ? (
            <div
              className="script-comment-popover overview"
              style={{
                height: `calc(100vh - ${commentsPanelTop}px - var(--storyboard-footer-height))`,
                top: `${commentsPanelTop}px`,
              }}
            >
              <CommentRail
                activeAnchor={storyboardOverallCommentAnchor}
                ariaLabel="Storyboard comments"
                comments={visibleStoryboardComments}
                composerAnchor={storyboardOverallCommentAnchor}
                composerPlacement="top"
                currentUserId={selectedRole === "Customer" ? "user-jess" : "user-tom"}
                showComposer={false}
                users={reviewUsers}
                canPostInternal={selectedRole !== "Customer"}
                canSeeInternal={selectedRole !== "Customer"}
                filterMode={selectedRole === "Customer" ? "customer" : "studio"}
                title={`Comments (${visibleStoryboardComments.length})`}
                onClose={() => setIsCommentsOverviewOpen(false)}
                onCommentsChange={(comments) => mergeStoryboardComments(
                  currentVersion.frames,
                  selectedRole,
                  comments,
                  (frameId, nextComments) => updateFrameComments(project.id, frameId, nextComments),
                )}
                onSelectComment={(comment) => {
                  if (comment.anchor.rowId) setReviewFrameId(comment.anchor.rowId);
                  setIsCommentsOverviewOpen(false);
                }}
              />
            </div>
          ) : null}

          <footer className="storyboard-footer">
            <div className="storyboard-count label-s">
              {currentVersion.frames.length} {currentVersion.frames.length === 1 ? "frame" : "frames"}
              <span aria-hidden="true">·</span>
              {currentVersion.frames.reduce((count, frame) => count + (frame.image ? 1 : 0), 0)} illustrated
            </div>
            <div className="storyboard-footer-actions" aria-label="Storyboard review actions">
              <ShareActionRow
                context="storyboard"
                userRole={selectedRole}
                initialAccess="canComment"
                projectName={project.name}
                customerName={project.clientName}
                studioName="North Star Films"
                copyLinkIconOnly
                approveLabel="Approve Storyboard"
                approvedAt={currentVersion.approvedAt}
                approvedBy={currentVersion.approvedBy}
                isApproved={isStoryboardApproved}
                onApprove={() => approveStoryboard(project.id, selectedRole === "Customer" ? project.clientName : "Tom")}
                onUnapprove={() => unapproveStoryboard(project.id)}
                onRequestReview={() => requestStoryboardReview(project.id)}
                onSendToStudio={() => requestStoryboardReview(project.id)}
              />
            </div>
          </footer>
        </>
      ) : (
        <StoryboardCreationState
          isScriptApproved={isScriptApproved}
          projectId={project.id}
          onCreate={() => setIsCreateConfirmationOpen(true)}
        />
      )}

      {toast ? (
        <div className="storyboard-toast label-s-semibold" role="status">
          <DsIcon name="check-circle" size={18} />
          {toast}
          <button type="button" aria-label="Dismiss" onClick={() => setToast("")}><DsIcon name="x-close-cross" size={12} /></button>
        </div>
      ) : null}

      {isCreateConfirmationOpen ? (
        <ConfirmationDialog
          title="Create Storyboard from the approved Script?"
          description="Brisk will create one editable Storyboard frame for every Script row. The approved Script stays unchanged."
          confirmLabel="Create Storyboard"
          onCancel={() => setIsCreateConfirmationOpen(false)}
          onConfirm={() => {
            createStoryboard(project.id, selectedRole === "Customer" ? "Customer" : "Studio");
            setIsCreateConfirmationOpen(false);
            setToast("Storyboard created from the approved Script.");
          }}
        />
      ) : null}

      {pendingEdit ? (
        <ConfirmationDialog
          title="This Storyboard is approved"
          description={`To ${pendingEdit.label}, Brisk will create a new editable Storyboard version and remove the current Storyboard approval. The Script remains approved and unchanged.`}
          confirmLabel="Create editable version"
          onCancel={() => setPendingEdit(null)}
          onConfirm={() => {
            makeEditableVersion(project.id, selectedRole === "Customer" ? "Customer" : "Studio");
            pendingEdit.action();
            setPendingEdit(null);
            setToast("New editable Storyboard version created.");
          }}
        />
      ) : null}

      {isDeleteVersionConfirmationOpen && currentVersion ? (
        <ConfirmationDialog
          title={`Delete Storyboard ${currentVersion.label}?`}
          description="This removes the selected Storyboard version. Other versions and the approved Script stay unchanged."
          confirmLabel="Delete version"
          onCancel={() => setIsDeleteVersionConfirmationOpen(false)}
          onConfirm={() => {
            deleteVersion(project.id, currentVersion.id);
            setIsDeleteVersionConfirmationOpen(false);
            setToast("Storyboard version deleted.");
          }}
        />
      ) : null}

      {reviewedFrame ? (
        <StoryboardFrameReview
          frame={reviewedFrame}
          frameNumber={reviewedFrameNumber}
          imageUrl={imageUrlFor(reviewedFrame.image)}
          isMediaPickerOpen={openMediaPicker?.frameId === reviewedFrame.id && openMediaPicker.origin === "review"}
          role={selectedRole}
          onClose={() => setReviewFrameId(null)}
          onCommentsChange={(comments) => updateFrameComments(project.id, reviewedFrame.id, comments)}
          onCopyLink={() => void copyFrameLink(reviewedFrame.id)}
          onDelete={() => runEditableAction("delete a frame", () => deleteFrame(project.id, reviewedFrame.id))}
          onDownload={() => downloadFrameImage(reviewedFrame, reviewedFrameNumber)}
          onDuplicate={() => runEditableAction("duplicate a frame", () => duplicateFrame(project.id, reviewedFrame.id))}
          onMediaPickerOpenChange={(isOpen) => setOpenMediaPicker(isOpen ? { frameId: reviewedFrame.id, origin: "review" } : null)}
          onMediaSource={(source) => selectImageSource(reviewedFrame.id, source)}
          onRemoveMedia={() => setFrameImage(reviewedFrame.id, null)}
        />
      ) : null}
    </main>
  );
}

function StoryboardCreationState({
  isScriptApproved,
  projectId,
  onCreate,
}: {
  isScriptApproved: boolean;
  projectId: string;
  onCreate: () => void;
}) {
  return (
    <section className="storyboard-creation-state">
      <span className={`storyboard-creation-icon ${isScriptApproved ? "ready" : "locked"}`} aria-hidden="true">
        <DsIcon name={isScriptApproved ? "grid-four" : "lock"} size={30} />
      </span>
      <div>
        <span className="label-xs-semibold">Storyboard · Not started</span>
        <h1 className="headings-s-bold">{isScriptApproved ? "The approved Script is ready to storyboard" : "Approve the Script before creating a Storyboard"}</h1>
        <p className="label-s">
          {isScriptApproved
            ? "Create one frame for every approved Script row. You can then reorder frames, add one image per frame and request Client review."
            : "Storyboard creation uses an approved Script snapshot, so the words and visual direction have a clear source."}
        </p>
        <div className="storyboard-creation-actions">
          {isScriptApproved ? <Button size="M" onClick={onCreate}>Create Storyboard</Button> : null}
          <Link className="storyboard-script-link label-s-semibold" href={`/projects/${encodeURIComponent(projectId)}/script`}>
            {isScriptApproved ? "View approved Script" : "Open Script"}
          </Link>
        </div>
      </div>
    </section>
  );
}

function StoryboardBoard({
  frames,
  draggingFrameId,
  dropTarget,
  openFrameMenuId,
  openMediaPicker,
  imageUrlFor,
  onAdd,
  onDelete,
  onDragEnd,
  onDragStart,
  onDrop,
  onDropTarget,
  onDuplicate,
  onDurationChange,
  onCopyLink,
  onDownload,
  onImageSource,
  onOpenFrame,
  onRemoveImage,
  onToggleFrameMenu,
  onToggleMedia,
}: {
  frames: StoryboardFrame[];
  draggingFrameId: string | null;
  dropTarget: StoryboardDropTarget | null;
  openFrameMenuId: string | null;
  openMediaPicker: { frameId: string; origin: MediaPickerOrigin } | null;
  imageUrlFor: (image: StoryboardImage | null) => string | undefined;
  onAdd: () => void;
  onDelete: (frameId: string) => void;
  onDragEnd: () => void;
  onDragStart: (event: DragEvent<HTMLElement>, frameId: string) => void;
  onDrop: (target: StoryboardDropTarget) => void;
  onDropTarget: (target: StoryboardDropTarget | null) => void;
  onDuplicate: (frameId: string) => void;
  onDurationChange: (frameId: string, durationSeconds: number) => void;
  onCopyLink: (frameId: string) => void;
  onDownload: (frame: StoryboardFrame, frameNumber: number) => void;
  onImageSource: (frameId: string, source: ScriptMediaType) => void;
  onOpenFrame: (frameId: string) => void;
  onRemoveImage: (frameId: string) => void;
  onToggleFrameMenu: (frameId: string) => void;
  onToggleMedia: (frameId: string, origin: MediaPickerOrigin, isOpen: boolean) => void;
}) {
  return (
    <section className="storyboard-board" aria-label="Storyboard frames">
      {frames.map((frame, index) => {
        const imageUrl = imageUrlFor(frame.image);
        const dropPosition = dropTarget?.frameId === frame.id ? dropTarget.position : null;
        return (
          <article
            className={`storyboard-card ${draggingFrameId === frame.id ? "dragging" : ""} ${dropPosition ? `drop-${dropPosition}` : ""}`}
            draggable
            key={frame.id}
            onDragStart={(event) => onDragStart(event, frame.id)}
            onDragEnd={onDragEnd}
            onDragOver={(event) => {
              event.preventDefault();
              event.dataTransfer.dropEffect = "move";
              if (draggingFrameId === frame.id) {
                onDropTarget(null);
                return;
              }
              const bounds = event.currentTarget.getBoundingClientRect();
              onDropTarget({
                frameId: frame.id,
                position: event.clientX < bounds.left + (bounds.width / 2) ? "before" : "after",
              });
            }}
            onDrop={(event) => {
              event.preventDefault();
              if (draggingFrameId === frame.id) return;
              const bounds = event.currentTarget.getBoundingClientRect();
              onDrop({
                frameId: frame.id,
                position: event.clientX < bounds.left + (bounds.width / 2) ? "before" : "after",
              });
            }}
          >
            <header className="storyboard-card-header">
              <span className="storyboard-drag-handle" aria-hidden="true"><DsIcon name="dots-six-vertical" size={18} /></span>
              <strong className="label-s-semibold">Frame {String(index + 1).padStart(2, "0")}</strong>
              <StoryboardDurationControl
                durationSeconds={frame.durationSeconds}
                frameNumber={index + 1}
                onChange={(durationSeconds) => onDurationChange(frame.id, durationSeconds)}
              />
              <div className="storyboard-card-menu-wrap">
                <button className="storyboard-icon-button" type="button" aria-label={`Frame ${index + 1} actions`} onClick={() => onToggleFrameMenu(frame.id)}>
                  <DsIcon name="dots-three-vertical" size={17} />
                </button>
                {openFrameMenuId === frame.id ? (
                  <div className="storyboard-card-menu" role="menu">
                    {frame.image ? (
                      <>
                        <ScriptMediaPicker
                          isOpen={openMediaPicker?.frameId === frame.id && openMediaPicker.origin === "menu"}
                          options={scriptMediaPickerOptions}
                          triggerLabel={`Replace media for frame ${index + 1}`}
                          triggerClassName="storyboard-card-menu-picker label-s"
                          triggerIcon={null}
                          triggerText="Replace media"
                          onOpenChange={(isOpen) => onToggleMedia(frame.id, "menu", isOpen)}
                          onSelect={(source) => {
                            onImageSource(frame.id, source);
                            onToggleFrameMenu(frame.id);
                          }}
                        />
                        <button
                          className="label-s danger"
                          type="button"
                          role="menuitem"
                          onClick={() => {
                            onRemoveImage(frame.id);
                            onToggleFrameMenu(frame.id);
                          }}
                        >
                          Delete media
                        </button>
                      </>
                    ) : null}
                    <button className="label-s" type="button" role="menuitem" onClick={() => onDuplicate(frame.id)}>Duplicate frame</button>
                    <button className="label-s danger" type="button" role="menuitem" onClick={() => onDelete(frame.id)}>Delete frame</button>
                  </div>
                ) : null}
              </div>
            </header>

            <div className="storyboard-image-area">
              {imageUrl ? (
                <button
                  className="storyboard-image-review"
                  type="button"
                  aria-label={`Open review for frame ${index + 1}`}
                  onClick={() => onOpenFrame(frame.id)}
                >
                  <img draggable={false} src={imageUrl} alt={frame.image?.label ?? `Frame ${index + 1}`} />
                </button>
              ) : (
                <div className="storyboard-image-placeholder">
                  <ScriptMediaPicker
                    isOpen={openMediaPicker?.frameId === frame.id && openMediaPicker.origin === "image"}
                    options={scriptMediaPickerOptions}
                    triggerLabel={`Add image or footage to frame ${index + 1}`}
                    triggerClassName="storyboard-image-empty-picker label-xs"
                    triggerIcon="image-square"
                    triggerIconSize={27}
                    triggerText="Add Image"
                    onOpenChange={(isOpen) => onToggleMedia(frame.id, "image", isOpen)}
                    onSelect={(source) => onImageSource(frame.id, source)}
                  />
                </div>
              )}
              {imageUrl ? (
                <div className="storyboard-image-actions">
                  <ScriptMediaPicker
                    isOpen={openMediaPicker?.frameId === frame.id && openMediaPicker.origin === "image"}
                    options={scriptMediaPickerOptions}
                    triggerLabel={`Replace image for frame ${index + 1}`}
                    triggerClassName="storyboard-image-picker label-xs-semibold"
                    triggerIcon="arrows-clockwise"
                    triggerText="Replace"
                    onOpenChange={(isOpen) => onToggleMedia(frame.id, "image", isOpen)}
                    onSelect={(source) => onImageSource(frame.id, source)}
                  />
                </div>
              ) : null}
            </div>
            <div className="storyboard-card-copy">
              <p className="label-s-semibold">{frame.words}</p>
              <p className="label-xs">{frame.visuals}</p>
            </div>
            <div className="storyboard-card-actions" aria-label={`Actions for frame ${index + 1}`}>
              <button
                className="media-icon-button"
                type="button"
                aria-label={`Comment on frame ${index + 1}`}
                data-tooltip="Comment"
                onClick={() => onOpenFrame(frame.id)}
              >
                <DsIcon name="chat-circle" size={16} />
                {frame.comments.length ? (
                  <span className="media-comment-count label-xs-semibold">{frame.comments.length}</span>
                ) : null}
              </button>
              <button
                className="media-icon-button"
                type="button"
                aria-label={`Copy link to frame ${index + 1}`}
                data-tooltip="Copy link"
                onClick={() => onCopyLink(frame.id)}
              >
                <DsIcon name="link" size={16} />
              </button>
              <button
                className="media-icon-button"
                type="button"
                aria-label={frame.image ? `Download image from frame ${index + 1}` : `No image to download from frame ${index + 1}`}
                data-tooltip={frame.image ? "Download" : "No image to download"}
                disabled={!frame.image}
                onClick={() => onDownload(frame, index + 1)}
              >
                <DsIcon name="download" size={16} />
              </button>
              {frame.image ? (
                <button
                  className="media-icon-button"
                  type="button"
                  aria-label={`Remove image from frame ${index + 1}`}
                  data-tooltip="Remove image"
                  onClick={() => onRemoveImage(frame.id)}
                >
                  <DsIcon name="trash" size={16} />
                </button>
              ) : null}
            </div>
          </article>
        );
      })}
      <div className="storyboard-add-frame-cell">
        <Button variant="secondary" size="S" onClick={onAdd}>+ Add frame</Button>
      </div>
    </section>
  );
}

function StoryboardDurationControl({
  durationSeconds,
  frameNumber,
  onChange,
}: {
  durationSeconds: number;
  frameNumber: number;
  onChange: (durationSeconds: number) => void;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [draftDuration, setDraftDuration] = useState(String(durationSeconds));

  useEffect(() => {
    setDraftDuration(String(durationSeconds));
  }, [durationSeconds]);

  const finishEditing = () => {
    const parsedDuration = Number(draftDuration);
    if (!Number.isFinite(parsedDuration) || parsedDuration < 1) {
      setDraftDuration(String(durationSeconds));
      setIsEditing(false);
      return;
    }

    const nextDuration = Math.max(1, Math.round(parsedDuration));
    setDraftDuration(String(nextDuration));
    setIsEditing(false);
    if (nextDuration !== durationSeconds) onChange(nextDuration);
  };

  if (!isEditing) {
    return (
      <button
        className="storyboard-duration-button label-xs"
        type="button"
        aria-label={`Edit duration for frame ${frameNumber}. Current duration ${durationSeconds} seconds.`}
        data-tooltip="Edit duration"
        onPointerDown={(event) => event.stopPropagation()}
        onDragStart={(event) => {
          event.preventDefault();
          event.stopPropagation();
        }}
        onClick={() => setIsEditing(true)}
      >
        {durationSeconds}s
      </button>
    );
  }

  return (
    <span
      className="storyboard-duration-editor label-xs"
      onPointerDown={(event) => event.stopPropagation()}
      onDragStart={(event) => {
        event.preventDefault();
        event.stopPropagation();
      }}
    >
      <input
        autoFocus
        type="text"
        inputMode="numeric"
        pattern="[0-9]*"
        draggable={false}
        aria-label={`Duration in seconds for frame ${frameNumber}`}
        value={draftDuration}
        onFocus={(event) => event.currentTarget.select()}
        onChange={(event) => {
          if (/^\d*$/u.test(event.target.value)) setDraftDuration(event.target.value);
        }}
        onBlur={finishEditing}
        onKeyDown={(event) => {
          if (event.key === "Enter") event.currentTarget.blur();
          if (event.key === "Escape") {
            setDraftDuration(String(durationSeconds));
            setIsEditing(false);
          }
        }}
      />
      <span aria-hidden="true">s</span>
    </span>
  );
}

function ConfirmationDialog({
  title,
  description,
  confirmLabel,
  onCancel,
  onConfirm,
}: {
  title: string;
  description: string;
  confirmLabel: string;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className="storyboard-dialog-backdrop" role="presentation" onMouseDown={onCancel}>
      <section className="storyboard-dialog" role="dialog" aria-modal="true" aria-labelledby="storyboard-dialog-title" onMouseDown={(event) => event.stopPropagation()}>
        <span className="storyboard-dialog-icon" aria-hidden="true"><DsIcon name="grid-four" size={24} /></span>
        <h2 className="headings-xs-bold" id="storyboard-dialog-title">{title}</h2>
        <p className="label-s">{description}</p>
        <div className="storyboard-dialog-actions">
          <Button variant="secondary" size="S" onClick={onCancel}>Cancel</Button>
          <Button size="S" onClick={onConfirm}>{confirmLabel}</Button>
        </div>
      </section>
    </div>
  );
}

function toReusableScriptRows(frames: StoryboardFrame[]): ScriptRow[] {
  const tones: ScriptMediaItem["tone"][] = ["cyan", "lime", "purple", "pink", "yellow"];
  return frames.map((frame, index) => ({
    id: frame.id,
    words: frame.words,
    visuals: frame.visuals,
    durationSeconds: frame.durationSeconds,
    elementType: "action",
    media: frame.image
      ? [{
          id: frame.image.id,
          type: frame.image.source,
          label: frame.image.label,
          meta: "Storyboard image",
          tone: tones[index % tones.length],
        }]
      : [],
  }));
}

function toReusableScriptComments(frames: StoryboardFrame[]) {
  return new Map(frames.map((frame, index) => [
    frame.id,
    frame.comments.map((comment): ScriptComment => ({
      id: comment.id,
      authorId: comment.authorId,
      visibility: comment.visibility,
      anchor: {
        kind: "row",
        label: `Frame ${index + 1}`,
        rowId: frame.id,
      },
      createdAgo: comment.createdAgo,
      body: comment.body,
      resolved: comment.resolved,
      reactions: comment.reactions,
      replies: comment.replies,
    })),
  ]));
}

function mergeStoryboardComments(
  frames: StoryboardFrame[],
  role: PrototypeRole,
  comments: ScriptComment[],
  onUpdate: (frameId: string, comments: ReviewComment[]) => void,
) {
  frames.forEach((frame) => {
    const visibleComments = comments
      .filter((comment) => comment.anchor.rowId === frame.id)
      .map((comment): ReviewComment => {
        const existingComment = frame.comments.find((item) => item.id === comment.id);
        return {
          ...existingComment,
          id: comment.id,
          authorId: comment.authorId,
          visibility: comment.visibility,
          createdAgo: comment.createdAgo,
          body: comment.body,
          resolved: comment.resolved,
          reactions: comment.reactions,
          replies: comment.replies,
        };
      });
    const nextComments = role === "Customer"
      ? [
          ...frame.comments.filter((comment) => comment.visibility === "internal"),
          ...visibleComments,
        ]
      : visibleComments;

    if (JSON.stringify(nextComments) !== JSON.stringify(frame.comments)) {
      onUpdate(frame.id, nextComments);
    }
  });
}
