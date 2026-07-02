"use client";

import Link from "next/link";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type ClipboardEvent,
  type KeyboardEvent as ReactKeyboardEvent,
  type MouseEvent as ReactMouseEvent,
} from "react";
import { CommentRail } from "@/components/comment-rail/CommentRail";
import { DsIcon } from "@/components/video-review/DsIcon";
import {
  initialScriptComments,
  initialScriptSubtabs,
  scriptAiFixtures,
  scriptBrief,
  scriptGenres,
  scriptPresence,
  scriptStages,
  scriptTranscriptLines,
  scriptUsers,
  scriptVersions,
  type ScriptComment,
  type ScriptCommentAnchor,
  type ScriptDensity,
  type ScriptElementType,
  type ScriptGenre,
  type ScriptLayoutMode,
  type ScriptMediaItem,
  type ScriptMediaType,
  type ScriptRole,
  type ScriptRow,
  type ScriptStatus,
  type ScriptSubtab,
  type ScriptSubtabId,
  type ScriptVersion,
} from "@/data/script";

const currentUserId = "user-tom";
const layoutModes: Array<{ value: ScriptLayoutMode; label: string }> = [
  { value: "av", label: "AV Script" },
  { value: "simple", label: "Simple Doc" },
  { value: "hollywood", label: "Hollywood" },
];
const densityModes: ScriptDensity[] = ["compact", "comfortable"];
const screenplayTypes: ScriptElementType[] = ["scene", "action", "character", "dialogue", "parenthetical", "transition"];
const mediaMenuOptions: Array<{ type: ScriptMediaType; label: string; icon: Parameters<typeof DsIcon>[0]["name"] }> = [
  { type: "upload", label: "Upload file", icon: "upload-simple" },
  { type: "library", label: "Add from your Media", icon: "play" },
  { type: "stock", label: "Stock footage search", icon: "image-square" },
  { type: "link", label: "Add link", icon: "link" },
];

type SelectionState = {
  lastRowId: string | null;
  selectedRowIds: Set<string>;
};

type ScriptPageProps = {
  initialRole: ScriptRole;
};

