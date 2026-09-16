"use client";

import { useRef } from "react";
import type { ChangeEvent, KeyboardEvent } from "react";
import { DsIcon } from "./DsIcon";
import type { CommentVisibility, ReviewAttachment } from "./types";

export function ReviewCommentComposer({
  attachments = [],
  body,
  canUndoDrawing = false,
  currentTimeSeconds,
  hasAnchor,
  hasDrawingAttachment,
  hasFramePinAttachment,
  isDrawingMode,
  isEditingOverallComment,
  isPostingMenuOpen,
  canChooseVisibility = true,
  visibility,
  onAddAttachments,
  onBodyChange,
  onRemoveAnchor,
  onRemoveAttachment,
  onSetVisibility,
  onSubmit,
  onToggleDrawingMode,
  onTogglePostingMenu,
  onUndoDrawing,
}: {
  attachments?: ReviewAttachment[];
  body: string;
  canUndoDrawing?: boolean;
  currentTimeSeconds: number;
  hasAnchor: boolean;
  hasDrawingAttachment: boolean;
  hasFramePinAttachment: boolean;
  isDrawingMode: boolean;
  isEditingOverallComment: boolean;
  isPostingMenuOpen: boolean;
  canChooseVisibility?: boolean;
  visibility: CommentVisibility;
  onAddAttachments?: (files: File[]) => void;
  onBodyChange: (body: string) => void;
  onRemoveAnchor: () => void;
  onRemoveAttachment?: (attachmentId: string) => void;
  onSetVisibility: (visibility: CommentVisibility) => void;
  onSubmit: () => void;
  onToggleDrawingMode: () => void;
  onTogglePostingMenu: () => void;
  onUndoDrawing?: () => void;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isInternal = visibility === "internal";
  const canSubmit = body.trim().length > 0 || hasDrawingAttachment || attachments.length > 0;
  const addAttachments = (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);

    if (files.length > 0) {
      onAddAttachments?.(files);
    }

    event.target.value = "";
  };
  const submitWithKeyboard = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    const isSubmitKey = event.key === "Enter" && (!event.shiftKey || event.metaKey);

    if (isSubmitKey) {
      event.preventDefault();
      onSubmit();
    }
  };

  return (
    <section className={`comment-composer ${isInternal ? "internal" : ""}`} aria-label="Add comment">
      {onAddAttachments ? (
        <input
          className="visually-hidden-file-input"
          ref={fileInputRef}
          type="file"
          multiple
          aria-label="Choose feedback attachments"
          onChange={addAttachments}
        />
      ) : null}
      {canChooseVisibility ? (
        <div className="posting-menu-wrap">
          <button className="posting-toggle label-xs" type="button" onClick={onTogglePostingMenu}>
            {isInternal ? "Posting to Team" : "Posting to Client"} <DsIcon name="caret-down" size={12} />
          </button>
          {isPostingMenuOpen ? (
            <div className="posting-menu">
              <button className="label-s" type="button" onClick={() => onSetVisibility("external")}>
                Posting to Client
              </button>
              <button className="label-s" type="button" onClick={() => onSetVisibility("internal")}>
                Posting to Team
              </button>
            </div>
          ) : null}
        </div>
      ) : null}
      <div className={`composer-box ${isInternal ? "internal" : ""}`}>
        {attachments.length > 0 ? (
          <div className="review-composer-attachments" aria-label="Feedback attachments">
            {attachments.map((attachment) => (
              <span className="review-attachment-chip label-xs-semibold" key={attachment.id}>
                <DsIcon name={getAttachmentIcon(attachment.mimeType)} size={14} />
                <span>{attachment.name}</span>
                <button
                  type="button"
                  aria-label={`Remove ${attachment.name}`}
                  onClick={() => onRemoveAttachment?.(attachment.id)}
                >
                  <DsIcon name="x-close-cross" size={12} />
                </button>
              </span>
            ))}
          </div>
        ) : null}
        <textarea
          className="composer-input label-s"
          placeholder={hasAnchor
            ? `Comment on ${formatTime(currentTimeSeconds)}...`
            : isEditingOverallComment
              ? "Edit your overall comment..."
              : "Add your overall comment..."}
          rows={3}
          value={body}
          onChange={(event) => onBodyChange(event.target.value)}
          onKeyDown={submitWithKeyboard}
        />
        <div className="composer-toolbar">
          <div className="composer-tools">
            <button
              type="button"
              data-tooltip="Attach file"
              aria-label="Attach file"
              onClick={onAddAttachments ? () => fileInputRef.current?.click() : undefined}
            >
              <DsIcon name="paperclip" size={16} />
            </button>
            <button type="button" data-tooltip="Record your screen and voice" aria-label="Record your screen and voice">
              <DsIcon name="video-camera" size={16} />
            </button>
            <button
              className={`composer-drawing-toggle ${isDrawingMode ? "active" : ""}`}
              type="button"
              data-tooltip={isDrawingMode ? "Drawing mode is on" : "Draw on screen"}
              aria-label={isDrawingMode ? "Turn off drawing mode" : "Draw on screen"}
              aria-pressed={isDrawingMode}
              onClick={onToggleDrawingMode}
            >
              <DsIcon name="pencil-simple" size={16} />
            </button>
            {isDrawingMode && onUndoDrawing ? (
              <button
                className="composer-drawing-undo"
                type="button"
                data-tooltip="Undo last stroke"
                aria-label="Undo last stroke"
                disabled={!canUndoDrawing}
                onClick={onUndoDrawing}
              >
                <DsIcon name="arrow-counter-clockwise" size={16} />
              </button>
            ) : null}
          </div>
          {hasDrawingAttachment ? (
            <div className="composer-attachment-pill label-xs-semibold">
              Drawing
            </div>
          ) : null}
          {hasFramePinAttachment ? (
            <div className="composer-attachment-pill point label-xs-semibold">
              <span className="composer-point-dot" />
              Point pinned
            </div>
          ) : null}
          <div className="composer-send">
            {hasAnchor ? (
              <button
                className="anchor-chip label-xs-semibold"
                type="button"
                data-tooltip="Remove timecode to make this an overall comment"
                aria-label="Remove timecode to make this an overall comment"
                onClick={onRemoveAnchor}
              >
                @{formatTime(currentTimeSeconds)}
                <DsIcon name="x-close-cross" size={11} />
              </button>
            ) : null}
            <button
              className={`send-button ${isInternal ? "internal" : ""} ${
                isEditingOverallComment ? "update-comment-button label-xs-semibold" : ""
              }`}
              type="button"
              disabled={!canSubmit}
              aria-label={isEditingOverallComment ? "Update overall comment" : "Send comment"}
              onClick={onSubmit}
            >
              {isEditingOverallComment ? "Update" : <DsIcon name="paper-plane-tilt" size={17} />}
            </button>
          </div>
        </div>
      </div>
      <p className="composer-hint label-xs">
        {isEditingOverallComment
          ? "You can add one overall comment per version. Edit it here at any time."
          : "Cmd+Enter to send"}
      </p>
    </section>
  );
}

function formatTime(totalSeconds: number) {
  const roundedSeconds = Math.floor(totalSeconds);
  const minutes = Math.floor(roundedSeconds / 60);
  const seconds = roundedSeconds % 60;

  return `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
}

function getAttachmentIcon(mimeType: string) {
  if (mimeType.startsWith("image/")) return "image-square";
  if (mimeType.startsWith("audio/")) return "file-audio";
  if (mimeType.startsWith("video/")) return "video-camera";
  return "file-text";
}
