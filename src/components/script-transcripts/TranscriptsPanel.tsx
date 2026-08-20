"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "../../../Brisk DS/src/app/components/Button";
import {
  FloatingCommentShell,
  getFloatingCommentPosition,
  type FloatingCommentPosition,
} from "@/components/script/FloatingCommentShell";
import {
  FloatingSelectionToolbar,
  type FloatingSelectionToolbarState,
} from "@/components/script/FloatingSelectionToolbar";
import { DsIcon } from "@/components/video-review/DsIcon";
import { mediaAssets, type MediaAsset } from "@/data/media";
import { scriptUsers, type ScriptComment, type ScriptCommentAnchor } from "@/data/script";
import {
  createTranscriptSourceKey,
  type Highlight,
  type SelectionContext,
  type TranscriptClip,
  type TranscriptParagraph,
  type TranscriptWordsRowPayload,
} from "@/data/transcripts";
import { TranscriptClipBlock } from "./TranscriptClipBlock";
import {
  createPlainText,
  formatReviewTime,
} from "./transcriptDownloads";
import {
  openDocumentExportPreview,
  type TranscriptExportPayload,
} from "@/lib/document-export";

type TranscriptView = "all" | "highlights";

type TranscriptSelectionToolbarState = FloatingSelectionToolbarState & {
  context: SelectionContext | null;
};

type ResolvedTranscriptClip = {
  clip: TranscriptClip;
  asset: MediaAsset;
};

const emptyToolbarState: TranscriptSelectionToolbarState = {
  visible: false,
  x: 0,
  y: 0,
  context: null,
};

