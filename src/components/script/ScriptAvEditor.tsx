"use client";

import { ConfirmationDialog } from "../../../Brisk DS/src/app/components/ConfirmationDialog";

import { Button } from "../../../Brisk DS/src/app/components/Button";
import { DsIcon } from "@/components/video-review/DsIcon";
import {
  type ScriptComment,
  type ScriptDensity,
  type ScriptMediaItem,
  type ScriptMediaType,
  type ScriptRow,
  type ScriptTextMark,
} from "@/data/script";
import {
  useEffect,
  useRef,
  useState,
  type ClipboardEvent,
  type KeyboardEvent as ReactKeyboardEvent,
  type MouseEvent as ReactMouseEvent,
  type MutableRefObject,
} from "react";
import { RowDragHandle } from "@/components/script/RowDragHandle";
import { ScriptAnnotationPin } from "@/components/script/ScriptAnnotationPin";
import { ScriptMediaPicker, scriptMediaPickerOptions } from "@/components/script/ScriptMediaPicker";
import {
  emptyScriptPlaceholderRow,
  getRowLabel,
  getRowNumber,
  normaliseBoldTextMarks,
  resizeTextAreaToContent,
  scriptSurfaceId,
} from "@/components/script/script-editor-utils";
import type { ScriptRowUniversalAnchor } from "@/components/script/script-editor-utils";

type TextRange = {
  start: number;
  end: number;
};

function ScriptColumnHeaders({
  areVisualsVisible,
  onToggleVisuals,
}: {
  areVisualsVisible: boolean;
  onToggleVisuals: () => void;
}) {
  const showVisualsAction = (
    <div className="script-column-header-actions script-toolbar-trailing-actions">
      <h2
        className="script-column-title-with-tooltip script-visuals-toggle-heading"
        data-tooltip="Describe the visuals for each line. Add media, links or references."
      >
        <Button
          className="script-visuals-header-toggle script-toolbar-visuals-toggle"
          size="S"
          type="button"
          variant="ghost"
          onClick={onToggleVisuals}
        >
          <span>Show Visuals</span>
          <DsIcon name="caret-right" size={16} />
        </Button>
      </h2>
    </div>
  );

  const hideVisualsAction = (
    <button
      className="script-visuals-header-toggle script-toolbar-visuals-toggle is-icon-only"
      type="button"
      aria-label="Hide visuals"
      data-tooltip="Hide visuals"
      onClick={onToggleVisuals}
    >
      <DsIcon name="caret-left" size={16} />
    </button>
  );

  return (
    <div className={`script-column-headers ${areVisualsVisible ? "visuals-visible" : "words-only"}`} aria-label="Script column guidance">
      <section className="script-column-header words">
        <div className="script-column-header-main">
          <h2 className="script-column-title-with-tooltip" data-tooltip="Write the words of your script in this column - could be titles on screen, dialogue, voiceover etc. 150 words = 1 minute.">
            Words
          </h2>
          {!areVisualsVisible ? showVisualsAction : null}
        </div>
      </section>
      {areVisualsVisible ? (
        <section className="script-column-header visuals">
          <div className="script-column-header-main">
            <h2 className="script-column-title-with-tooltip" data-tooltip="Describe the visuals for each line. Add media, links or references.">
              Visuals
            </h2>
            {hideVisualsAction}
          </div>
        </section>
      ) : null}
    </div>
  );
}