export function ScriptPage({ initialRole }: ScriptPageProps) {
  const latestVersion = scriptVersions[scriptVersions.length - 1];
  const [role] = useState<ScriptRole>(initialRole);
  const isCustomer = role === "customer";
  const [layoutMode, setLayoutMode] = useState<ScriptLayoutMode>("av");
  const [density, setDensity] = useState<ScriptDensity>("compact");
  const [showChanges, setShowChanges] = useState(false);
  const [genre, setGenre] = useState<ScriptGenre>(scriptBrief.genre);
  const [status, setStatus] = useState<ScriptStatus>("In script");
  const [versions, setVersions] = useState<ScriptVersion[]>(() => cloneVersions(scriptVersions));
  const [selectedVersionId, setSelectedVersionId] = useState(latestVersion.id);
  const [rows, setRows] = useState<ScriptRow[]>(() => cloneRows(latestVersion.rows));
  const [rowHistory, setRowHistory] = useState<ScriptRow[][]>(() => [cloneRows(latestVersion.rows)]);
  const [historyIndex, setHistoryIndex] = useState(0);
  const [selectionState, setSelectionState] = useState<SelectionState>({
    lastRowId: null,
    selectedRowIds: new Set<string>(),
  });
  const [activeCommentAnchor, setActiveCommentAnchor] = useState<ScriptCommentAnchor>({
    kind: "overall",
    label: "Overall",
  });
  const [subtabs, setSubtabs] = useState<ScriptSubtab[]>(() => initialScriptSubtabs.map((tab) => ({ ...tab })));
  const [activeSubtabId, setActiveSubtabId] = useState<ScriptSubtabId>("script");
  const [isSubtabMenuOpen, setIsSubtabMenuOpen] = useState(false);
  const [draggingTabId, setDraggingTabId] = useState<ScriptSubtabId | null>(null);
  const [draggingRowId, setDraggingRowId] = useState<string | null>(null);
  const [dropRowId, setDropRowId] = useState<string | null>(null);
  const [openMediaMenuRowId, setOpenMediaMenuRowId] = useState<string | null>(null);
  const [isApprovedEditModalOpen, setIsApprovedEditModalOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [saveState, setSaveState] = useState<"Saved" | "Saving...">("Saved");
  const [downstreamPaused, setDownstreamPaused] = useState(false);
  const [isAiPanelOpen, setIsAiPanelOpen] = useState(false);
  const [isAiPanelMinimised, setIsAiPanelMinimised] = useState(false);
  const [aiPrompt, setAiPrompt] = useState("");
  const [showAiToCustomer, setShowAiToCustomer] = useState(scriptBrief.showAiToCustomer);
  const [aiSources, setAiSources] = useState(["Brief", "Transcript v2", "Past scripts"]);
  const [aiResponse, setAiResponse] = useState<string>(scriptAiFixtures[0]);
  const saveTimeoutRef = useRef<number | null>(null);
  const rowRefs = useRef(new Map<string, HTMLDivElement>());
  const wordInputRefs = useRef(new Map<string, HTMLTextAreaElement>());
  const scriptSubtab = subtabs.find((tab) => tab.id === "script");
  const isScriptApproved = Boolean(scriptSubtab?.approved);
  const visibleSubtabs = subtabs.filter((tab) => tab.visible && (tab.id !== "transcripts" || scriptBrief.hasDialogueMedia));
  const selectedRows = rows.filter((row) => selectionState.selectedRowIds.has(row.id));
  const activeVersion = versions.find((version) => version.id === selectedVersionId) ?? versions[versions.length - 1];
  const totalWords = rows.reduce((total, row) => (row.deletedMeta ? total : total + countWords(row.words)), 0);
  const approxSeconds = Math.round(totalWords / 2.5);
  const targetWords = scriptBrief.targetDurationSeconds * 2.5;
  const wordDelta = Math.abs(totalWords - targetWords);
  const wordState = wordDelta <= 10 ? "good" : wordDelta <= 25 ? "warning" : "danger";
  const shouldShowAi = !isCustomer || showAiToCustomer;

  useEffect(() => {
    if (isCustomer) {
      setLayoutMode("av");
    }
  }, [isCustomer]);

  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        window.clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const isUndo = (event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "z" && !event.shiftKey;
      const isRedo =
        ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "z" && event.shiftKey) ||
        ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "y");

      if (isUndo) {
        event.preventDefault();
        undoRows();
      }

      if (isRedo) {
        event.preventDefault();
        redoRows();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  });

  const visibleRows = rows.filter((row) => !row.deletedMeta);
  const docValue = visibleRows.map((row) => row.words).join("\n\n");

  const guardEditable = () => {
    if (!isScriptApproved) {
      return true;
    }

    setIsApprovedEditModalOpen(true);
    return false;
  };

  const markSaving = () => {
    setSaveState("Saving...");

    if (saveTimeoutRef.current) {
      window.clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = window.setTimeout(() => {
      setSaveState("Saved");
    }, 650);
  };

  const pushRows = (nextRows: ScriptRow[]) => {
    setRows(nextRows);
    setRowHistory((currentHistory) => {
      const trimmedHistory = currentHistory.slice(0, historyIndex + 1);
      const nextHistory = [...trimmedHistory, cloneRows(nextRows)];
      setHistoryIndex(nextHistory.length - 1);
      return nextHistory.slice(-80);
    });
    markSaving();
  };

  const updateRows = (updater: (currentRows: ScriptRow[]) => ScriptRow[]) => {
    if (!guardEditable()) {
      return;
    }

    pushRows(updater(cloneRows(rows)));
  };

  const undoRows = () => {
    if (!guardEditable() || historyIndex <= 0) {
      return;
    }

    const nextIndex = historyIndex - 1;
    setHistoryIndex(nextIndex);
    setRows(cloneRows(rowHistory[nextIndex]));
    markSaving();
  };

  const redoRows = () => {
    if (!guardEditable() || historyIndex >= rowHistory.length - 1) {
      return;
    }

    const nextIndex = historyIndex + 1;
    setHistoryIndex(nextIndex);
    setRows(cloneRows(rowHistory[nextIndex]));
    markSaving();
  };

  const setRowField = (rowId: string, field: "words" | "visuals", value: string) => {
    updateRows((currentRows) =>
      currentRows.map((row) =>
        row.id === rowId
          ? {
              ...row,
              [field]: value,
              change: {
                deleted: row.change?.deleted,
                added: field === "words" ? "Edited just now" : row.change?.added,
                author: "Tom",
              },
            }
          : row,
      ),
    );
  };

  const addRowAfter = (rowId: string | null) => {
    updateRows((currentRows) => {
      const newRow = createEmptyRow(currentRows.length + 1);

      if (!rowId) {
        return [...currentRows, newRow];
      }

      const rowIndex = currentRows.findIndex((row) => row.id === rowId);

      if (rowIndex === -1) {
        return [...currentRows, newRow];
      }

      return [...currentRows.slice(0, rowIndex + 1), newRow, ...currentRows.slice(rowIndex + 1)];
    });
  };

  const restoreRow = (rowId: string) => {
    updateRows((currentRows) =>
      currentRows.map((row) =>
        row.id === rowId
          ? {
              ...row,
              deletedMeta: undefined,
            }
          : row,
      ),
    );
  };

  const deleteSelectedRows = () => {
    if (selectedRows.length === 0) {
      return;
    }

    updateRows((currentRows) =>
      currentRows.map((row) =>
        selectionState.selectedRowIds.has(row.id)
          ? {
              ...row,
              deletedMeta: {
                person: "Tom",
                time: "just now",
              },
            }
          : row,
      ),
    );
    setSelectionState({ lastRowId: null, selectedRowIds: new Set<string>() });
  };

  const duplicateSelectedRows = () => {
    if (selectedRows.length === 0) {
      return;
    }

    updateRows((currentRows) => {
      const lastSelectedIndex = Math.max(...selectedRows.map((row) => currentRows.findIndex((currentRow) => currentRow.id === row.id)));
      const copies = selectedRows.map((row, index) => ({
        ...cloneRow(row),
        id: `row-copy-${Date.now()}-${index}`,
        deletedMeta: undefined,
      }));

      return [...currentRows.slice(0, lastSelectedIndex + 1), ...copies, ...currentRows.slice(lastSelectedIndex + 1)];
    });
  };

  const moveSelectedRows = (direction: -1 | 1) => {
    if (selectedRows.length === 0) {
      return;
    }

    updateRows((currentRows) => moveRowsBySelection(currentRows, selectionState.selectedRowIds, direction));
  };

  const handleWordsKeyDown = (event: ReactKeyboardEvent<HTMLTextAreaElement>, row: ScriptRow) => {
    if (layoutMode === "hollywood" && event.key === "Tab") {
      event.preventDefault();
      cycleElementType(row.id);
      return;
    }

    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      addRowAfter(row.id);
    }
  };

  const handleWordsPaste = (event: ClipboardEvent<HTMLTextAreaElement>, row: ScriptRow) => {
    const text = event.clipboardData.getData("text");
    const lines = text
      .split(/\r?\n/u)
      .map((line) => line.trim())
      .filter(Boolean);

    if (lines.length <= 1) {
      return;
    }

    event.preventDefault();
    updateRows((currentRows) => {
      const rowIndex = currentRows.findIndex((currentRow) => currentRow.id === row.id);

      if (rowIndex === -1) {
        return currentRows;
      }

      const extraRows = lines.slice(1).map((line, index) => ({
        ...createEmptyRow(currentRows.length + index + 1),
        words: line,
      }));

      return [
        ...currentRows.slice(0, rowIndex),
        { ...currentRows[rowIndex], words: lines[0] },
        ...extraRows,
        ...currentRows.slice(rowIndex + 1),
      ];
    });
  };

  const cycleElementType = (rowId: string) => {
    updateRows((currentRows) =>
      currentRows.map((row) => {
        if (row.id !== rowId) {
          return row;
        }

        const currentIndex = screenplayTypes.indexOf(row.elementType);
        const nextType = screenplayTypes[(currentIndex + 1) % screenplayTypes.length];
        return { ...row, elementType: nextType };
      }),
    );
  };

  const selectRow = (rowId: string, event: ReactMouseEvent<HTMLButtonElement>) => {
    const isRange = event.shiftKey && selectionState.lastRowId;
    const isToggle = event.metaKey || event.ctrlKey;

    setActiveCommentAnchor({
      kind: "row",
      label: getRowLabel(rowId, rows),
      rowId,
    });

    setSelectionState((currentSelection) => {
      if (isRange && currentSelection.lastRowId) {
        return {
          lastRowId: rowId,
          selectedRowIds: getRowsInRange(rows, currentSelection.lastRowId, rowId),
        };
      }

      if (isToggle) {
        const nextSelectedRows = new Set(currentSelection.selectedRowIds);

        if (nextSelectedRows.has(rowId)) {
          nextSelectedRows.delete(rowId);
        } else {
          nextSelectedRows.add(rowId);
        }

        return { lastRowId: rowId, selectedRowIds: nextSelectedRows };
      }

      return { lastRowId: rowId, selectedRowIds: new Set([rowId]) };
    });
  };

  const captureSelectionAnchor = (row: ScriptRow, target: HTMLTextAreaElement) => {
    const selectedText = target.value.slice(target.selectionStart, target.selectionEnd).trim();

    if (!selectedText) {
      return;
    }

    setActiveCommentAnchor({
      kind: "selection",
      label: getRowLabel(row.id, rows),
      rowId: row.id,
      snippet: selectedText.length > 44 ? `${selectedText.slice(0, 44)}...` : selectedText,
    });
  };

  const addMediaItem = (rowId: string, type: ScriptMediaType) => {
    updateRows((currentRows) =>
      currentRows.map((row) =>
        row.id === rowId
          ? {
              ...row,
              media: [...row.media, createMediaItem(type, row.media.length + 1)],
            }
          : row,
      ),
    );
    setOpenMediaMenuRowId(null);
  };

  const reorderRows = (sourceRowId: string, targetRowId: string) => {
    if (sourceRowId === targetRowId) {
      setDraggingRowId(null);
      setDropRowId(null);
      return;
    }

    updateRows((currentRows) => {
      const sourceIndex = currentRows.findIndex((row) => row.id === sourceRowId);
      const targetIndex = currentRows.findIndex((row) => row.id === targetRowId);

      if (sourceIndex === -1 || targetIndex === -1) {
        return currentRows;
      }

      const nextRows = [...currentRows];
      const [movingRow] = nextRows.splice(sourceIndex, 1);
      nextRows.splice(targetIndex, 0, movingRow);
      return nextRows;
    });
    setDraggingRowId(null);
    setDropRowId(null);
  };

  const selectVersion = (versionId: string) => {
    const version = versions.find((item) => item.id === versionId);

    if (!version) {
      return;
    }

    setSelectedVersionId(version.id);
    setRows(cloneRows(version.rows));
    setRowHistory([cloneRows(version.rows)]);
    setHistoryIndex(0);
    setSaveState("Saved");
    setToastMessage(`${version.snapshotName} restored`);
  };

  const toggleSubtabApproval = (tabId: ScriptSubtabId) => {
    setSubtabs((currentSubtabs) =>
      currentSubtabs.map((tab) => (tab.id === tabId ? { ...tab, approved: !tab.approved } : tab)),
    );

    if (tabId === "script" && isScriptApproved) {
      unapproveScript(false);
    }
  };

  const approveScript = () => {
    setSubtabs((currentSubtabs) =>
      currentSubtabs.map((tab) => (tab.id === "script" ? { ...tab, approved: true } : tab)),
    );
    setStatus("Approved");
    setDownstreamPaused(false);
    setToastMessage("Script approved");
  };

  const unapproveScript = (shouldDuplicateSnapshot: boolean) => {
    setSubtabs((currentSubtabs) =>
      currentSubtabs.map((tab) => (tab.id === "script" ? { ...tab, approved: false } : tab)),
    );
    setStatus("Waiting on Customer");
    setDownstreamPaused(true);

    if (shouldDuplicateSnapshot) {
      const actor = role === "customer" ? "Customer" : "Studio";
      const snapshotName = `Script v${versions.length + 1} (${actor} Edit) - ${formatSnapshotDate(new Date())}`;
      const snapshot: ScriptVersion = {
        id: `v${versions.length + 1}`,
        label: `v${versions.length + 1}`,
        snapshotName,
        approvedSnapshot: false,
        createdBy: actor,
        createdAt: formatSnapshotDate(new Date()),
        rows: cloneRows(rows),
      };

      setVersions((currentVersions) => [...currentVersions, snapshot]);
      setSelectedVersionId(snapshot.id);
    }

    setToastMessage(
      role === "customer"
        ? "You edited an approved script. This moved the project back to 'Waiting on Customer.' Work is paused until you re-approve the new version."
        : `Heads up: ${scriptBrief.customerName} edited an approved script. The project is back in 'Waiting on Customer' and work is paused until re-approved.`,
    );
  };

  const proceedWithApprovedEdit = () => {
    setIsApprovedEditModalOpen(false);
    unapproveScript(true);
  };

  const toggleOptionalSubtab = (tabId: ScriptSubtabId) => {
    setSubtabs((currentSubtabs) =>
      currentSubtabs.map((tab) => (tab.id === tabId ? { ...tab, visible: !tab.visible } : tab)),
    );
  };

  const reorderSubtabs = (targetTabId: ScriptSubtabId) => {
    if (!draggingTabId || draggingTabId === targetTabId) {
      return;
    }

    setSubtabs((currentSubtabs) => {
      const sourceIndex = currentSubtabs.findIndex((tab) => tab.id === draggingTabId);
      const targetIndex = currentSubtabs.findIndex((tab) => tab.id === targetTabId);

      if (sourceIndex === -1 || targetIndex === -1) {
        return currentSubtabs;
      }

      const nextSubtabs = [...currentSubtabs];
      const [movingTab] = nextSubtabs.splice(sourceIndex, 1);
      nextSubtabs.splice(targetIndex, 0, movingTab);
      return nextSubtabs;
    });
  };

  const updateDocValue = (value: string) => {
    updateRows((currentRows) => {
      const paragraphs = value.split(/\n{2,}/u);
      const nextRows = currentRows.map((row, index) => ({
        ...row,
        words: paragraphs[index] ?? "",
      }));

      if (paragraphs.length > nextRows.length) {
        paragraphs.slice(nextRows.length).forEach((paragraph, index) => {
          nextRows.push({
            ...createEmptyRow(nextRows.length + index + 1),
            words: paragraph,
          });
        });
      }

      return nextRows;
    });
  };

  const applyRichTextMark = (mark: "bold" | "italic" | "strike" | "heading" | "bullet" | "number" | "link") => {
    const activeRowId = selectionState.lastRowId ?? visibleRows[0]?.id;

    if (!activeRowId) {
      return;
    }

    const input = wordInputRefs.current.get(activeRowId);

    if (!input) {
      return;
    }

    const start = input.selectionStart;
    const end = input.selectionEnd;
    const value = input.value;
    const selectedText = value.slice(start, end) || "selected text";
    const replacement = getMarkedText(mark, selectedText);
    const nextValue = `${value.slice(0, start)}${replacement}${value.slice(end)}`;
    setRowField(activeRowId, "words", nextValue);
    window.setTimeout(() => input.focus(), 0);
  };

  const insertAiLines = () => {
    updateRows((currentRows) => {
      const activeRowId = selectionState.lastRowId ?? currentRows[0]?.id;
      const activeIndex = activeRowId ? currentRows.findIndex((row) => row.id === activeRowId) : currentRows.length - 1;
      const insertIndex = activeIndex === -1 ? currentRows.length : activeIndex + 1;
      const aiRows = scriptAiFixtures.slice(0, 2).map((line, index) => ({
        ...createEmptyRow(currentRows.length + index + 1),
        words: line,
        visuals: "AI suggested visual direction ready for refinement.",
      }));

      return [...currentRows.slice(0, insertIndex), ...aiRows, ...currentRows.slice(insertIndex)];
    });
    setAiResponse("Inserted two suggested lines under the current row.");
  };

  return (
    <main className={`script-shell script-density-${density}`}>
      <ScriptHeader role={role} />
      <section className="script-stage-strip" aria-label="Project stages">
        {scriptStages.map((stage) => {
          const isCurrent = stage.id === "script";
          const isPausedDownstream = downstreamPaused && (stage.id === "edit" || stage.id === "masters");
          return (
            <button
              className={`script-stage-pill label-xs-semibold ${isCurrent ? "current" : ""} ${isPausedDownstream ? "disabled" : ""}`}
              type="button"
              disabled={isPausedDownstream}
              key={stage.id}
            >
              <img src={stage.icon} alt="" />
              {stage.label}
            </button>
          );
        })}
      </section>

      <section className="script-subtab-bar" aria-label="Script sub-tabs">
        <div className="script-subtab-list">
          {visibleSubtabs.map((tab) => (
            <div
              className={`script-subtab ${activeSubtabId === tab.id ? "active" : ""}`}
              draggable
              key={tab.id}
              onDragStart={() => setDraggingTabId(tab.id)}
              onDragOver={(event) => event.preventDefault()}
              onDrop={() => reorderSubtabs(tab.id)}
            >
              <button
                className="script-subtab-main label-s-semibold"
                type="button"
                aria-pressed={activeSubtabId === tab.id}
                onClick={() => setActiveSubtabId(tab.id)}
              >
                <span className="script-drag-dots" aria-hidden="true">::::</span>
                {tab.label}
              </button>
              <button
                className={`script-subtab-approval label-xs-semibold ${tab.approved ? "approved" : ""}`}
                type="button"
                onClick={() => toggleSubtabApproval(tab.id)}
              >
                {tab.approved ? "Un-approve" : "Approve"}
              </button>
            </div>
          ))}
        </div>
        <div className="script-subtab-menu-wrap">
          <button
            className="script-icon-button"
            type="button"
            aria-label="More sub-tabs"
            aria-expanded={isSubtabMenuOpen}
            onClick={() => setIsSubtabMenuOpen((isOpen) => !isOpen)}
          >
            <DsIcon name="dots-three" size={18} />
          </button>
          {isSubtabMenuOpen ? (
            <div className="script-subtab-menu">
              {subtabs
                .filter((tab) => tab.optional)
                .map((tab) => (
                  <button className="label-s" type="button" key={tab.id} onClick={() => toggleOptionalSubtab(tab.id)}>
                    {tab.visible ? "Hide" : "Show"} {tab.label}
                  </button>
                ))}
            </div>
          ) : null}
        </div>
      </section>

      <section className="script-toolbar" aria-label="Script toolbar">
        {!isCustomer ? (
          <SegmentedControl
            label="Layout"
            options={layoutModes}
            value={layoutMode}
            onChange={(value) => setLayoutMode(value)}
          />
        ) : null}
        <ToggleButton active={showChanges} label="Show changes" onClick={() => setShowChanges((isVisible) => !isVisible)} />
        <div className="script-density-toggle" role="group" aria-label="Density">
          {densityModes.map((mode) => (
            <button
              className={`script-toolbar-button label-xs-semibold ${density === mode ? "active" : ""}`}
              type="button"
              key={mode}
              onClick={() => setDensity(mode)}
            >
              {capitalise(mode)}
            </button>
          ))}
        </div>
        <label className="script-select-wrap label-xs-semibold">
          Version
          <select className="script-select label-xs-semibold" value={selectedVersionId} onChange={(event) => selectVersion(event.target.value)}>
            {versions.map((version) => (
              <option key={version.id} value={version.id}>
                {version.label} {version.approvedSnapshot ? "approved" : "current"}
              </option>
            ))}
          </select>
        </label>
        <span className={`script-status-pill label-xs-semibold status-${status.toLowerCase().replaceAll(" ", "-")}`}>
          {status}
        </span>
        <span className="script-save-state label-xs-semibold">{saveState}</span>
        <div className="script-presence" aria-label="Live presence">
          {scriptPresence.map((person) => (
            <span className={`avatar ${person.tone}`} aria-label={person.name} key={person.id}>
              {person.initials}
            </span>
          ))}
        </div>
        <div className="script-toolbar-spacer" />
        {selectedRows.length > 0 ? (
          <div className="script-bulk-actions" aria-label="Selected row actions">
            <span className="label-xs-semibold">{selectedRows.length} selected</span>
            <button className="script-toolbar-button label-xs-semibold" type="button" onClick={() => moveSelectedRows(-1)}>
              Move up
            </button>
            <button className="script-toolbar-button label-xs-semibold" type="button" onClick={() => moveSelectedRows(1)}>
              Move down
            </button>
            <button className="script-toolbar-button label-xs-semibold" type="button" onClick={duplicateSelectedRows}>
              Copy
            </button>
            <button className="script-toolbar-button danger label-xs-semibold" type="button" onClick={deleteSelectedRows}>
              Delete
            </button>
          </div>
        ) : null}
        <button className="script-approve-button label-s-semibold" type="button" onClick={approveScript}>
          {isScriptApproved ? "Approved" : "Approve script"}
        </button>
      </section>

      <section className="script-body">
        <div className="script-editor-column">
          <RichTextToolbar onApply={applyRichTextMark} onUndo={undoRows} onRedo={redoRows} />
          <div className="script-version-note label-xs">
            {activeVersion.snapshotName} - Track changes on
          </div>
          {activeSubtabId === "script" ? (
            <>
              {layoutMode === "av" ? (
                <AvScriptEditor
                  activeCommentAnchor={activeCommentAnchor}
                  density={density}
                  dropRowId={dropRowId}
                  isApproved={isScriptApproved}
                  openMediaMenuRowId={openMediaMenuRowId}
                  rows={rows}
                  selectedRowIds={selectionState.selectedRowIds}
                  showChanges={showChanges}
                  wordInputRefs={wordInputRefs}
                  onAddMediaItem={addMediaItem}
                  onAddRowAfter={addRowAfter}
                  onCaptureSelectionAnchor={captureSelectionAnchor}
                  onDragEnd={() => {
                    setDraggingRowId(null);
                    setDropRowId(null);
                  }}
                  onDragOverRow={(rowId) => setDropRowId(rowId)}
                  onDragStartRow={setDraggingRowId}
                  onGuardApproved={guardEditable}
                  onPasteWords={handleWordsPaste}
                  onReorderRows={(targetRowId) => {
                    if (draggingRowId) {
                      reorderRows(draggingRowId, targetRowId);
                    }
                  }}
                  onRestoreRow={restoreRow}
                  onSelectRow={selectRow}
                  onSetField={setRowField}
                  onSetMediaMenuRow={setOpenMediaMenuRowId}
                  onWordsKeyDown={handleWordsKeyDown}
                  registerRowRef={(rowId, node) => registerRowRef(rowRefs.current, rowId, node)}
                />
              ) : null}
              {layoutMode === "simple" ? (
                <SimpleDocEditor
                  docValue={docValue}
                  isApproved={isScriptApproved}
                  showChanges={showChanges}
                  rows={rows}
                  onGuardApproved={guardEditable}
                  onUpdateDoc={updateDocValue}
                />
              ) : null}
              {layoutMode === "hollywood" ? (
                <HollywoodEditor
                  isApproved={isScriptApproved}
                  rows={rows}
                  selectedRowIds={selectionState.selectedRowIds}
                  showChanges={showChanges}
                  wordInputRefs={wordInputRefs}
                  onCaptureSelectionAnchor={captureSelectionAnchor}
                  onGuardApproved={guardEditable}
                  onSelectRow={selectRow}
                  onSetField={setRowField}
                  onSetType={(rowId, elementType) =>
                    updateRows((currentRows) =>
                      currentRows.map((row) => (row.id === rowId ? { ...row, elementType } : row)),
                    )
                  }
                  onWordsKeyDown={handleWordsKeyDown}
                  registerRowRef={(rowId, node) => registerRowRef(rowRefs.current, rowId, node)}
                />
              ) : null}
              {showChanges ? <RedlineLegend /> : null}
            </>
          ) : (
            <AuxiliarySubtabContent activeSubtabId={activeSubtabId} />
          )}
        </div>
        <CommentRail
          activeAnchor={activeCommentAnchor}
          canPostInternal={!isCustomer}
          canSeeInternal={!isCustomer}
          comments={initialScriptComments}
          currentUserId={currentUserId}
          filterMode={isCustomer ? "customer" : "studio"}
          users={scriptUsers}
          onSelectComment={(comment) => {
            const rowId = comment.anchor.rowId;

            if (rowId) {
              rowRefs.current.get(rowId)?.scrollIntoView({ block: "center", behavior: "smooth" });
            }
          }}
        />
      </section>

      <footer className={`script-word-footer word-${wordState}`}>
        <div className="script-word-footer-main">
          <span className="script-word-state-dot" aria-hidden="true" />
          <strong>Total: {totalWords} Words</strong>
          <span>(Approx {approxSeconds} seconds)</span>
          <span>Target: {scriptBrief.targetDurationSeconds} seconds</span>
        </div>
        <button className="script-toolbar-button label-s-semibold" type="button" onClick={() => addRowAfter(visibleRows.at(-1)?.id ?? null)}>
          <DsIcon name="plus" size={16} />
          Add row
        </button>
      </footer>

      {shouldShowAi ? (
        <>
          {!isAiPanelOpen ? (
            <button className="script-ai-fab label-s-semibold" type="button" onClick={() => setIsAiPanelOpen(true)}>
              ChopChop AI
            </button>
          ) : null}
          {isAiPanelOpen ? (
            <aside className={`script-ai-panel ${isAiPanelMinimised ? "minimised" : ""}`} aria-label="ChopChop AI panel">
              <div className="script-ai-header">
                <h2 className="heading-3xs">ChopChop AI</h2>
                <div className="script-ai-actions">
                  {!isCustomer ? (
                    <label className="script-ai-toggle label-xs-semibold">
                      <input
                        type="checkbox"
                        checked={showAiToCustomer}
                        onChange={(event) => setShowAiToCustomer(event.target.checked)}
                      />
                      Show AI to customer
                    </label>
                  ) : null}
                  <button className="script-icon-button" type="button" aria-label="Minimise AI" onClick={() => setIsAiPanelMinimised((value) => !value)}>
                    {isAiPanelMinimised ? "+" : "-"}
                  </button>
                  <button className="script-icon-button" type="button" aria-label="Close AI" onClick={() => setIsAiPanelOpen(false)}>
                    <DsIcon name="x-close-cross" size={14} />
                  </button>
                </div>
              </div>
              {!isAiPanelMinimised ? (
                <>
                  <div className="script-ai-sources" aria-label="AI input sources">
                    {aiSources.map((source) => (
                      <button
                        className="script-source-chip label-xs-semibold"
                        type="button"
                        key={source}
                        onClick={() => setAiSources((currentSources) => currentSources.filter((item) => item !== source))}
                      >
                        {source}
                        <DsIcon name="x-close-cross" size={10} />
                      </button>
                    ))}
                    <button className="script-source-chip add label-xs-semibold" type="button" onClick={() => setAiSources((currentSources) => [...currentSources, "Brand notes"])}>
                      + Add source
                    </button>
                  </div>
                  <div className="script-ai-command-grid">
                    {["Generate script", "Rewrite selection", "Give feedback", "Suggest visuals", "Paper edit"].map((action) => (
                      <button
                        className="script-toolbar-button label-xs-semibold"
                        type="button"
                        key={action}
                        disabled={action === "Paper edit" && !aiSources.some((source) => source.includes("Transcript"))}
                        onClick={() => setAiResponse(`${action}: ${scriptAiFixtures[1]}`)}
                      >
                        {action}
                      </button>
                    ))}
                  </div>
                  <textarea
                    className="script-ai-input label-s"
                    placeholder="Ask for a rewrite, a note, or a visual idea..."
                    value={aiPrompt}
                    onChange={(event) => setAiPrompt(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" && !event.shiftKey) {
                        event.preventDefault();
                        setAiResponse(aiPrompt.trim() || scriptAiFixtures[2]);
                      }
                    }}
                  />
                  <div className="script-ai-response">
                    <p className="paragraph-s">{aiResponse}</p>
                    <button className="script-toolbar-button label-xs-semibold" type="button" onClick={insertAiLines}>
                      Insert
                    </button>
                  </div>
                </>
              ) : null}
            </aside>
          ) : null}
        </>
      ) : null}

      {isApprovedEditModalOpen ? (
        <div className="script-modal-backdrop" role="presentation">
          <section className="script-edit-modal" role="dialog" aria-modal="true" aria-labelledby="script-edit-warning-title">
            <h2 id="script-edit-warning-title">This script is approved.</h2>
            <p>Any edits will un-approve it and move the video back into the script stage. Do you want to proceed?</p>
            <div className="script-modal-actions">
              <button className="script-toolbar-button label-s-semibold" type="button" onClick={() => setIsApprovedEditModalOpen(false)}>
                Cancel
              </button>
              <button className="script-approve-button label-s-semibold" type="button" onClick={proceedWithApprovedEdit}>
                Proceed with edit
              </button>
            </div>
          </section>
        </div>
      ) : null}

      {toastMessage ? (
        <div className="toast-message script-toast label-s-semibold" role="status">
          {toastMessage}
          <button type="button" aria-label="Dismiss notification" onClick={() => setToastMessage("")}>
            Got it
          </button>
        </div>
      ) : null}
    </main>
  );
}

