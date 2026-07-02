"use client";

import Link from "next/link";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ClipboardEvent,
  type KeyboardEvent as ReactKeyboardEvent,
  type MouseEvent as ReactMouseEvent,
  type MutableRefObject,
} from "react";
import { CommentRail } from "@/components/comment-rail/CommentRail";
import { DsIcon } from "@/components/video-review/DsIcon";
import {
  initialScriptComments,
  scriptAiFixtures,
  scriptBrief,
  scriptGenres,
  scriptPresence,
  scriptUsers,
  scriptVersions,
  type ScriptComment,
  type ScriptCommentAnchor,
  type ScriptDensity,
  type ScriptGenre,
  type ScriptLayoutMode,
  type ScriptMediaItem,
  type ScriptMediaType,
  type ScriptRole,
  type ScriptRow,
  type ScriptStatus,
  type ScriptSubtabId,
  type ScriptVersion,
} from "@/data/script";

const currentUserId = "user-tom";
const layoutModes: Array<{ value: ScriptLayoutMode; label: string }> = [
  { value: "av", label: "AV Script" },
  { value: "simple", label: "Simple Doc" },
];
const densityModes: ScriptDensity[] = ["compact", "comfortable"];
const optionalSubtabs: Array<{ id: Exclude<ScriptSubtabId, "script">; label: string }> = [
  { id: "transcripts", label: "Transcripts" },
  { id: "notes", label: "Notes" },
  { id: "storyboard", label: "Storyboard" },
];
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

type FloatingToolbarState = {
  visible: boolean;
  rowId: string | null;
  x: number;
  y: number;
};

type ScriptPageProps = {
  initialRole: ScriptRole;
};

const overallCommentAnchor: ScriptCommentAnchor = {
  kind: "overall",
  label: "Overall",
};