export function ReusableScriptAvEditor({
  rows,
  commentsByRow = new Map<string, ScriptComment[]>(),
  isApproved = false,
  onAddMediaItem,
  onAddRowAfter,
  onAddRowBefore,
  onDeleteRow,
  onDuplicateRow,
  onOpenRowComment,
  onReorderRows,
  onRequestEdit,
  onSetField,
}: {
  rows: ScriptRow[];
  commentsByRow?: Map<string, ScriptComment[]>;
  isApproved?: boolean;
  onAddMediaItem: (rowId: string, type: ScriptMediaType) => void;
  onAddRowAfter: (rowId: string) => void;
  onAddRowBefore: (rowId: string) => void;
  onDeleteRow: (rowId: string) => void;
  onDuplicateRow: (rowId: string) => void;
  onOpenRowComment: (rowId: string) => void;
  onReorderRows: (rowId: string, beforeRowId: string) => void;
  onRequestEdit: () => void;
  onSetField: (rowId: string, field: "words" | "visuals", value: string) => void;
}) {
  const [areVisualsVisible, setAreVisualsVisible] = useState(true);
  const [draggingRowId, setDraggingRowId] = useState<string | null>(null);
  const [dropRowId, setDropRowId] = useState<string | null>(null);
  const [openMediaMenuRowId, setOpenMediaMenuRowId] = useState<string | null>(null);
  const [openRowMenuId, setOpenRowMenuId] = useState<string | null>(null);
  const [confirmingDeleteRowId, setConfirmingDeleteRowId] = useState<string | null>(null);
  const wordInputRefs = useRef(new Map<string, HTMLTextAreaElement>());
  const visualInputRefs = useRef(new Map<string, HTMLTextAreaElement>());

  useEffect(() => {
    [...wordInputRefs.current.values(), ...visualInputRefs.current.values()].forEach(resizeTextAreaToContent);
  }, [areVisualsVisible, rows]);

  const guardApproved = () => {
    if (!isApproved) return true;
    onRequestEdit();
    return false;
  };

  const runEditable = (action: () => void) => {
    if (!guardApproved()) return;
    action();
  };

  return (
    <AvScriptEditor
      commentsByRow={commentsByRow}
      density="compact"
      draggingRowId={draggingRowId}
      dropRowId={dropRowId}
      hasTypedThisSession
      isApproved={isApproved}
      highlightedRowId={null}
      openMediaMenuRowId={openMediaMenuRowId}
      openRowMenuId={openRowMenuId}
      confirmingDeleteRowId={confirmingDeleteRowId}
      rows={rows}
      areVisualsVisible={areVisualsVisible}
      selectedRowIds={new Set<string>()}
      showChanges={false}
      wordInputRefs={wordInputRefs}
      visualInputRefs={visualInputRefs}
      onAddMediaItem={(rowId, type) => runEditable(() => onAddMediaItem(rowId, type))}
      onAddRowAfter={(rowId) => rowId && runEditable(() => onAddRowAfter(rowId))}
      onAddRowBefore={(rowId) => runEditable(() => onAddRowBefore(rowId))}
      onCancelRowDelete={() => setConfirmingDeleteRowId(null)}
      onCaptureSelectionAnchor={() => undefined}
      onDeleteRow={(rowId, shouldSkipConfirm) => {
        if (!shouldSkipConfirm) {
          setConfirmingDeleteRowId(rowId);
          return;
        }
        runEditable(() => {
          onDeleteRow(rowId);
          setConfirmingDeleteRowId(null);
          setOpenRowMenuId(null);
        });
      }}
      onToggleVisuals={() => setAreVisualsVisible((visible) => !visible)}
      onDragEnd={() => {
        setDraggingRowId(null);
        setDropRowId(null);
      }}
      onDragOverRow={setDropRowId}
      onDragStartRow={(rowId) => {
        if (!guardApproved()) return;
        setDraggingRowId(rowId);
      }}
      onDuplicateRow={(rowId) => runEditable(() => onDuplicateRow(rowId))}
      onGuardApproved={guardApproved}
      onOpenRowAnnotation={(anchor) => onOpenRowComment(anchor.anchorRef)}
      onPasteWords={() => undefined}
      onReorderRows={(beforeRowId) => {
        if (!draggingRowId) return;
        onReorderRows(draggingRowId, beforeRowId);
        setDraggingRowId(null);
        setDropRowId(null);
      }}
      onSelectRow={() => undefined}
      onSetField={onSetField}
      onSetMediaMenuRow={setOpenMediaMenuRowId}
      onSetOpenRowMenu={setOpenRowMenuId}
      onWordsKeyDown={() => undefined}
      registerRowRef={() => undefined}
    />
  );
}