function ScriptHeader({ role }: { role: ScriptRole }) {
  return (
    <header className="script-header">
      <div>
        <Link className="project-overview-back label-s-semibold" href="/active-videos">
          Back to Active Videos
        </Link>
        <span className="project-overview-client label-xs-semibold">Script</span>
        <h1 className="script-title">{scriptBrief.projectName}</h1>
      </div>
      <div className="script-role-links" aria-label="View as role">
        <Link className={`script-role-link label-xs-semibold ${role === "studio" ? "active" : ""}`} href="/projects/mock-project/script?role=studio">
          Studio
        </Link>
        <Link className={`script-role-link label-xs-semibold ${role === "customer" ? "active" : ""}`} href="/projects/mock-project/script?role=customer">
          Customer
        </Link>
      </div>
    </header>
  );
}

function SegmentedControl<TValue extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: Array<{ value: TValue; label: string }>;
  value: TValue;
  onChange: (value: TValue) => void;
}) {
  return (
    <div className="script-segmented-wrap" aria-label={label}>
      {options.map((option) => (
        <button
          className={`script-toolbar-button label-xs-semibold ${value === option.value ? "active" : ""}`}
          type="button"
          key={option.value}
          aria-pressed={value === option.value}
          onClick={() => onChange(option.value)}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

function ToggleButton({ active, label, onClick }: { active: boolean; label: string; onClick: () => void }) {
  return (
    <button className={`script-toolbar-button label-xs-semibold ${active ? "active" : ""}`} type="button" aria-pressed={active} onClick={onClick}>
      {label}
    </button>
  );
}

function RichTextToolbar({
  onApply,
  onUndo,
  onRedo,
}: {
  onApply: (mark: "bold" | "italic" | "strike" | "heading" | "bullet" | "number" | "link") => void;
  onUndo: () => void;
  onRedo: () => void;
}) {
  return (
    <div className="script-rich-toolbar" aria-label="Rich text tools">
      <button className="script-icon-button label-xs-semibold" type="button" data-tooltip="Undo" aria-label="Undo" onClick={onUndo}>
        <DsIcon name="arrow-counter-clockwise" size={16} />
      </button>
      <button className="script-icon-button label-xs-semibold" type="button" data-tooltip="Redo" aria-label="Redo" onClick={onRedo}>
        <DsIcon name="arrow-clockwise" size={16} />
      </button>
      <button className="script-format-button label-xs-semibold" type="button" aria-label="Bold" onClick={() => onApply("bold")}>
        B
      </button>
      <button className="script-format-button italic label-xs-semibold" type="button" aria-label="Italic" onClick={() => onApply("italic")}>
        I
      </button>
      <button className="script-format-button strike label-xs-semibold" type="button" aria-label="Strikethrough" onClick={() => onApply("strike")}>
        S
      </button>
      <button className="script-format-button label-xs-semibold" type="button" aria-label="Heading" onClick={() => onApply("heading")}>
        H
      </button>
      <button className="script-format-button label-xs-semibold" type="button" aria-label="Bulleted list" onClick={() => onApply("bullet")}>
        *
      </button>
      <button className="script-format-button label-xs-semibold" type="button" aria-label="Numbered list" onClick={() => onApply("number")}>
        1.
      </button>
      <button className="script-icon-button" type="button" data-tooltip="Auto-link" aria-label="Auto-link" onClick={() => onApply("link")}>
        <DsIcon name="link" size={16} />
      </button>
    </div>
  );
}

function AvScriptEditor({
  activeCommentAnchor,
  density,
  dropRowId,
  isApproved,
  openMediaMenuRowId,
  rows,
  selectedRowIds,
  showChanges,
  wordInputRefs,
  onAddMediaItem,
  onAddRowAfter,
  onCaptureSelectionAnchor,
  onDragEnd,
  onDragOverRow,
  onDragStartRow,
  onGuardApproved,
  onPasteWords,
  onReorderRows,
  onRestoreRow,
  onSelectRow,
  onSetField,
  onSetMediaMenuRow,
  onWordsKeyDown,
  registerRowRef,
}: {
  activeCommentAnchor: ScriptCommentAnchor;
  density: ScriptDensity;
  dropRowId: string | null;
  isApproved: boolean;
  openMediaMenuRowId: string | null;
  rows: ScriptRow[];
  selectedRowIds: Set<string>;
  showChanges: boolean;
  wordInputRefs: React.MutableRefObject<Map<string, HTMLTextAreaElement>>;
  onAddMediaItem: (rowId: string, type: ScriptMediaType) => void;
  onAddRowAfter: (rowId: string | null) => void;
  onCaptureSelectionAnchor: (row: ScriptRow, target: HTMLTextAreaElement) => void;
  onDragEnd: () => void;
  onDragOverRow: (rowId: string) => void;
  onDragStartRow: (rowId: string) => void;
  onGuardApproved: () => boolean;
  onPasteWords: (event: ClipboardEvent<HTMLTextAreaElement>, row: ScriptRow) => void;
  onReorderRows: (targetRowId: string) => void;
  onRestoreRow: (rowId: string) => void;
  onSelectRow: (rowId: string, event: ReactMouseEvent<HTMLButtonElement>) => void;
  onSetField: (rowId: string, field: "words" | "visuals", value: string) => void;
  onSetMediaMenuRow: (rowId: string | null) => void;
  onWordsKeyDown: (event: ReactKeyboardEvent<HTMLTextAreaElement>, row: ScriptRow) => void;
  registerRowRef: (rowId: string, node: HTMLDivElement | null) => void;
}) {
  return (
    <section className="script-av-surface" aria-label="AV script editor">
      <div className="script-guide-grid">
        <div className="script-guide-card words">
          <h2>Words</h2>
          <p className="paragraph-s">Write one sentence per row. 150 words equals 1 minute.</p>
        </div>
        <div className="script-guide-card visuals">
          <div className="script-visual-header">
            <h2>Visuals + Media</h2>
            <button
              className="script-visual-pill label-xs-semibold"
              type="button"
              data-tooltip="Describe the visuals and add media for each line of your script."
            >
              + Visuals
            </button>
            <button className="script-toolbar-button label-xs-semibold" type="button">
              Suggest visuals
            </button>
            <label className="script-select-wrap label-xs-semibold">
              Genre
              <select className="script-select label-xs-semibold" defaultValue={scriptBrief.genre}>
                {scriptGenres.map((genre) => (
                  <option key={genre}>{genre}</option>
                ))}
              </select>
            </label>
          </div>
          <p className="paragraph-s">Describe the visual direction, attach references, or add media options for each line.</p>
        </div>
      </div>

      <div className={`script-row-list ${density}`}>
        {rows.map((row) =>
          row.deletedMeta ? (
            <div className="script-deleted-row-pill" key={row.id}>
              <span className="label-s-semibold">Row deleted by {row.deletedMeta.person} {row.deletedMeta.time}</span>
              <button className="script-toolbar-button label-xs-semibold" type="button" onClick={() => onRestoreRow(row.id)}>
                Restore
              </button>
            </div>
          ) : (
            <div
              className={`script-row-card ${selectedRowIds.has(row.id) ? "selected" : ""} ${dropRowId === row.id ? "drop-target" : ""}`}
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
              <button className="script-add-between label-xs-semibold" type="button" onClick={() => onAddRowAfter(row.id)}>
                <DsIcon name="plus" size={14} />
              </button>
              <div className="script-row-controls">
                <button className="script-row-number label-xs-semibold" type="button" onClick={(event) => onSelectRow(row.id, event)}>
                  {getRowNumber(row.id, rows)}
                </button>
                <span className="script-row-drag" aria-hidden="true">::::</span>
              </div>
              <div className="script-row-words">
                <textarea
                  className="script-row-textarea words label-s"
                  readOnly={isApproved}
                  ref={(node) => registerTextArea(wordInputRefs.current, row.id, node)}
                  value={row.words}
                  onMouseDown={() => {
                    if (isApproved) {
                      onGuardApproved();
                    }
                  }}
                  onChange={(event) => onSetField(row.id, "words", event.target.value)}
                  onKeyDown={(event) => onWordsKeyDown(event, row)}
                  onPaste={(event) => onPasteWords(event, row)}
                  onSelect={(event) => onCaptureSelectionAnchor(row, event.currentTarget)}
                />
                <span className="script-row-word-count label-xs-semibold">{countWords(row.words)} words</span>
                {showChanges && row.change ? <RowChange change={row.change} /> : null}
              </div>
              <div className="script-row-visuals">
                <textarea
                  className="script-row-textarea visuals label-s"
                  readOnly={isApproved}
                  value={row.visuals}
                  onMouseDown={() => {
                    if (isApproved) {
                      onGuardApproved();
                    }
                  }}
                  onChange={(event) => onSetField(row.id, "visuals", event.target.value)}
                />
                <div className="script-media-strip">
                  {row.media.map((mediaItem) => (
                    <MediaThumb key={mediaItem.id} mediaItem={mediaItem} />
                  ))}
                  <div className="script-media-menu-wrap">
                    <button
                      className="script-media-add"
                      type="button"
                      aria-label={`Add media to ${getRowLabel(row.id, rows)}`}
                      aria-expanded={openMediaMenuRowId === row.id}
                      onClick={() => (isApproved ? onGuardApproved() : onSetMediaMenuRow(openMediaMenuRowId === row.id ? null : row.id))}
                    >
                      <DsIcon name="plus" size={16} />
                    </button>
                    {openMediaMenuRowId === row.id ? (
                      <div className="script-media-menu">
                        {mediaMenuOptions.map((option) => (
                          <button className="label-s" type="button" key={option.type} onClick={() => onAddMediaItem(row.id, option.type)}>
                            <DsIcon name={option.icon} size={20} />
                            {option.label}
                          </button>
                        ))}
                      </div>
                    ) : null}
                  </div>
                </div>
                {activeCommentAnchor.rowId === row.id ? (
                  <span className="script-active-anchor label-xs-semibold">
                    Commenting on {activeCommentAnchor.kind === "selection" ? `"${activeCommentAnchor.snippet}"` : getRowLabel(row.id, rows)}
                  </span>
                ) : null}
              </div>
            </div>
          ),
        )}
      </div>
    </section>
  );
}

function SimpleDocEditor({
  docValue,
  isApproved,
  rows,
  showChanges,
  onGuardApproved,
  onUpdateDoc,
}: {
  docValue: string;
  isApproved: boolean;
  rows: ScriptRow[];
  showChanges: boolean;
  onGuardApproved: () => boolean;
  onUpdateDoc: (value: string) => void;
}) {
  return (
    <section className="script-doc-surface" aria-label="Simple document editor">
      <textarea
        className="script-doc-textarea paragraph-s"
        readOnly={isApproved}
        value={docValue}
        onMouseDown={() => {
          if (isApproved) {
            onGuardApproved();
          }
        }}
        onChange={(event) => onUpdateDoc(event.target.value)}
      />
      {showChanges ? (
        <div className="script-doc-redline">
          {rows.map((row) => (row.change ? <RowChange change={row.change} key={row.id} /> : null))}
        </div>
      ) : null}
    </section>
  );
}

function HollywoodEditor({
  isApproved,
  rows,
  selectedRowIds,
  showChanges,
  wordInputRefs,
  onCaptureSelectionAnchor,
  onGuardApproved,
  onSelectRow,
  onSetField,
  onSetType,
  onWordsKeyDown,
  registerRowRef,
}: {
  isApproved: boolean;
  rows: ScriptRow[];
  selectedRowIds: Set<string>;
  showChanges: boolean;
  wordInputRefs: React.MutableRefObject<Map<string, HTMLTextAreaElement>>;
  onCaptureSelectionAnchor: (row: ScriptRow, target: HTMLTextAreaElement) => void;
  onGuardApproved: () => boolean;
  onSelectRow: (rowId: string, event: ReactMouseEvent<HTMLButtonElement>) => void;
  onSetField: (rowId: string, field: "words" | "visuals", value: string) => void;
  onSetType: (rowId: string, elementType: ScriptElementType) => void;
  onWordsKeyDown: (event: ReactKeyboardEvent<HTMLTextAreaElement>, row: ScriptRow) => void;
  registerRowRef: (rowId: string, node: HTMLDivElement | null) => void;
}) {
  return (
    <section className="script-hollywood-surface" aria-label="Hollywood script editor">
      {rows
        .filter((row) => !row.deletedMeta)
        .map((row) => (
          <div
            className={`script-screenplay-row ${row.elementType} ${selectedRowIds.has(row.id) ? "selected" : ""}`}
            key={row.id}
            ref={(node) => registerRowRef(row.id, node)}
          >
            <button className="script-row-number label-xs-semibold" type="button" onClick={(event) => onSelectRow(row.id, event)}>
              {getRowNumber(row.id, rows)}
            </button>
            <select
              className="script-element-select label-xs-semibold"
              value={row.elementType}
              onChange={(event: ChangeEvent<HTMLSelectElement>) => onSetType(row.id, event.target.value as ScriptElementType)}
            >
              {screenplayTypes.map((type) => (
                <option key={type} value={type}>
                  {capitalise(type)}
                </option>
              ))}
            </select>
            <textarea
              className="script-screenplay-textarea label-s"
              readOnly={isApproved}
              ref={(node) => registerTextArea(wordInputRefs.current, row.id, node)}
              value={formatScreenplayValue(row)}
              onMouseDown={() => {
                if (isApproved) {
                  onGuardApproved();
                }
              }}
              onChange={(event) => onSetField(row.id, "words", event.target.value)}
              onKeyDown={(event) => onWordsKeyDown(event, row)}
              onSelect={(event) => onCaptureSelectionAnchor(row, event.currentTarget)}
            />
            {showChanges && row.change ? <RowChange change={row.change} /> : null}
          </div>
        ))}
    </section>
  );
}

function AuxiliarySubtabContent({ activeSubtabId }: { activeSubtabId: ScriptSubtabId }) {
  if (activeSubtabId === "transcripts") {
    return (
      <section className="script-aux-panel">
        <h2>Transcript v2</h2>
        {scriptTranscriptLines.map((line) => (
          <p className="paragraph-s" key={line}>{line}</p>
        ))}
      </section>
    );
  }

  return (
    <section className="script-aux-panel">
      <h2>{capitalise(activeSubtabId)}</h2>
      <p className="paragraph-s">This tab is available for approval in V1. Content can be added in the next prototype pass.</p>
    </section>
  );
}

function MediaThumb({ mediaItem }: { mediaItem: ScriptMediaItem }) {
  return (
    <span className={`script-media-thumb ${mediaItem.tone}`}>
      <span className="script-media-thumb-icon">
        <DsIcon name={mediaItem.type === "link" ? "link" : mediaItem.type === "upload" ? "upload-simple" : "image-square"} size={14} />
      </span>
      <span>
        <strong className="label-xs-semibold">{mediaItem.label}</strong>
        <small className="label-xs">{mediaItem.meta}</small>
      </span>
    </span>
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

function RedlineLegend() {
  return (
    <div className="script-redline-legend label-xs-semibold">
      <span><span className="legend-deleted" /> Deleted text</span>
      <span><span className="legend-added" /> Added text</span>
    </div>
  );
}

function cloneVersions(versions: ScriptVersion[]) {
  return versions.map((version) => ({
    ...version,
    rows: cloneRows(version.rows),
  }));
}

function cloneRows(rows: ScriptRow[]) {
  return rows.map(cloneRow);
}

function cloneRow(row: ScriptRow): ScriptRow {
  return {
    ...row,
    media: row.media.map((mediaItem) => ({ ...mediaItem })),
    change: row.change ? { ...row.change } : undefined,
    deletedMeta: row.deletedMeta ? { ...row.deletedMeta } : undefined,
  };
}

function createEmptyRow(index: number): ScriptRow {
  return {
    id: `row-${Date.now()}-${index}`,
    words: "",
    visuals: "",
    durationSeconds: 5,
    elementType: "action",
    media: [],
  };
}

function createMediaItem(type: ScriptMediaType, index: number): ScriptMediaItem {
  const labels: Record<ScriptMediaType, { label: string; meta: string; tone: ScriptMediaItem["tone"] }> = {
    upload: { label: `Upload ${index}`, meta: "Uploaded", tone: "pink" },
    library: { label: `Media ${index}`, meta: "Library clip", tone: "cyan" },
    stock: { label: `Stock ${index}`, meta: "Stock option", tone: "lime" },
    link: { label: `Link ${index}`, meta: "Reference link", tone: "purple" },
  };

  return {
    id: `media-${Date.now()}-${type}-${index}`,
    type,
    ...labels[type],
  };
}

function countWords(value: string) {
  return value.trim().split(/\s+/u).filter(Boolean).length;
}

function getRowsInRange(rows: ScriptRow[], firstRowId: string, secondRowId: string) {
  const firstIndex = rows.findIndex((row) => row.id === firstRowId);
  const secondIndex = rows.findIndex((row) => row.id === secondRowId);

  if (firstIndex === -1 || secondIndex === -1) {
    return new Set<string>([secondRowId]);
  }

  const start = Math.min(firstIndex, secondIndex);
  const end = Math.max(firstIndex, secondIndex);
  return new Set(rows.slice(start, end + 1).map((row) => row.id));
}

function getRowNumber(rowId: string, rows: ScriptRow[]) {
  const visibleIndex = rows.filter((row) => !row.deletedMeta).findIndex((row) => row.id === rowId);
  return visibleIndex === -1 ? "00" : String(visibleIndex + 1).padStart(2, "0");
}

function getRowLabel(rowId: string, rows: ScriptRow[]) {
  return `Row ${getRowNumber(rowId, rows)}`;
}

function moveRowsBySelection(rows: ScriptRow[], selectedRowIds: Set<string>, direction: -1 | 1) {
  const nextRows = [...rows];

  if (direction === -1) {
    for (let index = 1; index < nextRows.length; index += 1) {
      if (selectedRowIds.has(nextRows[index].id) && !selectedRowIds.has(nextRows[index - 1].id)) {
        [nextRows[index - 1], nextRows[index]] = [nextRows[index], nextRows[index - 1]];
      }
    }
  } else {
    for (let index = nextRows.length - 2; index >= 0; index -= 1) {
      if (selectedRowIds.has(nextRows[index].id) && !selectedRowIds.has(nextRows[index + 1].id)) {
        [nextRows[index], nextRows[index + 1]] = [nextRows[index + 1], nextRows[index]];
      }
    }
  }

  return nextRows;
}

function registerRowRef(refs: Map<string, HTMLDivElement>, rowId: string, node: HTMLDivElement | null) {
  if (node) {
    refs.set(rowId, node);
  } else {
    refs.delete(rowId);
  }
}

function registerTextArea(refs: Map<string, HTMLTextAreaElement>, rowId: string, node: HTMLTextAreaElement | null) {
  if (node) {
    refs.set(rowId, node);
  } else {
    refs.delete(rowId);
  }
}

function getMarkedText(mark: "bold" | "italic" | "strike" | "heading" | "bullet" | "number" | "link", selectedText: string) {
  if (mark === "bold") {
    return `**${selectedText}**`;
  }

  if (mark === "italic") {
    return `_${selectedText}_`;
  }

  if (mark === "strike") {
    return `~~${selectedText}~~`;
  }

  if (mark === "heading") {
    return `## ${selectedText}`;
  }

  if (mark === "bullet") {
    return `- ${selectedText}`;
  }

  if (mark === "number") {
    return `1. ${selectedText}`;
  }

  return `[${selectedText}](https://example.com)`;
}

function formatScreenplayValue(row: ScriptRow) {
  if (row.elementType === "scene" || row.elementType === "character" || row.elementType === "transition") {
    return row.words.toUpperCase();
  }

  if (row.elementType === "parenthetical" && !row.words.startsWith("(")) {
    return `(${row.words})`;
  }

  return row.words;
}

function capitalise(value: string) {
  return `${value.slice(0, 1).toUpperCase()}${value.slice(1)}`;
}

function formatSnapshotDate(date: Date) {
  return new Intl.DateTimeFormat("en-AU", { day: "2-digit", month: "short" }).format(date);
}