export function ScriptPage({ initialRole }: ScriptPageProps) {
  const latestVersion = scriptVersions[scriptVersions.length - 1];
  const [role] = useState<ScriptRole>(initialRole);
  const isCustomer = role === "customer";
  const [layoutMode, setLayoutMode] = useState<ScriptLayoutMode>("av");
  const [density, setDensity] = useState<ScriptDensity>("compact");
  const [showChanges, setShowChanges] = useState(false);
  const [, setStatus] = useState<ScriptStatus>("In script");
  const [isScriptApproved, setIsScriptApproved] = useState(false);
  const [versions, setVersions] = useState<ScriptVersion[]>(() => cloneVersions(scriptVersions));
  const [selectedVersionId, setSelectedVersionId] = useState(latestVersion.id);
  const [rows, setRows] = useState<ScriptRow[]>(() => cloneRows(latestVersion.rows));
  const [rowHistory, setRowHistory] = useState<ScriptRow[][]>(() => [cloneRows(latestVersion.rows)]);
  const [historyIndex, setHistoryIndex] = useState(0);
  const [selectionState, setSelectionState] = useState<SelectionState>({
    lastRowId: null,
    selectedRowIds: new Set<string>(),
  });
  const [activeCommentAnchor, setActiveCommentAnchor] = useState<ScriptCommentAnchor>(overallCommentAnchor);
  const [comments, setComments] = useState<ScriptComment[]>(() => cloneComments(initialScriptComments));
  const [openCommentRowId, setOpenCommentRowId] = useState<string | null>(null);
  const [isCommentComposerOpen, setIsCommentComposerOpen] = useState(false);
  const [isCommentsOverviewOpen, setIsCommentsOverviewOpen] = useState(false);
  const [enabledSubtabs, setEnabledSubtabs] = useState<Set<Exclude<ScriptSubtabId, "script">>>(new Set());
  const [isOptionsOpen, setIsOptionsOpen] = useState(false);
  const [areIntroCardsDismissed, setAreIntroCardsDismissed] = useState(false);
  const [alwaysHideIntroCards, setAlwaysHideIntroCards] = useState(false);
  const [hasEditedThisSession, setHasEditedThisSession] = useState(false);
  const [openRowMenuId, setOpenRowMenuId] = useState<string | null>(null);
  const [confirmingDeleteRowId, setConfirmingDeleteRowId] = useState<string | null>(null);
  const [highlightedRowId, setHighlightedRowId] = useState<string | null>(null);
  const [draggingRowId, setDraggingRowId] = useState<string | null>(null);
  const [dropRowId, setDropRowId] = useState<string | null>(null);
  const [openMediaMenuRowId, setOpenMediaMenuRowId] = useState<string | null>(null);
  const [isApprovedEditModalOpen, setIsApprovedEditModalOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [saveState, setSaveState] = useState<"Saved" | "Saving...">("Saved");
  const [isAiPanelOpen, setIsAiPanelOpen] = useState(false);
  const [isAiPanelMinimised, setIsAiPanelMinimised] = useState(false);
  const [aiPrompt, setAiPrompt] = useState("");
  const [showAiToCustomer, setShowAiToCustomer] = useState(scriptBrief.showAiToCustomer);
  const [aiSources, setAiSources] = useState(["Brief", "Transcript v2", "Past scripts"]);
  const [aiResponse, setAiResponse] = useState<string>(scriptAiFixtures[0]);
  const [aiGenre, setAiGenre] = useState<ScriptGenre>(scriptBrief.genre);
  const [hasTypedThisSession, setHasTypedThisSession] = useState(() =>
    latestVersion.rows.some((row) => row.words.trim() || row.visuals.trim()),
  );
  const [floatingToolbar, setFloatingToolbar] = useState<FloatingToolbarState>({
    visible: false,
    rowId: null,
    x: 0,
    y: 0,
  });
  const saveTimeoutRef = useRef<number | null>(null);
  const toastTimeoutRef = useRef<number | null>(null);
  const rowRefs = useRef(new Map<string, HTMLDivElement>());
  const wordInputRefs = useRef(new Map<string, HTMLTextAreaElement>());
  const visualInputRefs = useRef(new Map<string, HTMLTextAreaElement>());
  const simpleDocRef = useRef<HTMLTextAreaElement | null>(null);
  const selectedRows = rows.filter((row) => selectionState.selectedRowIds.has(row.id));
  const activeVersion = versions.find((version) => version.id === selectedVersionId) ?? versions[versions.length - 1];
  const visibleRows = rows.filter((row) => !row.deletedMeta);
  const docValue = visibleRows.map((row) => row.words).join("\n\n");
  const totalWords = rows.reduce((total, row) => (row.deletedMeta ? total : total + countWords(row.words)), 0);
  const approxSeconds = Math.round(totalWords / 2.5);
  const targetWords = scriptBrief.targetDurationSeconds * 2.5;
  const wordDelta = Math.abs(totalWords - targetWords);
  const wordState = wordDelta <= 10 ? "good" : wordDelta <= 25 ? "warning" : "danger";
  const visibleComments = useMemo(
    () => (isCustomer ? comments.filter((comment) => comment.visibility === "external") : comments),
    [comments, isCustomer],
  );
  const commentsByRow = useMemo(() => groupCommentsByRow(visibleComments), [visibleComments]);
  const visibleOpenComments = openCommentRowId ? commentsByRow.get(openCommentRowId) ?? [] : [];
  const shouldShowAi = !isCustomer || showAiToCustomer;
  const enabledSubtabLabels = optionalSubtabs.filter((tab) => enabledSubtabs.has(tab.id));
  const shouldShowIntroCards = layoutMode === "av" && !areIntroCardsDismissed && !alwaysHideIntroCards;

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

      if (toastTimeoutRef.current) {
        window.clearTimeout(toastTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!toastMessage) {
      return;
    }

    if (toastTimeoutRef.current) {
      window.clearTimeout(toastTimeoutRef.current);
    }

    toastTimeoutRef.current = window.setTimeout(() => {
      setToastMessage("");
    }, 3000);
  }, [toastMessage]);

  useEffect(() => {
    wordInputRefs.current.forEach(resizeTextAreaToContent);
    visualInputRefs.current.forEach(resizeTextAreaToContent);
    resizeTextAreaToContent(simpleDocRef.current);
  }, [rows, layoutMode, density]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const isUndo = (event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "z" && !event.shiftKey;
      const isRedo =
        ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "z" && event.shiftKey) ||
        ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "y");
      const target = event.target;
      const isEditingField = target instanceof HTMLTextAreaElement || target instanceof HTMLInputElement;
      const isDeleteSelectedRows =
        event.key === "Backspace" && !isEditingField && selectionState.selectedRowIds.size > 0;

      if (isUndo) {
        event.preventDefault();
        undoRows();
      }

      if (isRedo) {
        event.preventDefault();
        redoRows();
      }

      if (isDeleteSelectedRows) {
        event.preventDefault();
        deleteSelectedRows();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  });

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
    if (value.trim()) {
      setHasTypedThisSession(true);
    }
    setHasEditedThisSession(true);

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

  const deleteEmptyRow = (row: ScriptRow) => {
    const currentIndex = rows.findIndex((currentRow) => currentRow.id === row.id);
    const previousRow = rows.slice(0, currentIndex).reverse().find((currentRow) => !currentRow.deletedMeta);

    updateRows((currentRows) => currentRows.filter((currentRow) => currentRow.id !== row.id));

    if (previousRow) {
      window.setTimeout(() => wordInputRefs.current.get(previousRow.id)?.focus(), 0);
    }
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

  const deleteRowById = (rowId: string, shouldSkipConfirm = false) => {
    const row = rows.find((currentRow) => currentRow.id === rowId);

    if (!row) {
      return;
    }

    const hasContent = Boolean(row.words.trim() || row.visuals.trim() || row.media.length > 0);

    if (hasContent && !shouldSkipConfirm) {
      setOpenRowMenuId(rowId);
      setConfirmingDeleteRowId(rowId);
      return;
    }

    updateRows((currentRows) =>
      currentRows.map((currentRow) =>
        currentRow.id === rowId
          ? {
              ...currentRow,
              deletedMeta: {
                person: "Tom",
                time: "just now",
              },
            }
          : currentRow,
      ),
    );
    setOpenRowMenuId(null);
    setConfirmingDeleteRowId(null);
    setSelectionState({ lastRowId: null, selectedRowIds: new Set<string>() });
  };

  const duplicateRowById = (rowId: string) => {
    updateRows((currentRows) => {
      const rowIndex = currentRows.findIndex((currentRow) => currentRow.id === rowId);

      if (rowIndex === -1) {
        return currentRows;
      }

      const copy = {
        ...cloneRow(currentRows[rowIndex]),
        id: `row-copy-${Date.now()}`,
        deletedMeta: undefined,
      };

      return [...currentRows.slice(0, rowIndex + 1), copy, ...currentRows.slice(rowIndex + 1)];
    });
    setOpenRowMenuId(null);
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
    if ((event.metaKey || event.ctrlKey) && event.shiftKey && event.key === "Backspace") {
      event.preventDefault();
      deleteRowById(row.id, true);
      return;
    }

    if (event.key === "Backspace" && selectionState.selectedRowIds.size > 1 && selectionState.selectedRowIds.has(row.id)) {
      event.preventDefault();
      deleteSelectedRows();
      return;
    }

    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      addRowAfter(row.id);
      return;
    }

    if (event.key === "Backspace" && !row.words.trim() && visibleRows.length > 1) {
      event.preventDefault();
      deleteEmptyRow(row);
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
    setHasTypedThisSession(true);
    setHasEditedThisSession(true);
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
      setFloatingToolbar((currentToolbar) => ({ ...currentToolbar, visible: false }));
      return;
    }

    const position = getFloatingToolbarPosition(target);
    setFloatingToolbar({ visible: true, rowId: row.id, ...position });
    setActiveCommentAnchor({
      kind: "selection",
      label: getRowLabel(row.id, rows),
      rowId: row.id,
      snippet: selectedText.length > 44 ? `${selectedText.slice(0, 44)}...` : selectedText,
    });
    setOpenCommentRowId(row.id);
    setIsCommentComposerOpen(true);
  };

  const captureDocSelectionAnchor = (target: HTMLTextAreaElement) => {
    const selectedText = target.value.slice(target.selectionStart, target.selectionEnd).trim();

    if (!selectedText) {
      setFloatingToolbar((currentToolbar) => ({ ...currentToolbar, visible: false }));
      return;
    }

    const position = getFloatingToolbarPosition(target);
    setFloatingToolbar({ visible: true, rowId: null, ...position });
    setActiveCommentAnchor({
      kind: "selection",
      label: "Document",
      snippet: selectedText.length > 44 ? `${selectedText.slice(0, 44)}...` : selectedText,
    });
    setIsCommentComposerOpen(true);
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

  const approveScript = () => {
    setIsScriptApproved(true);
    setStatus("Approved");
    setToastMessage("Script approved");
  };

  const unapproveScript = (shouldDuplicateSnapshot: boolean) => {
    setIsScriptApproved(false);
    setStatus("Waiting on Customer");

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

  const updateDocValue = (value: string) => {
    if (value.trim()) {
      setHasTypedThisSession(true);
    }
    setHasEditedThisSession(true);

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

  const applyTextMark = (mark: "bold" | "link") => {
    const activeRowId = floatingToolbar.rowId ?? selectionState.lastRowId;
    const input = activeRowId ? wordInputRefs.current.get(activeRowId) : simpleDocRef.current;

    if (!input) {
      return;
    }

    const start = input.selectionStart;
    const end = input.selectionEnd;
    const value = input.value;
    const selectedText = value.slice(start, end) || "selected text";
    const replacement = getMarkedText(mark, selectedText);
    const nextValue = `${value.slice(0, start)}${replacement}${value.slice(end)}`;

    if (activeRowId) {
      setRowField(activeRowId, "words", nextValue);
    } else {
      updateDocValue(nextValue);
    }

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

  const toggleEnabledSubtab = (tabId: Exclude<ScriptSubtabId, "script">) => {
    setEnabledSubtabs((currentSubtabs) => {
      const nextSubtabs = new Set(currentSubtabs);

      if (nextSubtabs.has(tabId)) {
        nextSubtabs.delete(tabId);
      } else {
        nextSubtabs.add(tabId);
      }

      return nextSubtabs;
    });
  };

  const openCommentsForRow = (rowId: string) => {
    setActiveCommentAnchor({
      kind: "row",
      label: getRowLabel(rowId, rows),
      rowId,
    });
    setOpenCommentRowId(rowId);
    setIsCommentComposerOpen(false);
    setIsCommentsOverviewOpen(false);
  };

  const openComposerForRow = (row: ScriptRow) => {
    setActiveCommentAnchor({
      kind: "row",
      label: getRowLabel(row.id, rows),
      rowId: row.id,
    });
    setOpenCommentRowId(row.id);
    setIsCommentComposerOpen(true);
    setIsCommentsOverviewOpen(false);
  };

  const mergeScopedComments = (previousScope: ScriptComment[], nextScope: ScriptComment[]) => {
    const previousIds = new Set(previousScope.map((comment) => comment.id));

    setComments((currentComments) => [
      ...currentComments.filter((comment) => !previousIds.has(comment.id)),
      ...cloneComments(nextScope),
    ]);
  };

  const selectCommentAnchor = (comment: ScriptComment) => {
    const rowId = comment.anchor.rowId;

    if (!rowId) {
      return;
    }

    rowRefs.current.get(rowId)?.scrollIntoView({ block: "center", behavior: "smooth" });
    setHighlightedRowId(rowId);
    window.setTimeout(() => setHighlightedRowId(null), 1500);
    setActiveCommentAnchor(comment.anchor);
    setOpenCommentRowId(rowId);
    setIsCommentsOverviewOpen(false);
  };

  return (
    <main className={`script-shell script-density-${density} ${isCustomer ? "customer" : "studio"}`}>
      <ScriptHeader enabledSubtabLabels={enabledSubtabLabels} role={role} />

      <section className="script-subheader" aria-label="Script controls">
        <div className="script-subheader-left">
          {!isCustomer ? (
            <SegmentedControl
              label="Layout"
              options={layoutModes}
              value={layoutMode}
              onChange={(value) => setLayoutMode(value)}
            />
          ) : null}
          <select className="script-version-select label-xs-semibold" value={selectedVersionId} onChange={(event) => selectVersion(event.target.value)}>
            {versions.map((version) => (
              <option key={version.id} value={version.id}>
                {version.label} {version.approvedSnapshot ? "approved" : "current"}
              </option>
            ))}
          </select>
          {!isCustomer ? (
            <div className="script-presence" aria-label="Live collaborator">
              {scriptPresence.slice(0, 1).map((person) => (
                <span className={`avatar ${person.tone}`} aria-label={person.name} key={person.id}>
                  {person.initials}
                </span>
              ))}
            </div>
          ) : null}
        </div>
        <div className="script-subheader-actions">
          <button
            className="script-quiet-icon"
            type="button"
            aria-label="Comments overview"
            aria-expanded={isCommentsOverviewOpen}
            onClick={() => {
              setIsCommentsOverviewOpen((isOpen) => {
                const nextIsOpen = !isOpen;

                if (nextIsOpen) {
                  setActiveCommentAnchor(overallCommentAnchor);
                }

                return nextIsOpen;
              });
              setOpenCommentRowId(null);
              setIsCommentComposerOpen(false);
            }}
          >
            <DsIcon name="chat-circle" size={16} />
          </button>
          <div className="script-options-wrap">
            <button
              className="script-quiet-icon"
              type="button"
              aria-label="More script options"
              aria-expanded={isOptionsOpen}
              onClick={() => setIsOptionsOpen((isOpen) => !isOpen)}
            >
              <DsIcon name="dots-three" size={16} />
            </button>
            {isOptionsOpen ? (
              <div className="script-options-menu">
                <button
                  className={`script-menu-text label-xs-semibold ${isScriptApproved ? "active" : ""}`}
                  type="button"
                  onClick={approveScript}
                >
                  {isScriptApproved ? "Approved" : "Approve script"}
                </button>
                <div className="script-options-section">
                  <span className="label-xs-semibold">Density</span>
                  <div className="script-options-row" role="group" aria-label="Density">
                    {densityModes.map((mode) => (
                      <button
                        className={`script-menu-choice label-xs-semibold ${density === mode ? "active" : ""}`}
                        type="button"
                        key={mode}
                        onClick={() => setDensity(mode)}
                      >
                        {capitalise(mode)}
                      </button>
                    ))}
                  </div>
                </div>
                <label className="script-menu-toggle label-xs-semibold">
                  <input type="checkbox" checked={showChanges} onChange={(event) => setShowChanges(event.target.checked)} />
                  Show changes
                </label>
                {!isCustomer ? (
                  <label className="script-menu-toggle label-xs-semibold">
                    <input
                      type="checkbox"
                      checked={showAiToCustomer}
                      onChange={(event) => setShowAiToCustomer(event.target.checked)}
                    />
                    Show AI to customer
                  </label>
                ) : null}
                <label className="script-menu-toggle label-xs-semibold">
                  <input
                    type="checkbox"
                    checked={alwaysHideIntroCards}
                    onChange={(event) => setAlwaysHideIntroCards(event.target.checked)}
                  />
                  Always hide intro cards
                </label>
                <div className="script-options-section">
                  <span className="label-xs-semibold">Sub-tabs</span>
                  {optionalSubtabs.map((tab) => (
                    <label className="script-menu-toggle label-xs-semibold" key={tab.id}>
                      <input
                        type="checkbox"
                        checked={enabledSubtabs.has(tab.id)}
                        onChange={() => toggleEnabledSubtab(tab.id)}
                      />
                      {tab.label}
                    </label>
                  ))}
                </div>
                <button className="script-menu-text label-xs-semibold" type="button">
                  Version history
                </button>
                <span className="script-save-note label-xs">Save state: {saveState}</span>
              </div>
            ) : null}
          </div>
        </div>
      </section>

      <section className={`script-body ${isAiPanelOpen ? "ai-open" : ""}`}>
        <div className="script-editor-column">
          {layoutMode === "av" ? (
            <AvScriptEditor
              commentsByRow={commentsByRow}
              density={density}
              dropRowId={dropRowId}
              hasTypedThisSession={hasTypedThisSession}
              isApproved={isScriptApproved}
              highlightedRowId={highlightedRowId}
              openMediaMenuRowId={openMediaMenuRowId}
              openRowMenuId={openRowMenuId}
              confirmingDeleteRowId={confirmingDeleteRowId}
              rows={rows}
              selectedRowIds={selectionState.selectedRowIds}
              shouldShowIntroCards={shouldShowIntroCards}
              hasEditedThisSession={hasEditedThisSession}
              showChanges={showChanges}
              wordInputRefs={wordInputRefs}
              visualInputRefs={visualInputRefs}
              onAddMediaItem={addMediaItem}
              onAddRowAfter={addRowAfter}
              onCancelRowDelete={() => setConfirmingDeleteRowId(null)}
              onCaptureSelectionAnchor={captureSelectionAnchor}
              onDeleteRow={deleteRowById}
              onDismissIntroCards={() => setAreIntroCardsDismissed(true)}
              onDragEnd={() => {
                setDraggingRowId(null);
                setDropRowId(null);
              }}
              onDragOverRow={(rowId) => setDropRowId(rowId)}
              onDragStartRow={setDraggingRowId}
              onDuplicateRow={duplicateRowById}
              onGuardApproved={guardEditable}
              onOpenComposerForRow={openComposerForRow}
              onOpenCommentsForRow={openCommentsForRow}
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
              onSetOpenRowMenu={(rowId) => {
                setOpenRowMenuId(rowId);
                setConfirmingDeleteRowId(null);
              }}
              onWordsKeyDown={handleWordsKeyDown}
              registerRowRef={(rowId, node) => registerRowRef(rowRefs.current, rowId, node)}
            />
          ) : null}
          {layoutMode === "simple" ? (
            <SimpleDocEditor
              docRef={simpleDocRef}
              docValue={docValue}
              isApproved={isScriptApproved}
              showChanges={showChanges}
              rows={rows}
              onCaptureSelectionAnchor={captureDocSelectionAnchor}
              onGuardApproved={guardEditable}
              onUpdateDoc={updateDocValue}
            />
          ) : null}
          {showChanges ? <RedlineLegend /> : null}
        </div>

        {(openCommentRowId || isCommentComposerOpen || isCommentsOverviewOpen) ? (
          <div className={`script-comment-popover ${isCommentsOverviewOpen ? "overview" : "inline"}`}>
            <CommentRail
              activeAnchor={isCommentsOverviewOpen ? overallCommentAnchor : activeCommentAnchor}
              comments={isCommentsOverviewOpen ? visibleComments : visibleOpenComments}
              composerAnchor={isCommentsOverviewOpen ? overallCommentAnchor : activeCommentAnchor}
              composerPlacement={isCommentsOverviewOpen ? "top" : "bottom"}
              currentUserId={currentUserId}
              users={scriptUsers}
              canPostInternal={!isCustomer}
              canSeeInternal={!isCustomer}
              filterMode={isCustomer ? "customer" : "studio"}
              title="Comments"
              onClose={() => {
                setOpenCommentRowId(null);
                setIsCommentComposerOpen(false);
                setIsCommentsOverviewOpen(false);
              }}
              onCommentsChange={(nextScopedComments) =>
                mergeScopedComments(isCommentsOverviewOpen ? visibleComments : visibleOpenComments, nextScopedComments)
              }
              onSelectComment={selectCommentAnchor}
            />
          </div>
        ) : null}
      </section>

      <footer className={`script-word-footer word-${wordState}`}>
        <span className="script-word-footer-inner">
          <span className="script-word-footer-copy">
            <strong>{totalWords}</strong> words · <span className="script-word-duration">~{approxSeconds}s</span> · Target {scriptBrief.targetDurationSeconds}s
          </span>
        </span>
      </footer>

      <FloatingFormatToolbar
        state={floatingToolbar}
        onApply={applyTextMark}
        onRedo={redoRows}
        onUndo={undoRows}
      />

      {shouldShowAi ? (
        <>
          {!isAiPanelOpen || isAiPanelMinimised ? (
            <button
              className="script-ai-fab"
              type="button"
              aria-label="Open ChopChop AI"
              onClick={() => {
                setIsAiPanelOpen(true);
                setIsAiPanelMinimised(false);
              }}
            >
              ✦
            </button>
          ) : null}
          {isAiPanelOpen && !isAiPanelMinimised ? (
            <aside className="script-ai-panel" aria-label="ChopChop AI panel">
              <div className="script-ai-header">
                <h2 className="heading-3xs">ChopChop AI</h2>
                <div className="script-ai-actions">
                  <button className="script-quiet-icon" type="button" aria-label="Minimise AI" onClick={() => setIsAiPanelMinimised(true)}>
                    -
                  </button>
                  <button className="script-quiet-icon" type="button" aria-label="Close AI" onClick={() => setIsAiPanelOpen(false)}>
                    <DsIcon name="x-close-cross" size={14} />
                  </button>
                </div>
              </div>
              <div className="script-ai-tools">
                <button className="script-toolbar-button label-xs-semibold" type="button" onClick={() => setAiResponse(scriptAiFixtures[2])}>
                  Suggest visuals
                </button>
                <label className="script-select-wrap label-xs-semibold">
                  Genre
                  <select className="script-select label-xs-semibold" value={aiGenre} onChange={(event) => setAiGenre(event.target.value as ScriptGenre)}>
                    {scriptGenres.map((genre) => (
                      <option key={genre}>{genre}</option>
                    ))}
                  </select>
                </label>
              </div>
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
                {["Generate script", "Rewrite selection", "Give feedback", "Paper edit"].map((action) => (
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
        <div className="script-toast label-s-semibold" role="status">
          {toastMessage}
        </div>
      ) : null}
    </main>
  );
}

function ScriptHeader({
  enabledSubtabLabels,
  role,
}: {
  enabledSubtabLabels: Array<{ id: Exclude<ScriptSubtabId, "script">; label: string }>;
  role: ScriptRole;
}) {
  return (
    <header className="script-header">
      <div className="script-title-stack">
        <nav className="script-subtab-links" aria-label="Script sub-tabs">
          <span>Script</span>
          {enabledSubtabLabels.map((tab) => (
            <button type="button" key={tab.id}>
              {tab.label}
            </button>
          ))}
        </nav>
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
          className={`script-segmented-button label-xs-semibold ${value === option.value ? "active" : ""}`}
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

function FloatingFormatToolbar({
  state,
  onApply,
  onRedo,
  onUndo,
}: {
  state: FloatingToolbarState;
  onApply: (mark: "bold" | "link") => void;
  onRedo: () => void;
  onUndo: () => void;
}) {
  if (!state.visible) {
    return null;
  }

  return (
    <div className="script-floating-toolbar" style={{ left: state.x, top: state.y }} aria-label="Selection formatting tools">
      <button className="script-quiet-icon" type="button" data-tooltip="Undo" aria-label="Undo" onMouseDown={(event) => event.preventDefault()} onClick={onUndo}>
        <DsIcon name="arrow-counter-clockwise" size={16} />
      </button>
      <button className="script-quiet-icon" type="button" data-tooltip="Redo" aria-label="Redo" onMouseDown={(event) => event.preventDefault()} onClick={onRedo}>
        <DsIcon name="arrow-clockwise" size={16} />
      </button>
      <button className="script-format-button label-xs-semibold" type="button" aria-label="Bold" onMouseDown={(event) => event.preventDefault()} onClick={() => onApply("bold")}>
        B
      </button>
      <button className="script-quiet-icon" type="button" data-tooltip="Link" aria-label="Link" onMouseDown={(event) => event.preventDefault()} onClick={() => onApply("link")}>
        <DsIcon name="link" size={16} />
      </button>
    </div>
  );
}

function ScriptIntroCards({ isFaded, onDismiss }: { isFaded: boolean; onDismiss: () => void }) {
  return (
    <div className={`script-column-intro ${isFaded ? "faded" : ""}`} aria-label="Script column guidance">
      <section className="script-intro-card words">
        <div className="script-intro-heading">
          <span className="script-intro-icon">
            <DsIcon name="pencil-simple" size={18} />
          </span>
          <h2>Words</h2>
        </div>
        <p>Write the words of your script here. One sentence per row. 150 words = 1 minute.</p>
        <button className="script-intro-dismiss" type="button" aria-label="Dismiss intro cards" onClick={onDismiss}>
          <DsIcon name="x-close-cross" size={12} />
        </button>
      </section>
      <section className="script-intro-card visuals">
        <div className="script-intro-heading">
          <span className="script-intro-icon">
            <DsIcon name="image-square" size={18} />
          </span>
          <h2>Visuals</h2>
        </div>
        <p>Describe the visuals for each line. Add media, links or references.</p>
        <button className="script-intro-dismiss" type="button" aria-label="Dismiss intro cards" onClick={onDismiss}>
          <DsIcon name="x-close-cross" size={12} />
        </button>
      </section>
    </div>
  );
}

function AvScriptEditor({
  commentsByRow,
  density,
  dropRowId,
  hasTypedThisSession,
  isApproved,
  highlightedRowId,
  openMediaMenuRowId,
  openRowMenuId,
  confirmingDeleteRowId,
  rows,
  selectedRowIds,
  shouldShowIntroCards,
  hasEditedThisSession,
  showChanges,
  wordInputRefs,
  visualInputRefs,
  onAddMediaItem,
  onAddRowAfter,
  onCancelRowDelete,
  onCaptureSelectionAnchor,
  onDeleteRow,
  onDismissIntroCards,
  onDragEnd,
  onDragOverRow,
  onDragStartRow,
  onDuplicateRow,
  onGuardApproved,
  onOpenComposerForRow,
  onOpenCommentsForRow,
  onPasteWords,
  onReorderRows,
  onRestoreRow,
  onSelectRow,
  onSetField,
  onSetMediaMenuRow,
  onSetOpenRowMenu,
  onWordsKeyDown,
  registerRowRef,
}: {
  commentsByRow: Map<string, ScriptComment[]>;
  density: ScriptDensity;
  dropRowId: string | null;
  hasTypedThisSession: boolean;
  isApproved: boolean;
  highlightedRowId: string | null;
  openMediaMenuRowId: string | null;
  openRowMenuId: string | null;
  confirmingDeleteRowId: string | null;
  rows: ScriptRow[];
  selectedRowIds: Set<string>;
  shouldShowIntroCards: boolean;
  hasEditedThisSession: boolean;
  showChanges: boolean;
  wordInputRefs: MutableRefObject<Map<string, HTMLTextAreaElement>>;
  visualInputRefs: MutableRefObject<Map<string, HTMLTextAreaElement>>;
  onAddMediaItem: (rowId: string, type: ScriptMediaType) => void;
  onAddRowAfter: (rowId: string | null) => void;
  onCancelRowDelete: () => void;
  onCaptureSelectionAnchor: (row: ScriptRow, target: HTMLTextAreaElement) => void;
  onDeleteRow: (rowId: string, shouldSkipConfirm?: boolean) => void;
  onDismissIntroCards: () => void;
  onDragEnd: () => void;
  onDragOverRow: (rowId: string) => void;
  onDragStartRow: (rowId: string) => void;
  onDuplicateRow: (rowId: string) => void;
  onGuardApproved: () => boolean;
  onOpenComposerForRow: (row: ScriptRow) => void;
  onOpenCommentsForRow: (rowId: string) => void;
  onPasteWords: (event: ClipboardEvent<HTMLTextAreaElement>, row: ScriptRow) => void;
  onReorderRows: (targetRowId: string) => void;
  onRestoreRow: (rowId: string) => void;
  onSelectRow: (rowId: string, event: ReactMouseEvent<HTMLButtonElement>) => void;
  onSetField: (rowId: string, field: "words" | "visuals", value: string) => void;
  onSetMediaMenuRow: (rowId: string | null) => void;
  onSetOpenRowMenu: (rowId: string | null) => void;
  onWordsKeyDown: (event: ReactKeyboardEvent<HTMLTextAreaElement>, row: ScriptRow) => void;
  registerRowRef: (rowId: string, node: HTMLDivElement | null) => void;
}) {
  return (
    <section className={`script-av-surface ${density}`} aria-label="AV script editor">
      {shouldShowIntroCards ? <ScriptIntroCards isFaded={hasEditedThisSession} onDismiss={onDismissIntroCards} /> : null}
      {rows.map((row, index) => {
        const rowComments = commentsByRow.get(row.id) ?? [];
        const hasAnchor = rowComments.length > 0 || row.media.length > 0;
        const shouldShowPlaceholder = index === 0 && !hasTypedThisSession && !row.words.trim() && !row.visuals.trim();

        return row.deletedMeta ? (
          <div className="script-deleted-row-pill" key={row.id}>
            <span className="label-s-semibold">Row deleted by {row.deletedMeta.person} {row.deletedMeta.time}</span>
            <button className="script-toolbar-button label-xs-semibold" type="button" onClick={() => onRestoreRow(row.id)}>
              Restore
            </button>
          </div>
        ) : (
          <div
            className={`script-row ${selectedRowIds.has(row.id) ? "selected" : ""} ${dropRowId === row.id ? "drop-target" : ""} ${hasAnchor ? "has-anchor" : ""} ${highlightedRowId === row.id ? "highlighted" : ""}`}
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
                {getRowNumber(row.id, rows)}
              </button>
              <span className="script-row-drag" aria-hidden="true">
                <span />
                <span />
                <span />
                <span />
                <span />
                <span />
              </span>
              <button className="script-add-between" type="button" aria-label={`Insert row after ${getRowLabel(row.id, rows)}`} onClick={() => onAddRowAfter(row.id)}>
                <DsIcon name="plus" size={12} />
              </button>
              <span className="script-row-menu-wrap">
                <button
                  className="script-row-menu-button"
                  type="button"
                  aria-label={`Open menu for ${getRowLabel(row.id, rows)}`}
                  aria-expanded={openRowMenuId === row.id}
                  onClick={() => onSetOpenRowMenu(openRowMenuId === row.id ? null : row.id)}
                >
                  <DsIcon name="dots-three" size={13} />
                </button>
                {openRowMenuId === row.id ? (
                  <span className="script-row-menu">
                    {confirmingDeleteRowId === row.id ? (
                      <span className="script-row-delete-confirm label-xs-semibold">
                        Delete?
                        <button type="button" onClick={() => onDeleteRow(row.id, true)}>
                          Yes
                        </button>
                        <button type="button" onClick={onCancelRowDelete}>
                          No
                        </button>
                      </span>
                    ) : (
                      <>
                        <button className="label-xs-semibold" type="button" onClick={() => onDeleteRow(row.id)}>
                          Delete row
                        </button>
                        <button className="label-xs-semibold" type="button" onClick={() => onDuplicateRow(row.id)}>
                          Duplicate row
                        </button>
                        <button
                          className="label-xs-semibold"
                          type="button"
                          onClick={() => {
                            onOpenComposerForRow(row);
                            onSetOpenRowMenu(null);
                          }}
                        >
                          Comment on row
                        </button>
                      </>
                    )}
                  </span>
                ) : null}
              </span>
            </div>
            <div className="script-row-words">
              <textarea
                className={`script-cell-input words label-s ${rowComments.some((comment) => comment.anchor.kind === "selection") ? "has-selection-comment" : ""}`}
                placeholder={shouldShowPlaceholder ? "Write one sentence per row. 150 words = 1 minute." : ""}
                readOnly={isApproved}
                ref={(node) => registerTextArea(wordInputRefs.current, row.id, node)}
                rows={2}
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
            <div className="script-row-visuals">
              <textarea
                className="script-cell-input visuals label-s"
                placeholder={shouldShowPlaceholder ? "Describe the visuals or drop in media." : ""}
                readOnly={isApproved}
                ref={(node) => registerTextArea(visualInputRefs.current, row.id, node)}
                rows={2}
                value={row.visuals}
                onMouseDown={() => {
                  if (isApproved) {
                    onGuardApproved();
                  }
                }}
                onChange={(event) => onSetField(row.id, "visuals", event.target.value)}
                onInput={(event) => resizeTextAreaToContent(event.currentTarget)}
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
                    <DsIcon name="plus" size={14} />
                  </button>
                  {openMediaMenuRowId === row.id ? (
                    <div className="script-media-menu">
                      {mediaMenuOptions.map((option) => (
                        <button className="label-s" type="button" key={option.type} onClick={() => onAddMediaItem(row.id, option.type)}>
                          <DsIcon name={option.icon} size={18} />
                          {option.label}
                        </button>
                      ))}
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
            <div className="script-row-comment-gutter">
              {rowComments.length > 0 ? (
                <button className="script-comment-marker" type="button" aria-label={`Open comments for ${getRowLabel(row.id, rows)}`} onClick={() => onOpenCommentsForRow(row.id)}>
                  <DsIcon name="chat-circle" size={15} />
                </button>
              ) : null}
              <button className="script-comment-add" type="button" aria-label={`Comment on ${getRowLabel(row.id, rows)}`} onClick={() => onOpenComposerForRow(row)}>
                <DsIcon name="chat-circle" size={15} />
              </button>
            </div>
          </div>
        );
      })}
    </section>
  );
}

function SimpleDocEditor({
  docRef,
  docValue,
  isApproved,
  rows,
  showChanges,
  onCaptureSelectionAnchor,
  onGuardApproved,
  onUpdateDoc,
}: {
  docRef: MutableRefObject<HTMLTextAreaElement | null>;
  docValue: string;
  isApproved: boolean;
  rows: ScriptRow[];
  showChanges: boolean;
  onCaptureSelectionAnchor: (target: HTMLTextAreaElement) => void;
  onGuardApproved: () => boolean;
  onUpdateDoc: (value: string) => void;
}) {
  return (
    <section className="script-doc-surface" aria-label="Simple document editor">
      <textarea
        className="script-doc-textarea paragraph-s"
        placeholder="Start writing..."
        readOnly={isApproved}
        ref={docRef}
        value={docValue}
        onMouseDown={() => {
          if (isApproved) {
            onGuardApproved();
          }
        }}
        onChange={(event) => onUpdateDoc(event.target.value)}
        onInput={(event) => resizeTextAreaToContent(event.currentTarget)}
        onKeyUp={(event) => onCaptureSelectionAnchor(event.currentTarget)}
        onMouseUp={(event) => onCaptureSelectionAnchor(event.currentTarget)}
        onSelect={(event) => onCaptureSelectionAnchor(event.currentTarget)}
      />
      {showChanges ? (
        <div className="script-doc-redline">
          {rows.map((row) => (row.change ? <RowChange change={row.change} key={row.id} /> : null))}
        </div>
      ) : null}
    </section>
  );
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

function cloneComments(comments: ScriptComment[]) {
  return comments.map((comment) => ({
    ...comment,
    anchor: { ...comment.anchor },
    reactions: comment.reactions?.map((reaction) => ({
      ...reaction,
      selectedBy: [...reaction.selectedBy],
    })),
    replies: comment.replies.map((reply) => ({
      ...reply,
      reactions: reply.reactions?.map((reaction) => ({
        ...reaction,
        selectedBy: [...reaction.selectedBy],
      })),
    })),
  }));
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

function groupCommentsByRow(comments: ScriptComment[]) {
  const commentsByRow = new Map<string, ScriptComment[]>();

  comments.forEach((comment) => {
    const rowId = comment.anchor.rowId;

    if (!rowId) {
      return;
    }

    commentsByRow.set(rowId, [...(commentsByRow.get(rowId) ?? []), comment]);
  });

  return commentsByRow;
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
    resizeTextAreaToContent(node);
  } else {
    refs.delete(rowId);
  }
}

function resizeTextAreaToContent(node: HTMLTextAreaElement | null) {
  if (!node) {
    return;
  }

  node.style.height = "auto";
  node.style.height = `${node.scrollHeight}px`;
}

function getMarkedText(mark: "bold" | "link", selectedText: string) {
  if (mark === "bold") {
    return `**${selectedText}**`;
  }

  return `[${selectedText}](https://example.com)`;
}

function getFloatingToolbarPosition(target: HTMLTextAreaElement) {
  const rect = target.getBoundingClientRect();
  return {
    x: Math.min(window.innerWidth - 210, Math.max(16, rect.left + 24)),
    y: Math.max(8, rect.top - 48),
  };
}

function capitalise(value: string) {
  return `${value.slice(0, 1).toUpperCase()}${value.slice(1)}`;
}

function formatSnapshotDate(date: Date) {
  return new Intl.DateTimeFormat("en-AU", { day: "2-digit", month: "short" }).format(date);
}