export function AvScriptEditor({
  commentsByRow,
  density,
  draggingRowId,
  dropRowId,
  hasTypedThisSession,
  isApproved,
  highlightedRowId,
  openMediaMenuRowId,
  openRowMenuId,
  confirmingDeleteRowId,
  rows,
  areVisualsVisible,
  selectedRowIds,
  showChanges,
  wordInputRefs,
  visualInputRefs,
  onAddMediaItem,
  onAddRowAfter,
  onAddRowBefore,
  onCancelRowDelete,
  onCaptureSelectionAnchor,
  onDeleteRow,
  onToggleVisuals,
  onDragEnd,
  onDragOverRow,
  onDragStartRow,
  onDuplicateRow,
  onGuardApproved,
  onOpenRowAnnotation,
  onPasteWords,
  onReorderRows,
  onSelectRow,
  onSetField,
  onSetMediaMenuRow,
  onSetOpenRowMenu,
  onWordsKeyDown,
  registerRowRef,
}: {
  commentsByRow: Map<string, ScriptComment[]>;
  density: ScriptDensity;
  draggingRowId: string | null;
  dropRowId: string | null;
  hasTypedThisSession: boolean;
  isApproved: boolean;
  highlightedRowId: string | null;
  openMediaMenuRowId: string | null;
  openRowMenuId: string | null;
  confirmingDeleteRowId: string | null;
  rows: ScriptRow[];
  areVisualsVisible: boolean;
  selectedRowIds: Set<string>;
  showChanges: boolean;
  wordInputRefs: MutableRefObject<Map<string, HTMLTextAreaElement>>;
  visualInputRefs: MutableRefObject<Map<string, HTMLTextAreaElement>>;
  onAddMediaItem: (rowId: string, type: ScriptMediaType) => void;
  onAddRowAfter: (rowId: string | null) => void;
  onAddRowBefore: (rowId: string) => void;
  onCancelRowDelete: () => void;
  onCaptureSelectionAnchor: (row: ScriptRow, target: HTMLTextAreaElement) => void;
  onDeleteRow: (rowId: string, shouldSkipConfirm?: boolean) => void;
  onToggleVisuals: () => void;
  onDragEnd: () => void;
  onDragOverRow: (rowId: string) => void;
  onDragStartRow: (rowId: string) => void;
  onDuplicateRow: (rowId: string) => void;
  onGuardApproved: () => boolean;
  onOpenRowAnnotation: (anchor: ScriptRowUniversalAnchor, triggerRect: DOMRect) => void;
  onPasteWords: (event: ClipboardEvent<HTMLTextAreaElement>, row: ScriptRow) => void;
  onReorderRows: (targetRowId: string) => void;
  onSelectRow: (rowId: string, event: ReactMouseEvent<HTMLButtonElement>) => void;
  onSetField: (rowId: string, field: "words" | "visuals", value: string) => void;
  onSetMediaMenuRow: (rowId: string | null) => void;
  onSetOpenRowMenu: (rowId: string | null) => void;
  onWordsKeyDown: (event: ReactKeyboardEvent<HTMLTextAreaElement>, row: ScriptRow) => void;
  registerRowRef: (rowId: string, node: HTMLDivElement | null) => void;
}) {
  const isEmptyScript = rows.length === 0;
  const editorRows = isEmptyScript ? [emptyScriptPlaceholderRow] : rows;

  return (
    <section className={`script-av-surface ${density} ${areVisualsVisible ? "visuals-visible" : "words-only"}`} aria-label="AV script editor">
      <ScriptColumnHeaders
        areVisualsVisible={areVisualsVisible}
        onToggleVisuals={onToggleVisuals}
      />
      {editorRows.map((row, index) => {
        const rowComments = commentsByRow.get(row.id) ?? [];
        const hasUnresolvedComments = rowComments.some((comment) => !comment.resolved);
        const rowUniversalAnchor: ScriptRowUniversalAnchor = {
          surfaceType: "script",
          surfaceId: scriptSurfaceId,
          anchorType: "row",
          anchorRef: row.id,
        };
        const hasAnchor = rowComments.length > 0 || row.media.length > 0;
        const shouldShowEmptyState = isEmptyScript && index === 0 && !hasTypedThisSession;
        const selectionHighlightRanges = getSelectionHighlightRanges(row, rowComments);

        return (
          <div
            className={`script-row ${areVisualsVisible ? "visuals-visible" : "words-only"} ${selectedRowIds.has(row.id) ? "selected" : ""} ${draggingRowId === row.id ? "dragging" : ""} ${dropRowId === row.id ? "drop-target" : ""} ${hasAnchor ? "has-anchor" : ""} ${highlightedRowId === row.id ? "highlighted" : ""}`}
            draggable
            key={row.id}
            ref={(node) => registerRowRef(row.id, node)}
            onDragStart={() => onDragStartRow(row.id)}
            onDragOver={(event) => {
              event.preventDefault();
              onDragOverRow(row.id);
            }}
            onDrop={() => onReorderRows(row.id)}
            onDragEnd={onDragEnd}
          >
            <div className="script-row-gutter">
              <button className="script-row-number label-xs-semibold" type="button" onClick={(event) => onSelectRow(row.id, event)}>
                {getRowNumber(row.id, editorRows)}
              </button>
              <span className="script-row-hover-controls">
                <RowDragHandle
                  label={`Drag ${getRowLabel(row.id, editorRows)}`}
                  onDragStart={(event) => {
                    event.dataTransfer.effectAllowed = "move";
                    onDragStartRow(row.id);
                  }}
                />
              </span>
            </div>
            <div className="script-row-words">
              {row.textMarks?.length ? (
                <FormattedWordsOverlay isApproved={isApproved} marks={row.textMarks} words={row.words} />
              ) : null}
              {selectionHighlightRanges.length > 0 ? (
                <SelectionHighlightOverlay ranges={selectionHighlightRanges} words={row.words} />
              ) : null}
              <textarea
                className={`script-cell-input words label-s ${row.textMarks?.length ? "has-formatting" : ""}`}
                placeholder={shouldShowEmptyState ? "Write the opening line..." : ""}
                readOnly={isApproved}
                ref={(node) => registerTextArea(wordInputRefs.current, row.id, node)}
                rows={1}
                value={row.words}
                onMouseDown={() => {
                  if (isApproved) {
                    onGuardApproved();
                  }
                }}
                onChange={(event) => onSetField(row.id, "words", event.target.value)}
                onInput={(event) => resizeTextAreaToContent(event.currentTarget)}
                onKeyDown={(event) => onWordsKeyDown(event, row)}
                onKeyUp={(event) => onCaptureSelectionAnchor(row, event.currentTarget)}
                onMouseUp={(event) => onCaptureSelectionAnchor(row, event.currentTarget)}
                onPaste={(event) => onPasteWords(event, row)}
                onSelect={(event) => onCaptureSelectionAnchor(row, event.currentTarget)}
              />
              {showChanges && row.change ? <RowChange change={row.change} /> : null}
            </div>
            {areVisualsVisible ? (
              <div className="script-row-visuals">
                <textarea
                  className="script-cell-input visuals label-s"
                  placeholder=""
                  readOnly={isApproved}
                  ref={(node) => registerTextArea(visualInputRefs.current, row.id, node)}
                  rows={1}
                  value={row.visuals}
                  onMouseDown={() => {
                    if (isApproved) {
                      onGuardApproved();
                    }
                  }}
                  onChange={(event) => onSetField(row.id, "visuals", event.target.value)}
                  onInput={(event) => resizeTextAreaToContent(event.currentTarget)}
                />
                <VisualMediaStrip
                  isApproved={isApproved}
                  media={row.media}
                  openMediaMenuRowId={openMediaMenuRowId}
                  row={row}
                  rows={editorRows}
                  onAddMediaItem={onAddMediaItem}
                  onGuardApproved={onGuardApproved}
                  onSetMediaMenuRow={onSetMediaMenuRow}
                />
              </div>
            ) : null}
            <div className="script-row-comment-gutter">
              <ScriptAnnotationPin
                count={rowComments.length}
                hasUnresolved={hasUnresolvedComments}
                label={getRowLabel(row.id, editorRows)}
                onOpen={(triggerRect) => onOpenRowAnnotation(rowUniversalAnchor, triggerRect)}
              />
              <span className="script-row-menu-wrap script-row-action-menu-wrap">
                <button
                  className="script-row-menu-button"
                  type="button"
                  aria-label={`More row actions for ${getRowLabel(row.id, editorRows)}`}
                  aria-expanded={openRowMenuId === row.id}
                  data-tooltip="More row actions"
                  onClick={() => onSetOpenRowMenu(openRowMenuId === row.id ? null : row.id)}
                >
                  <DsIcon name="dots-three" size={16} />
                </button>
                {openRowMenuId === row.id ? (
                  <span className="script-row-menu">
                    {confirmingDeleteRowId === row.id ? (
                      <ConfirmationDialog title={`Delete ${getRowLabel(row.id, editorRows)}?`} tone="danger" confirmLabel="Delete row" onCancel={onCancelRowDelete} onConfirm={() => onDeleteRow(row.id, true)} />
                    ) : (
                      <>
                        <button
                          className="label-xs-semibold"
                          type="button"
                          onClick={() => {
                            onDuplicateRow(row.id);
                            onSetOpenRowMenu(null);
                          }}
                        >
                          Duplicate row
                        </button>
                        <button className="label-xs-semibold" type="button" onClick={() => onDeleteRow(row.id)}>
                          Delete row
                        </button>
                        <button
                          className="label-xs-semibold"
                          type="button"
                          onClick={() => {
                            onAddRowBefore(row.id);
                            onSetOpenRowMenu(null);
                          }}
                        >
                          Insert above
                        </button>
                        <button
                          className="label-xs-semibold"
                          type="button"
                          onClick={() => {
                            onAddRowAfter(row.id);
                            onSetOpenRowMenu(null);
                          }}
                        >
                          Insert below
                        </button>
                      </>
                    )}
                  </span>
                ) : null}
              </span>
            </div>
          </div>
        );
      })}
    </section>
  );
}

