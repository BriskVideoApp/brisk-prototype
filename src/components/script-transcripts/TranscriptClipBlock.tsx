"use client";

import { useState, type KeyboardEvent, type MouseEvent } from "react";
import { ScriptAnnotationPin } from "@/components/script/ScriptAnnotationPin";
import { DsIcon } from "@/components/video-review/DsIcon";
import type { MediaAsset } from "@/data/media";
import type { ScriptComment } from "@/data/script";
import type { Highlight, TranscriptClip, TranscriptParagraph } from "@/data/transcripts";
import { TranscriptClipMenu } from "./TranscriptClipMenu";
import { TranscriptInlinePlayer } from "./TranscriptInlinePlayer";
import { formatReviewTime } from "./transcriptDownloads";

export function TranscriptClipBlock({
  activeParagraphId,
  asset,
  clip,
  comments,
  currentTimeSeconds,
  highlights,
  isFocusFlashing,
  isPlaying,
  paragraphs,
  onCopy,
  onDelete,
  onHide,
  onParagraphActivate,
  onParagraphComment,
  onPlayingChange,
  onRename,
  onSelectText,
  onTimeChange,
}: {
  activeParagraphId: string | null;
  asset: MediaAsset;
  clip: TranscriptClip;
  comments: ScriptComment[];
  currentTimeSeconds: number;
  highlights: Highlight[];
  isFocusFlashing: boolean;
  isPlaying: boolean;
  paragraphs: TranscriptParagraph[];
  onCopy: () => void;
  onDelete: () => void;
  onHide: () => void;
  onParagraphActivate: (paragraph: TranscriptParagraph) => void;
  onParagraphComment: (paragraph: TranscriptParagraph, triggerRect: DOMRect) => void;
  onPlayingChange: (isPlaying: boolean) => void;
  onRename: (name: string) => void;
  onSelectText: (paragraph: TranscriptParagraph, element: HTMLElement) => void;
  onTimeChange: (seconds: number) => void;
}) {
  const [isRenaming, setIsRenaming] = useState(false);
  const [renameDraft, setRenameDraft] = useState(asset.name);
  const highlightsByParagraph = new Map<string, Highlight[]>();
  const commentsByParagraph = new Map<string, ScriptComment[]>();

  highlights.forEach((highlight) => {
    highlightsByParagraph.set(
      highlight.paragraphId,
      [...(highlightsByParagraph.get(highlight.paragraphId) ?? []), highlight],
    );
  });

  comments.forEach((comment) => {
    const paragraphId = comment.anchor.paragraphId;

    if (!paragraphId) {
      return;
    }

    commentsByParagraph.set(
      paragraphId,
      [...(commentsByParagraph.get(paragraphId) ?? []), comment],
    );
  });

  const startRenaming = () => {
    setRenameDraft(asset.name);
    setIsRenaming(true);
  };

  const saveRename = () => {
    const nextName = renameDraft.trim();

    if (nextName && nextName !== asset.name) {
      onRename(nextName);
    }

    setIsRenaming(false);
  };

  return (
    <article
      className={`transcript-clip-block ${isFocusFlashing ? "focus-flash" : ""}`}
      id={`transcript-${asset.id}`}
      data-clip-id={asset.id}
    >
      <div className="transcript-player-column">
        <div className="transcript-player-sticky">
          <TranscriptInlinePlayer
            asset={asset}
            clip={clip}
            currentTimeSeconds={currentTimeSeconds}
            isPlaying={isPlaying}
            onPlayingChange={onPlayingChange}
            onTimeChange={onTimeChange}
          />
        </div>
      </div>

      <section className="transcript-copy-column" aria-labelledby={`${clip.id}-title`}>
        <header className="transcript-clip-header">
          <div className="transcript-clip-title-wrap">
            <DsIcon name={asset.kind === "audio" ? "file-audio" : "file-video"} size={18} />
            <div>
              {isRenaming ? (
                <input
                  autoFocus
                  className="transcript-clip-rename-input label-s-semibold"
                  id={`${clip.id}-title`}
                  value={renameDraft}
                  aria-label="Rename transcript"
                  onBlur={saveRename}
                  onChange={(event) => setRenameDraft(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      saveRename();
                    }

                    if (event.key === "Escape") {
                      event.preventDefault();
                      setRenameDraft(asset.name);
                      setIsRenaming(false);
                    }
                  }}
                />
              ) : (
                <h2 className="label-s-semibold" id={`${clip.id}-title`}>{asset.name}</h2>
              )}
              <p className="label-xs">{paragraphs.length} transcript lines · {clip.language}</p>
            </div>
          </div>
          <div className="transcript-clip-actions">
            <button className="transcript-quiet-button label-s-semibold" type="button" onClick={onCopy}>
              <DsIcon name="copy" size={15} />
              Copy text
            </button>
            <TranscriptClipMenu onDelete={onDelete} onHide={onHide} onRename={startRenaming} />
          </div>
        </header>

        <div className="transcript-paragraph-list">
          {paragraphs.map((paragraph) => (
            <TranscriptParagraphRow
              comments={commentsByParagraph.get(paragraph.id) ?? []}
              isActive={activeParagraphId === paragraph.id}
              highlights={highlightsByParagraph.get(paragraph.id) ?? []}
              key={paragraph.id}
              paragraph={paragraph}
              onActivate={() => onParagraphActivate(paragraph)}
              onComment={(triggerRect) => onParagraphComment(paragraph, triggerRect)}
              onSelectText={(element) => onSelectText(paragraph, element)}
            />
          ))}
        </div>
      </section>
    </article>
  );
}