export function TranscriptsPanel({
  clips,
  comments,
  initialFocusAssetId,
  isCustomer,
  projectId,
  projectName,
  clientName,
  studioName,
  sentSourceKeys,
  onCommentsChange,
  onSendRows,
}: {
  clips: TranscriptClip[];
  comments: ScriptComment[];
  initialFocusAssetId: string | null;
  isCustomer: boolean;
  projectId: string;
  projectName: string;
  clientName: string;
  studioName: string;
  sentSourceKeys: Set<string>;
  onCommentsChange: (previousScope: ScriptComment[], nextScope: ScriptComment[]) => void;
  onSendRows: (payloads: TranscriptWordsRowPayload[]) => void;
}) {
  const [deletedClipIds, setDeletedClipIds] = useState<Set<string>>(new Set());
  const [hiddenClipIds, setHiddenClipIds] = useState<Set<string>>(new Set());
  const [renamedAssetNames, setRenamedAssetNames] = useState<Record<string, string>>({});
  const [view, setView] = useState<TranscriptView>("all");
  const [highlightsByRange, setHighlightsByRange] = useState<Map<string, Highlight>>(new Map());
  const [playingClipId, setPlayingClipId] = useState<string | null>(null);
  const [currentTimeByClip, setCurrentTimeByClip] = useState<Record<string, number>>({});
  const [selectionToolbar, setSelectionToolbar] = useState<TranscriptSelectionToolbarState>(emptyToolbarState);
  const [commentAnchor, setCommentAnchor] = useState<ScriptCommentAnchor | null>(null);
  const [commentPosition, setCommentPosition] = useState<FloatingCommentPosition | null>(null);
  const [focusFlashAssetId, setFocusFlashAssetId] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState("");
  const statusTimeoutRef = useRef<number | null>(null);
  const focusTimeoutRef = useRef<number | null>(null);
  const assetsById = useMemo(() => new Map(mediaAssets.map((asset) => [asset.id, asset])), []);
  const resolvedClips = useMemo(
    () => clips.flatMap((clip): ResolvedTranscriptClip[] => {
      const asset = assetsById.get(clip.mediaAssetId);
      return asset
        ? [{ clip, asset: { ...asset, name: renamedAssetNames[asset.id] ?? asset.name } }]
        : [];
    }),
    [assetsById, clips, renamedAssetNames],
  );
  const remainingClips = resolvedClips.filter(({ clip }) => !deletedClipIds.has(clip.id));
  const visibleClips = remainingClips.filter(({ clip }) => !hiddenClipIds.has(clip.id));
  const visibleHighlights = useMemo(
    () => [...highlightsByRange.values()].filter(
      (highlight) => !hiddenClipIds.has(highlight.clipId) && !deletedClipIds.has(highlight.clipId),
    ),
    [deletedClipIds, hiddenClipIds, highlightsByRange],
  );
  const selectedContext = selectionToolbar.context;
  const selectedSourceKey = selectedContext
    ? createTranscriptSourceKey(selectedContext.clipId, selectedContext.paragraphId, selectedContext.range)
    : null;
  const isSelectedRangeHighlighted = selectedSourceKey ? highlightsByRange.has(selectedSourceKey) : false;
  const selectedComments = commentAnchor
    ? comments.filter((comment) => isSameTranscriptAnchor(comment.anchor, commentAnchor))
    : [];

  useEffect(() => {
    return () => {
      if (statusTimeoutRef.current) {
        window.clearTimeout(statusTimeoutRef.current);
      }

      if (focusTimeoutRef.current) {
        window.clearTimeout(focusTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!playingClipId) {
      return;
    }

    const timer = window.setInterval(() => {
      setCurrentTimeByClip((currentTimes) => ({
        ...currentTimes,
        [playingClipId]: (currentTimes[playingClipId] ?? 0) + 0.5,
      }));
    }, 500);

    return () => window.clearInterval(timer);
  }, [playingClipId]);

  useEffect(() => {
    if (!initialFocusAssetId) {
      return;
    }

    setFocusFlashAssetId(initialFocusAssetId);
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        document.getElementById(`transcript-${initialFocusAssetId}`)?.scrollIntoView({
          block: "center",
          behavior: "smooth",
        });
      });
    });

    if (focusTimeoutRef.current) {
      window.clearTimeout(focusTimeoutRef.current);
    }

    focusTimeoutRef.current = window.setTimeout(() => setFocusFlashAssetId(null), 1500);
  }, [initialFocusAssetId]);

  useEffect(() => {
    if (!selectionToolbar.visible) {
      return;
    }

    const closeToolbar = (event: PointerEvent) => {
      const target = event.target;

      if (!(target instanceof Element)) {
        return;
      }

      if (target.closest(".script-floating-toolbar") || target.closest(".transcript-paragraph-text")) {
        return;
      }

      setSelectionToolbar(emptyToolbarState);
    };

    window.addEventListener("pointerdown", closeToolbar);
    return () => window.removeEventListener("pointerdown", closeToolbar);
  }, [selectionToolbar.visible]);

  const showStatus = (message: string) => {
    setStatusMessage(message);

    if (statusTimeoutRef.current) {
      window.clearTimeout(statusTimeoutRef.current);
    }

    statusTimeoutRef.current = window.setTimeout(() => setStatusMessage(""), 2600);
  };

  const copyAllText = async () => {
    await copyToClipboard(createPlainText(visibleClips));
    showStatus("All transcript text copied.");
  };

  const copyClipText = async (resolvedClip: ResolvedTranscriptClip) => {
    await copyToClipboard(createPlainText([resolvedClip]));
    showStatus(`${resolvedClip.asset.name} copied.`);
  };

  const createTranscriptExportPayload = (clipsToExport: ResolvedTranscriptClip[]): TranscriptExportPayload => ({
    kind: "transcript",
    projectId,
    projectName,
    clientName,
    studioName,
    clips: clipsToExport.map(({ clip, asset }) => ({
      id: clip.id,
      title: asset.name,
      language: clip.language,
      createdAt: clip.createdAt,
      paragraphs: clip.paragraphs.map((paragraph) => ({
        ...paragraph,
        highlighted: visibleHighlights.some((highlight) => (
          highlight.clipId === clip.id && highlight.paragraphId === paragraph.id
        )),
      })),
    })),
  });

  const openTranscriptPdfPreview = (clipsToExport: ResolvedTranscriptClip[], clipId?: string) => {
    openDocumentExportPreview(createTranscriptExportPayload(clipsToExport), clipId);
    showStatus(`${clipsToExport.length === 1 ? "Transcript" : "Transcripts"} PDF preview opened.`);
  };

  const captureSelection = (
    clip: TranscriptClip,
    paragraph: TranscriptParagraph,
    element: HTMLElement,
  ) => {
    const selection = window.getSelection();

    if (!selection || selection.rangeCount === 0 || selection.isCollapsed) {
      setSelectionToolbar(emptyToolbarState);
      return;
    }

    const range = selection.getRangeAt(0);

    if (!element.contains(range.startContainer) || !element.contains(range.endContainer)) {
      setSelectionToolbar(emptyToolbarState);
      return;
    }

    const rawStart = getTextOffset(element, range.startContainer, range.startOffset);
    const rawEnd = getTextOffset(element, range.endContainer, range.endOffset);
    const rawText = paragraph.text.slice(rawStart, rawEnd);
    const selectedText = rawText.trim();

    if (!selectedText) {
      setSelectionToolbar(emptyToolbarState);
      return;
    }

    const leadingWhitespace = rawText.length - rawText.trimStart().length;
    const trailingWhitespace = rawText.length - rawText.trimEnd().length;
    const selectionRect = range.getBoundingClientRect();

    setSelectionToolbar({
      visible: true,
      context: {
        clipId: clip.id,
        paragraphId: paragraph.id,
        range: {
          start: rawStart + leadingWhitespace,
          end: rawEnd - trailingWhitespace,
        },
        text: selectedText,
      },
      x: Math.max(180, Math.min(window.innerWidth - 180, selectionRect.left + selectionRect.width / 2)),
      y: Math.max(12, selectionRect.top - 48),
    });
  };

  const createSelectedPayload = () => {
    if (!selectedContext) {
      return null;
    }

    const resolvedClip = resolvedClips.find(({ clip }) => clip.id === selectedContext.clipId);
    const paragraph = resolvedClip?.clip.paragraphs.find((item) => item.id === selectedContext.paragraphId);

    if (!resolvedClip || !paragraph) {
      return null;
    }

    return createWordsRowPayload(
      resolvedClip.clip,
      resolvedClip.asset,
      paragraph,
      selectedContext.range,
      selectedContext.text,
    );
  };

  const sendSelectionToScript = () => {
    const payload = createSelectedPayload();

    if (!payload || sentSourceKeys.has(payload.sourceKey)) {
      return;
    }

    onSendRows([payload]);
    showStatus("Selection sent to the Words column.");
  };

  const toggleSelectedHighlight = () => {
    if (!selectedContext || !selectedSourceKey) {
      return;
    }

    setHighlightsByRange((currentHighlights) => {
      const nextHighlights = new Map(currentHighlights);

      if (nextHighlights.has(selectedSourceKey)) {
        nextHighlights.delete(selectedSourceKey);
      } else {
        nextHighlights.set(selectedSourceKey, {
          id: selectedSourceKey,
          clipId: selectedContext.clipId,
          paragraphId: selectedContext.paragraphId,
          range: selectedContext.range,
          text: selectedContext.text,
        });
      }

      return nextHighlights;
    });
    showStatus(isSelectedRangeHighlighted ? "Highlight removed." : "Highlight saved.");
  };

  const openSelectionComment = () => {
    if (!selectedContext) {
      return;
    }

    const resolvedClip = resolvedClips.find(({ clip }) => clip.id === selectedContext.clipId);
    const paragraph = resolvedClip?.clip.paragraphs.find((item) => item.id === selectedContext.paragraphId);

    if (!resolvedClip || !paragraph) {
      return;
    }

    setCommentAnchor({
      kind: "selection",
      label: `${resolvedClip.asset.name} · ${paragraph.speakerName} · @${formatReviewTime(paragraph.startTimeSeconds)}`,
      clipId: selectedContext.clipId,
      paragraphId: selectedContext.paragraphId,
      snippet: selectedContext.text.length > 44 ? `${selectedContext.text.slice(0, 44)}...` : selectedContext.text,
      range: selectedContext.range,
    });
    setCommentPosition({
      left: Math.max(16, Math.min(window.innerWidth - 390, selectionToolbar.x - 195)),
      top: Math.min(window.innerHeight - 340, selectionToolbar.y + 48),
    });
    setSelectionToolbar(emptyToolbarState);
  };

  const openParagraphComment = (
    clip: TranscriptClip,
    asset: MediaAsset,
    paragraph: TranscriptParagraph,
    triggerRect: DOMRect,
  ) => {
    setCommentAnchor({
      kind: "row",
      label: `${asset.name} · ${paragraph.speakerName} · @${formatReviewTime(paragraph.startTimeSeconds)}`,
      clipId: clip.id,
      paragraphId: paragraph.id,
    });
    setCommentPosition(getFloatingCommentPosition(triggerRect));
    setSelectionToolbar(emptyToolbarState);
  };

  const copySelection = async () => {
    if (!selectedContext) {
      return;
    }

    await copyToClipboard(selectedContext.text);
    showStatus("Selection copied.");
  };

  const sendAllHighlights = () => {
    const orderedPayloads = visibleClips.flatMap(({ clip, asset }) =>
      clip.paragraphs.flatMap((paragraph) =>
        visibleHighlights
          .filter((highlight) => highlight.clipId === clip.id && highlight.paragraphId === paragraph.id)
          .sort((left, right) => left.range.start - right.range.start)
          .map((highlight) => createWordsRowPayload(
            clip,
            asset,
            paragraph,
            highlight.range,
            highlight.text,
          )),
      ),
    ).filter((payload) => !sentSourceKeys.has(payload.sourceKey));

    if (orderedPayloads.length === 0) {
      showStatus("All highlights are already in the Words column.");
      return;
    }

    onSendRows(orderedPayloads);
    showStatus(`${orderedPayloads.length} highlights sent to the Words column.`);
  };

  if (resolvedClips.length === 0) {
    return <TranscriptEmptyState projectId={clips[0]?.projectId ?? "loom-launch-film"} />;
  }

  return (
    <section className="transcripts-panel" aria-label="Project transcripts">
      <header className="transcripts-sticky-header">
        <div className="transcripts-header-actions">
          <Button
            className="script-visuals-header-toggle"
            size="S"
            type="button"
            variant="secondary"
            onClick={() => void copyAllText()}
          >
            <DsIcon name="copy" size={12} />
            Copy all text
          </Button>
          <Button
            size="S"
            type="button"
            variant="secondary"
            onClick={() => openTranscriptPdfPreview(visibleClips)}
          >
            <DsIcon name="download-simple" size={14} />
            Download PDF
          </Button>
        </div>
        <div className="transcript-view-toggle" role="group" aria-label="Transcript view">
          <button
            className={`label-xs-semibold ${view === "all" ? "active" : ""}`}
            type="button"
            aria-pressed={view === "all"}
            onClick={() => setView("all")}
          >
            All
          </button>
          <button
            className={`label-xs-semibold ${view === "highlights" ? "active" : ""}`}
            type="button"
            aria-pressed={view === "highlights"}
            onClick={() => setView("highlights")}
          >
            Highlights only
          </button>
        </div>
      </header>

      <div className="transcript-clip-stack">
        {visibleClips.map(({ clip, asset }) => {
          const clipHighlights = visibleHighlights.filter((highlight) => highlight.clipId === clip.id);
          const displayedParagraphs = view === "all"
            ? clip.paragraphs
            : clip.paragraphs.filter((paragraph) =>
              clipHighlights.some((highlight) => highlight.paragraphId === paragraph.id),
            );
          const currentTimeSeconds = currentTimeByClip[clip.id] ?? 0;
          const activeParagraph = playingClipId === clip.id
            ? clip.paragraphs.find((paragraph) =>
              currentTimeSeconds >= paragraph.startTimeSeconds
              && currentTimeSeconds < paragraph.endTimeSeconds,
            ) ?? null
            : null;

          if (view === "highlights" && displayedParagraphs.length === 0) {
            return null;
          }

          return (
            <TranscriptClipBlock
              activeParagraphId={activeParagraph?.id ?? null}
              asset={asset}
              clip={clip}
              comments={comments.filter((comment) => comment.anchor.clipId === clip.id)}
              currentTimeSeconds={currentTimeSeconds}
              highlights={clipHighlights}
              isFocusFlashing={focusFlashAssetId === asset.id}
              isPlaying={playingClipId === clip.id}
              key={clip.id}
              paragraphs={displayedParagraphs}
              onCopy={() => void copyClipText({ clip, asset })}
              onDownload={() => openTranscriptPdfPreview([{ clip, asset }], clip.id)}
              onDelete={() => {
                setDeletedClipIds((currentIds) => new Set(currentIds).add(clip.id));
                setPlayingClipId((currentId) => currentId === clip.id ? null : currentId);
                showStatus(`${asset.name} deleted from Transcripts.`);
              }}
              onParagraphActivate={(paragraph) => {
                setCurrentTimeByClip((currentTimes) => ({
                  ...currentTimes,
                  [clip.id]: paragraph.startTimeSeconds,
                }));
                setPlayingClipId(clip.id);
              }}
              onParagraphComment={(paragraph, triggerRect) => {
                openParagraphComment(clip, asset, paragraph, triggerRect);
              }}
              onPlayingChange={(isPlaying) => setPlayingClipId(isPlaying ? clip.id : null)}
              onRename={(name) => {
                setRenamedAssetNames((currentNames) => ({ ...currentNames, [asset.id]: name }));
                showStatus(`Transcript renamed to ${name}.`);
              }}
              onHide={() => {
                setHiddenClipIds((currentIds) => new Set(currentIds).add(clip.id));
                setPlayingClipId((currentId) => currentId === clip.id ? null : currentId);
                showStatus(`${asset.name} hidden from Transcripts.`);
              }}
              onSelectText={(paragraph, element) => captureSelection(clip, paragraph, element)}
              onTimeChange={(seconds) => setCurrentTimeByClip((currentTimes) => ({
                ...currentTimes,
                [clip.id]: seconds,
              }))}
            />
          );
        })}

        {view === "highlights" && visibleClips.length > 0 && visibleHighlights.length === 0 ? (
          <div className="transcript-filter-empty">
            <DsIcon name="bookmark" size={24} />
            <h2 className="headings-2xs-bold">No highlighted lines yet</h2>
            <p className="paragraph-s">Select transcript text and choose Highlight to collect the strongest lines.</p>
            <Button size="S" type="button" variant="primary" onClick={() => setView("all")}>View all transcripts</Button>
          </div>
        ) : null}

        {remainingClips.length > 0 && visibleClips.length === 0 ? (
          <div className="transcript-filter-empty">
            <DsIcon name="file-text" size={24} />
            <h2 className="headings-2xs-bold">All transcripts are hidden</h2>
            <p className="paragraph-s">Restore the project transcript collection to continue reviewing it.</p>
            <Button size="S" type="button" variant="primary" onClick={() => setHiddenClipIds(new Set())}>Restore transcripts</Button>
          </div>
        ) : null}

        {remainingClips.length === 0 ? (
          <div className="transcript-filter-empty">
            <DsIcon name="file-text" size={24} />
            <h2 className="headings-2xs-bold">No transcripts remain</h2>
            <p className="paragraph-s">Transcript deletions last for this prototype session.</p>
          </div>
        ) : null}
      </div>

      {view === "highlights" && visibleHighlights.length > 0 ? (
        <footer className="transcript-highlights-footer">
          <span className="label-s">{visibleHighlights.length} highlighted {visibleHighlights.length === 1 ? "range" : "ranges"}</span>
          <Button size="S" type="button" variant="primary" onClick={sendAllHighlights}>
            <DsIcon name="arrow-bend-up-right" size={16} />
            Send all highlights to script
          </Button>
        </footer>
      ) : null}

      <FloatingSelectionToolbar
        ariaLabel="Transcript selection actions"
        state={selectionToolbar}
        actions={[
          {
            id: "send-to-script",
            label: selectedSourceKey && sentSourceKeys.has(selectedSourceKey) ? "Sent to script" : "Send to script",
            icon: "arrow-bend-up-right",
            showLabel: true,
            disabled: Boolean(selectedSourceKey && sentSourceKeys.has(selectedSourceKey)),
            onSelect: sendSelectionToScript,
          },
          {
            id: "highlight",
            label: isSelectedRangeHighlighted ? "Remove highlight" : "Highlight",
            symbol: "B",
            showLabel: true,
            onSelect: toggleSelectedHighlight,
          },
          {
            id: "comment",
            label: "Comment",
            icon: "chat-circle",
            showLabel: true,
            onSelect: openSelectionComment,
          },
          {
            id: "copy",
            label: "Copy",
            icon: "copy",
            showLabel: true,
            onSelect: () => void copySelection(),
          },
        ]}
      />

      {commentAnchor && commentPosition ? (
        <FloatingCommentShell
          anchor={commentAnchor}
          canPostInternal={!isCustomer}
          comments={selectedComments}
          currentUserId={isCustomer ? "user-jess" : "user-tom"}
          position={commentPosition}
          users={scriptUsers}
          onCommentsChange={(nextComments) => onCommentsChange(selectedComments, nextComments)}
          onDismiss={() => {
            setCommentAnchor(null);
            setCommentPosition(null);
          }}
        />
      ) : null}

      {statusMessage ? <div className="script-toast label-s-semibold" role="status">{statusMessage}</div> : null}
    </section>
  );
}