function VisualMediaStrip({
  isApproved,
  media,
  openMediaMenuRowId,
  row,
  rows,
  onAddMediaItem,
  onGuardApproved,
  onSetMediaMenuRow,
}: {
  isApproved: boolean;
  media: ScriptMediaItem[];
  openMediaMenuRowId: string | null;
  row: ScriptRow;
  rows: ScriptRow[];
  onAddMediaItem: (rowId: string, type: ScriptMediaType) => void;
  onGuardApproved: () => boolean;
  onSetMediaMenuRow: (rowId: string | null) => void;
}) {
  return (
    <div className={`script-media-strip ${media.length > 0 ? "has-media" : "empty"}`}>
      {media.length > 0 ? (
        <div className="script-media-preview-row">
          {media.map((mediaItem) => <VisualThumbnailPlaceholder key={mediaItem.id} mediaItem={mediaItem} />)}
        </div>
      ) : null}
      <div className="script-media-chip-row">
        {media.map((mediaItem) => <MediaThumb key={mediaItem.id} mediaItem={mediaItem} />)}
        <AddVisualPlaceholder
          isApproved={isApproved}
          isOpen={openMediaMenuRowId === row.id}
          row={row}
          rows={rows}
          onAddMediaItem={onAddMediaItem}
          onGuardApproved={onGuardApproved}
          onSetMediaMenuRow={onSetMediaMenuRow}
        />
      </div>
    </div>
  );
}