function TranscriptParagraphRow({
  comments,
  highlights,
  isActive,
  paragraph,
  onActivate,
  onComment,
  onSelectText,
}: {
  comments: ScriptComment[];
  highlights: Highlight[];
  isActive: boolean;
  paragraph: TranscriptParagraph;
  onActivate: () => void;
  onComment: (triggerRect: DOMRect) => void;
  onSelectText: (element: HTMLElement) => void;
}) {
  const activateWithKeyboard = (event: KeyboardEvent<HTMLElement>) => {
    if (event.key !== "Enter" && event.key !== " ") {
      return;
    }

    event.preventDefault();
    onActivate();
  };
  const activateWithPointer = (event: MouseEvent<HTMLElement>) => {
    const selection = window.getSelection();

    if (
      selection
      && !selection.isCollapsed
      && selection.toString().trim()
      && selection.anchorNode
      && event.currentTarget.contains(selection.anchorNode)
    ) {
      return;
    }

    onActivate();
  };

  return (
    <article
      className={`transcript-paragraph ${isActive ? "playing" : ""}`}
      data-paragraph-id={paragraph.id}
      role="button"
      tabIndex={0}
      aria-label={`Play ${paragraph.speakerName} at ${formatReviewTime(paragraph.startTimeSeconds)}`}
      onClick={activateWithPointer}
      onKeyDown={activateWithKeyboard}
      onMouseUp={(event) => {
        const textElement = event.currentTarget.querySelector<HTMLElement>(".transcript-paragraph-text");

        if (textElement) {
          onSelectText(textElement);
        }
      }}
    >
      <span className="transcript-paragraph-meta">
        <strong className="label-xs-semibold">{paragraph.speakerName}</strong>
        <span className="label-xs">@{formatReviewTime(paragraph.startTimeSeconds)}</span>
      </span>
      <span className="transcript-paragraph-text paragraph-s">
        <HighlightedText highlights={highlights} text={paragraph.text} />
      </span>
      <ScriptAnnotationPin
        count={comments.length}
        hasUnresolved={comments.some((comment) => !comment.resolved)}
        label={`${paragraph.speakerName} at ${formatReviewTime(paragraph.startTimeSeconds)}`}
        onOpen={onComment}
      />
    </article>
  );
}

function HighlightedText({ highlights, text }: { highlights: Highlight[]; text: string }) {
  if (highlights.length === 0) {
    return text;
  }

  const boundaries = new Set<number>([0, text.length]);

  highlights.forEach((highlight) => {
    boundaries.add(Math.max(0, Math.min(text.length, highlight.range.start)));
    boundaries.add(Math.max(0, Math.min(text.length, highlight.range.end)));
  });

  const orderedBoundaries = [...boundaries].sort((left, right) => left - right);

  return orderedBoundaries.slice(0, -1).map((start, index) => {
    const end = orderedBoundaries[index + 1];
    const isHighlighted = highlights.some(
      (highlight) => highlight.range.start < end && highlight.range.end > start,
    );
    const segment = text.slice(start, end);

    return isHighlighted
      ? <strong className="transcript-highlight" key={`${start}-${end}`}>{segment}</strong>
      : <span key={`${start}-${end}`}>{segment}</span>;
  });
}