function TranscriptEmptyState({ projectId }: { projectId: string }) {
  return (
    <section className="transcript-empty-state">
      <DsIcon name="file-text" size={28} />
      <h2 className="headings-2xs-bold">No dialogue transcripts yet</h2>
      <p className="paragraph-s">Add interview footage or dialogue audio in Media to collect transcripts here.</p>
      <a className="transcript-primary-link label-s-semibold" href={`/projects/${projectId}/stages/media`}>
        Open Media
      </a>
    </section>
  );
}

function createWordsRowPayload(
  clip: TranscriptClip,
  asset: MediaAsset,
  paragraph: TranscriptParagraph,
  range: { start: number; end: number },
  text: string,
): TranscriptWordsRowPayload {
  return {
    sourceKey: createTranscriptSourceKey(clip.id, paragraph.id, range),
    words: text,
    speakerName: paragraph.speakerName,
    sourceFilename: asset.name,
    clipId: clip.id,
    paragraphId: paragraph.id,
    startTimeSeconds: paragraph.startTimeSeconds,
    endTimeSeconds: paragraph.endTimeSeconds,
    range,
  };
}

function getTextOffset(container: HTMLElement, node: Node, offset: number) {
  const range = document.createRange();

  range.selectNodeContents(container);
  range.setEnd(node, offset);
  return range.toString().length;
}

function isSameTranscriptAnchor(left: ScriptCommentAnchor, right: ScriptCommentAnchor) {
  if (left.clipId !== right.clipId || left.paragraphId !== right.paragraphId) {
    return false;
  }

  if (right.kind === "row" && !right.range) {
    return true;
  }

  return left.range?.start === right.range?.start
    && left.range?.end === right.range?.end;
}

async function copyToClipboard(value: string) {
  try {
    await navigator.clipboard?.writeText(value);
  } catch {
    // Prototype-only: clipboard access can be unavailable in local previews.
  }
}