function VisualThumbnailPlaceholder({ mediaItem }: { mediaItem: ScriptMediaItem }) {
  return (
    <span className={`script-visual-thumbnail ${mediaItem.tone}`} aria-hidden="true">
      <DsIcon name={mediaItem.type === "link" ? "link" : mediaItem.type === "upload" ? "upload-simple" : "image-square"} size={20} />
    </span>
  );
}

function AddVisualPlaceholder({
  isApproved,
  isOpen,
  row,
  rows,
  onAddMediaItem,
  onGuardApproved,
  onSetMediaMenuRow,
}: {
  isApproved: boolean;
  isOpen: boolean;
  row: ScriptRow;
  rows: ScriptRow[];
  onAddMediaItem: (rowId: string, type: ScriptMediaType) => void;
  onGuardApproved: () => boolean;
  onSetMediaMenuRow: (rowId: string | null) => void;
}) {
  return <div className="script-visual-empty-wrap">
    <ScriptMediaPicker
      isOpen={isOpen}
      options={scriptMediaPickerOptions}
      triggerLabel={`Add visual to ${getRowLabel(row.id, rows)}`}
      triggerClassName="script-visual-empty"
      triggerTooltip="Add image or footage"
      onOpenChange={(nextOpen) => { if (isApproved) onGuardApproved(); else onSetMediaMenuRow(nextOpen ? row.id : null); }}
      onSelect={(type) => onAddMediaItem(row.id, type)}
    />
  </div>;
}

function MediaThumb({ mediaItem }: { mediaItem: ScriptMediaItem }) {
  return (
    <span className={`script-media-thumb ${mediaItem.tone}`}>
      <span className="script-media-thumb-icon">
        <DsIcon name={mediaItem.type === "link" ? "link" : mediaItem.type === "upload" ? "upload-simple" : "image-square"} size={12} />
      </span>
      <span>
        <strong className="label-xs-semibold">{mediaItem.label}</strong>
      </span>
    </span>
  );
}

function SelectionHighlightOverlay({ ranges, words }: { ranges: TextRange[]; words: string }) {
  const parts: Array<{ highlighted: boolean; key: string; text: string }> = [];
  let cursor = 0;

  ranges.forEach((range, index) => {
    if (range.start > cursor) {
      parts.push({ highlighted: false, key: `copy-${index}`, text: words.slice(cursor, range.start) });
    }

    parts.push({ highlighted: true, key: `highlight-${index}`, text: words.slice(range.start, range.end) });
    cursor = range.end;
  });

  if (cursor < words.length) {
    parts.push({ highlighted: false, key: "copy-tail", text: words.slice(cursor) });
  }

  return (
    <div className="script-selection-highlight-overlay label-s" aria-hidden="true">
      {parts.map((part) => (
        <span className={part.highlighted ? "script-selection-highlight-mark" : undefined} key={part.key}>
          {part.text}
        </span>
      ))}
    </div>
  );
}

