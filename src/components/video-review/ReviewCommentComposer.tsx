"use client";

import type { KeyboardEvent } from "react";
import { DsIcon } from "./DsIcon";
import type { CommentVisibility } from "./types";

export function ReviewCommentComposer({
  body,
  currentTimeSeconds,
  hasAnchor,
  hasDrawingAttachment,
  hasFramePinAttachment,
  isDrawingMode,
  isEditingOverallComment,
  isPostingMenuOpen,
  canChooseVisibility = true,
  visibility,
  onBodyChange,
  onRemoveAnchor,
  onSetVisibility,
  onSubmit,
  onToggleDrawingMode,
  onTogglePostingMenu,
}: {
  body: string;
  currentTimeSeconds: number;
  hasAnchor: boolean;
  hasDrawingAttachment: boolean;
  hasFramePinAttachment: boolean;
  isDrawingMode: boolean;
  isEditingOverallComment: boolean;
  isPostingMenuOpen: boolean;
  canChooseVisibility?: boolean;
  visibility: CommentVisibility;
  onBodyChange: (body: string) => void;
  onRemoveAnchor: () => void;
  onSetVisibility: (visibility: CommentVisibility) => void;
  onSubmit: () => void;
  onToggleDrawingMode: () => void;
  onTogglePostingMenu: () => void;
}) {
  const isInternal = visibility === "internal";
  const canSubmit = body.trim().length > 0 || hasDrawingAttachment;
  const submitWithKeyboard = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    const isSubmitKey = event.key === "Enter" && (!event.shiftKey || event.metaKey);

    if (isSubmitKey) {
      event.preventDefault();
      onSubmit();
    }
  };

  return (
    <section className={`comment-composer ${isInternal ? "internal" : ""}`} aria-label="Add comment">
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
        <textarea
          className="composer-input label-s"
          placeholder={hasAnchor ? `Comment on ${formatTime(currentTimeSeconds)}...` : "Add your overall comment..."}
          rows={3}
          value={body}
          onChange={(event) => onBodyChange(event.target.value)}
          onKeyDown={submitWithKeyboard}
        />
        <div className="composer-toolbar">
          <div className="composer-tools">
            <button type="button" data-tooltip="Attach file" aria-label="Attach file">
              <DsIcon name="paperclip" size={16} />
            </button>
            <button type="button" data-tooltip="Record your screen and voice" aria-label="Record your screen and voice">
              <DsIcon name="video-camera" size={16} />
            </button>
            <button
              className={isDrawingMode ? "active" : ""}
              type="button"
              data-tooltip={isDrawingMode ? "Drawing mode is on" : "Draw on screen"}
              aria-label={isDrawingMode ? "Turn off drawing mode" : "Draw on screen"}
              aria-pressed={isDrawingMode}
              onClick={onToggleDrawingMode}
            >
              <DsIcon name="pencil-simple" size={16} />
            </button>
          </div>
          {hasDrawingAttachment ? (
            <div className="composer-attachment-pill label-xs-semibold">
              <DsIcon name="pencil-simple" size={13} />
              Drawing on frame
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
                data-tooltip="Remove timecode to make an overall comment"
                aria-label="Remove timecode to make an overall comment"
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
      <p className="composer-hint label-xs">Cmd+Enter to send</p>
    </section>
  );
}

function formatTime(totalSeconds: number) {
  const roundedSeconds = Math.floor(totalSeconds);
  const minutes = Math.floor(roundedSeconds / 60);
  const seconds = roundedSeconds % 60;

  return `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
}