function FormattedWordsOverlay({
  isApproved,
  marks,
  words,
}: {
  isApproved: boolean;
  marks: ScriptTextMark[];
  words: string;
}) {
  const boldMarks = normaliseBoldTextMarks(marks, words.length);
  const parts: Array<{ bold: boolean; key: string; text: string }> = [];
  let cursor = 0;

  boldMarks.forEach((mark, index) => {
    if (mark.start > cursor) {
      parts.push({ bold: false, key: `copy-${index}`, text: words.slice(cursor, mark.start) });
    }

    parts.push({ bold: true, key: `bold-${index}`, text: words.slice(mark.start, mark.end) });
    cursor = mark.end;
  });

  if (cursor < words.length) {
    parts.push({ bold: false, key: "copy-tail", text: words.slice(cursor) });
  }

  return (
    <div className={`script-formatted-words-overlay label-s ${isApproved ? "is-read-only" : ""}`} aria-hidden="true">
      {parts.map((part) => part.bold
        ? <strong key={part.key}>{part.text}</strong>
        : <span key={part.key}>{part.text}</span>)}
    </div>
  );
}

function RowChange({ change }: { change: NonNullable<ScriptRow["change"]> }) {
  return (
    <p className="script-row-change label-xs">
      {change.deleted ? <span className="deleted">{change.deleted}</span> : null}
      {change.added ? <strong>{change.added}</strong> : null}
      <span> by {change.author}</span>
    </p>
  );
}

function getSelectionHighlightRanges(row: ScriptRow, comments: ScriptComment[]) {
  const ranges: TextRange[] = [];

  comments.forEach((comment) => {
    if (comment.anchor.kind !== "selection") {
      return;
    }

    const range = getValidTextRange(row.words, comment.anchor.range);

    if (range) {
      ranges.push(range);
      return;
    }

    const fallbackRange = findSnippetRange(row.words, comment.anchor.snippet);

    if (fallbackRange) {
      ranges.push(fallbackRange);
    }
  });

  return mergeTextRanges(ranges);
}

function getValidTextRange(value: string, range?: TextRange) {
  if (!range || range.start < 0 || range.end <= range.start || range.end > value.length) {
    return null;
  }

  return range;
}

function findSnippetRange(value: string, snippet?: string) {
  const normalisedSnippet = normaliseSelectionSnippet(snippet);

  if (!normalisedSnippet) {
    return null;
  }

  const directIndex = value.indexOf(normalisedSnippet);

  if (directIndex !== -1) {
    return { start: directIndex, end: directIndex + normalisedSnippet.length };
  }

  const lowerValue = value.toLocaleLowerCase();
  const lowerSnippet = normalisedSnippet.toLocaleLowerCase();
  const insensitiveIndex = lowerValue.indexOf(lowerSnippet);

  if (insensitiveIndex === -1) {
    return null;
  }

  return { start: insensitiveIndex, end: insensitiveIndex + normalisedSnippet.length };
}

function normaliseSelectionSnippet(snippet?: string) {
  if (!snippet) {
    return "";
  }

  const withoutTruncation = snippet.trim().replace(/\.\.\.$/u, "").trim();

  if (
    (withoutTruncation.startsWith("\"") && withoutTruncation.endsWith("\"")) ||
    (withoutTruncation.startsWith("'") && withoutTruncation.endsWith("'"))
  ) {
    return withoutTruncation.slice(1, -1).trim();
  }

  return withoutTruncation;
}

function mergeTextRanges(ranges: TextRange[]) {
  const sortedRanges = [...ranges].sort((first, second) => first.start - second.start || first.end - second.end);
  const mergedRanges: TextRange[] = [];

  sortedRanges.forEach((range) => {
    const previousRange = mergedRanges[mergedRanges.length - 1];

    if (!previousRange || range.start > previousRange.end) {
      mergedRanges.push({ ...range });
      return;
    }

    previousRange.end = Math.max(previousRange.end, range.end);
  });

  return mergedRanges;
}

function registerTextArea(refs: Map<string, HTMLTextAreaElement>, rowId: string, node: HTMLTextAreaElement | null) {
  if (node) {
    refs.set(rowId, node);
    resizeTextAreaToContent(node);
  } else {
    refs.delete(rowId);
  }
}
