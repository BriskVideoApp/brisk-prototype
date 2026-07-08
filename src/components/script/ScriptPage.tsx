"use client";

import Link from "next/link";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ClipboardEvent,
  type FocusEvent as ReactFocusEvent,
  type KeyboardEvent as ReactKeyboardEvent,
  type MouseEvent as ReactMouseEvent,
  type MutableRefObject,
} from "react";
import { Button } from "../../../Brisk DS/src/app/components/Button";
import { CommentCountBadge } from "@/components/CommentCountBadge";
import { CommentRail } from "@/components/comment-rail/CommentRail";
import { ScriptAiPanel, type ScriptAiInsertRequest, type ScriptAiRowDraft } from "@/components/script-ai/ScriptAiPanel";
import { FloatingCommentShell } from "@/components/script/FloatingCommentShell";
import { RequestReviewModal } from "@/components/share/RequestReviewModal";
import { DsIcon, type DsIconName } from "@/components/video-review/DsIcon";
import {
  initialScriptComments,
  scriptBrief,
  scriptUsers,
  scriptVersions,
  type ScriptComment,
  type ScriptCommentAnchor,
  type ScriptDensity,
  type ScriptMediaItem,
  type ScriptMediaType,
  type ScriptRole,
  type ScriptRow,
  type ScriptStatus,
  type ScriptSubtabId,
  type ScriptVersion,
} from "@/data/script";

const currentUserId = "user-tom";
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
const scriptSurfaceId = "mock-project-script";
const emptyScriptRowId = "script-empty-row";
const emptyScriptPlaceholderRow: ScriptRow = {
  id: emptyScriptRowId,
  words: "",
  visuals: "",
  durationSeconds: 0,
  elementType: "action",
  media: [],
};

type SelectionState = {
  lastRowId: string | null;
  selectedRowIds: Set<string>;
};

type TextRange = {
  start: number;
  end: number;
};

type FloatingToolbarState = {
  visible: boolean;
  rowId: string | null;
  x: number;
  y: number;
};

type DocHistoryEntry = {
  id: string;
  title: string;
  detail: string;
  actor: string;
  time: string;
};

type ScriptVersionMeta = {
  isMaster: boolean;
  latestAction?: VersionLatestAction;
};

type VersionRoleLabel = "Studio" | "Customer";

type VersionLatestAction =
  | {
      kind: "edited";
      time: string;
    }
  | {
      kind: "shared";
      target: VersionRoleLabel;
      date: string;
    }
  | {
      kind: "viewed";
      actor: VersionRoleLabel;
      date: string;
    }
  | {
      kind: "commented";
      actor: VersionRoleLabel;
      count: number;
      date: string;
    }
  | {
      kind: "silent";
      date: string;
    };

type VersionStateLine = {
  icon: DsIconName;
  text: string;
  tone: "muted" | "approved" | "attention" | "quiet";
};

type VersionAuditEntry = {
  date: string;
  time: string;
  action: string;
};

type ScriptRowUniversalAnchor = {
  surfaceType: "script";
  surfaceId: string;
  anchorType: "row";
  anchorRef: string;
};

type FloatingCommentPosition = {
  left: number;
  top: number;
};

type ScriptPageProps = {
  initialRole: ScriptRole;
};

const overallCommentAnchor: ScriptCommentAnchor = {
  kind: "overall",
  label: "Overall",
};

const defaultVersionMeta: ScriptVersionMeta = {
  isMaster: false,
};
const initialSavedAt = new Date("2026-07-06T12:31:00+10:00");

export function ScriptPage({ initialRole }: ScriptPageProps) {
  const latestVersion = scriptVersions[scriptVersions.length - 1];
  const role = initialRole;
  const isCustomer = role === "customer";
  const [density] = useState<ScriptDensity>("compact");
  const [showChanges, setShowChanges] = useState(false);
  const [, setStatus] = useState<ScriptStatus>("In script");
  const [isScriptApproved, setIsScriptApproved] = useState(false);
  const [versions, setVersions] = useState<ScriptVersion[]>(() => cloneVersions(scriptVersions));
  const [versionMetaById, setVersionMetaById] = useState<Record<string, ScriptVersionMeta>>(() =>
    createInitialVersionMeta(scriptVersions, latestVersion.id),
  );
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
  const [floatingCommentPosition, setFloatingCommentPosition] = useState<FloatingCommentPosition | null>(null);
  const [isCommentsOverviewOpen, setIsCommentsOverviewOpen] = useState(false);
  const [isRequestReviewOpen, setIsRequestReviewOpen] = useState(false);
  const [isVersionsPanelOpen, setIsVersionsPanelOpen] = useState(false);
  const [isCurrentVersionMenuOpen, setIsCurrentVersionMenuOpen] = useState(false);
  const [isToolbarTopRegionActive, setIsToolbarTopRegionActive] = useState(false);
  const [isToolbarRowHovered, setIsToolbarRowHovered] = useState(false);
  const [isToolbarDismissedFromTop, setIsToolbarDismissedFromTop] = useState(false);
  const [isEditorFocused, setIsEditorFocused] = useState(true);
  const [isRenamingCurrentVersion, setIsRenamingCurrentVersion] = useState(false);
  const [currentVersionRenameDraft, setCurrentVersionRenameDraft] = useState("");
  const [previewVersionId, setPreviewVersionId] = useState<string | null>(null);
  const [restoreCandidateId, setRestoreCandidateId] = useState<string | null>(null);
  const [docHistoryEntries, setDocHistoryEntries] = useState<DocHistoryEntry[]>([]);
  const [enabledSubtabs, setEnabledSubtabs] = useState<Set<Exclude<ScriptSubtabId, "script">>>(new Set());
  const [areVisualsVisible, setAreVisualsVisible] = useState(false);
  const [, setHasEditedThisSession] = useState(false);
  const [openRowMenuId, setOpenRowMenuId] = useState<string | null>(null);
  const [confirmingDeleteRowId, setConfirmingDeleteRowId] = useState<string | null>(null);
  const [highlightedRowId, setHighlightedRowId] = useState<string | null>(null);
  const [draggingRowId, setDraggingRowId] = useState<string | null>(null);
  const [dropRowId, setDropRowId] = useState<string | null>(null);
  const [openMediaMenuRowId, setOpenMediaMenuRowId] = useState<string | null>(null);
  const [isApprovedEditModalOpen, setIsApprovedEditModalOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [saveState, setSaveState] = useState<"Saved" | "Saving...">("Saved");
  const [lastSavedAt, setLastSavedAt] = useState(initialSavedAt);
  const [isAiPanelOpen, setIsAiPanelOpen] = useState(false);
  const [isAiPanelMinimised, setIsAiPanelMinimised] = useState(false);
  const [showAiToCustomer] = useState(scriptBrief.showAiToCustomer);
  const [hasTypedThisSession, setHasTypedThisSession] = useState(() =>
    latestVersion.rows.some((row) => row.words.trim() || row.visuals.trim()),
  );
  const [floatingToolbar, setFloatingToolbar] = useState<FloatingToolbarState>({
    visible: false,
    rowId: null,
    x: 0,
    y: 0,
  });
  const [commentsPanelTop, setCommentsPanelTop] = useState(0);
  const saveTimeoutRef = useRef<number | null>(null);
  const toastTimeoutRef = useRef<number | null>(null);
  const scriptBodyRef = useRef<HTMLElement | null>(null);
  const rowRefs = useRef(new Map<string, HTMLDivElement>());
  const wordInputRefs = useRef(new Map<string, HTMLTextAreaElement>());
  const visualInputRefs = useRef(new Map<string, HTMLTextAreaElement>());
  const currentVersionRenameInputRef = useRef<HTMLInputElement | null>(null);
  const isCancellingCurrentVersionRenameRef = useRef(false);
  const selectedRows = rows.filter((row) => selectionState.selectedRowIds.has(row.id));
  const visibleRows = rows.filter((row) => !row.deletedMeta);
  const aiSelectionContext = {
    activeRowLabel:
      activeCommentAnchor.rowId
        ? getRowLabel(activeCommentAnchor.rowId, rows)
        : selectionState.lastRowId
          ? getRowLabel(selectionState.lastRowId, rows)
          : null,
    hasScriptContent: visibleRows.some((row) => row.words.trim() || row.visuals.trim()),
    selectedText: activeCommentAnchor.kind === "selection" ? activeCommentAnchor.snippet ?? null : null,
  };
  const totalWords = visibleRows.reduce((total, row) => total + countWords(row.words), 0);
  const actualDurationSeconds = Math.ceil((totalWords / 150) * 60);
  const targetDurationSeconds = scriptBrief.targetDurationSeconds;
  const targetWords = scriptBrief.targetDurationSeconds * 2.5;
  const wordDelta = Math.abs(totalWords - targetWords);
  const wordState = wordDelta <= 10 ? "good" : wordDelta <= 25 ? "warning" : "danger";
  const durationDeltaText = wordState === "good" ? "" : formatFooterDelta(actualDurationSeconds - targetDurationSeconds, totalWords - targetWords);
  const visibleComments = useMemo(
    () => (isCustomer ? comments.filter((comment) => comment.visibility === "external") : comments),
    [comments, isCustomer],
  );
  const commentsByRow = useMemo(() => groupCommentsByRow(visibleComments), [visibleComments]);
  const visibleOpenComments = openCommentRowId ? commentsByRow.get(openCommentRowId) ?? [] : [];
  const shouldShowAi = !isCustomer || showAiToCustomer;
  const enabledSubtabLabels = optionalSubtabs.filter((tab) => enabledSubtabs.has(tab.id));
  const selectedVersion = versions.find((version) => version.id === selectedVersionId) ?? versions[versions.length - 1] ?? latestVersion;
  const previewVersion = previewVersionId ? versions.find((version) => version.id === previewVersionId) ?? null : null;
  const restoreCandidate = restoreCandidateId ? versions.find((version) => version.id === restoreCandidateId) ?? null : null;
  const isPreviewingVersion = previewVersion !== null;
  const dropdownVersion = previewVersion ?? selectedVersion;
  const dropdownVersionMeta = versionMetaById[dropdownVersion.id] ?? defaultVersionMeta;
  const hasToolbarMenuOpen =
    isVersionsPanelOpen ||
    isCurrentVersionMenuOpen ||
    isCommentsOverviewOpen ||
    isRequestReviewOpen ||
    isRenamingCurrentVersion ||
    isApprovedEditModalOpen;
  const isScriptToolbarVisible =
    hasToolbarMenuOpen ||
    (!isToolbarDismissedFromTop && (isToolbarTopRegionActive || isToolbarRowHovered || !isEditorFocused));

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
    const handlePointerMove = (event: PointerEvent) => {
      const nextIsTopRegionActive = event.clientY <= 80;
      const toolbarRect = document.querySelector(".script-subheader")?.getBoundingClientRect();
      const nextIsToolbarRowHovered = Boolean(
        toolbarRect &&
          event.clientX >= toolbarRect.left &&
          event.clientX <= toolbarRect.right &&
          event.clientY >= toolbarRect.top &&
          event.clientY <= toolbarRect.bottom,
      );

      setIsToolbarTopRegionActive((wasTopRegionActive) => {
        if (!wasTopRegionActive && (nextIsTopRegionActive || nextIsToolbarRowHovered)) {
          setIsToolbarDismissedFromTop(false);
        }

        return nextIsTopRegionActive;
      });
      setIsToolbarRowHovered((wasToolbarRowHovered) => {
        if (!wasToolbarRowHovered && nextIsToolbarRowHovered) {
          setIsToolbarDismissedFromTop(false);
        }

        return nextIsToolbarRowHovered;
      });
    };

    const handlePointerLeave = () => {
      setIsToolbarTopRegionActive(false);
      setIsToolbarRowHovered(false);
    };

    window.addEventListener("pointermove", handlePointerMove, { passive: true });
    window.addEventListener("pointerleave", handlePointerLeave);
    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerleave", handlePointerLeave);
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
    }, 4000);
  }, [toastMessage]);

  useEffect(() => {
    if (!isCommentsOverviewOpen) {
      return;
    }

    const updateCommentsPanelTop = () => {
      const bodyTop = scriptBodyRef.current?.getBoundingClientRect().top ?? 0;
      setCommentsPanelTop(Math.max(0, Math.round(bodyTop)));
    };

    updateCommentsPanelTop();
    window.addEventListener("resize", updateCommentsPanelTop);
    window.addEventListener("scroll", updateCommentsPanelTop, { passive: true });

    return () => {
      window.removeEventListener("resize", updateCommentsPanelTop);
      window.removeEventListener("scroll", updateCommentsPanelTop);
    };
  }, [isCommentsOverviewOpen]);

  useEffect(() => {
    wordInputRefs.current.forEach(resizeTextAreaToContent);
    visualInputRefs.current.forEach(resizeTextAreaToContent);
  }, [rows, density]);

  useEffect(() => {
    if (isRenamingCurrentVersion) {
      currentVersionRenameInputRef.current?.focus();
      currentVersionRenameInputRef.current?.select();
    }
  }, [isRenamingCurrentVersion]);

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

      if (event.key === "Escape" && floatingToolbar.visible) {
        event.preventDefault();
        setFloatingToolbar((currentToolbar) => ({ ...currentToolbar, visible: false }));

        if (target instanceof HTMLTextAreaElement) {
          target.setSelectionRange(target.selectionEnd, target.selectionEnd);
        }
      }

      if (event.key === "Escape" && isToolbarTopRegionActive && !hasToolbarMenuOpen) {
        event.preventDefault();
        setIsToolbarDismissedFromTop(true);
      }

      if (event.key === "Escape" && isCommentsOverviewOpen) {
        event.preventDefault();
        setIsCommentsOverviewOpen(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  });

  useEffect(() => {
    if (!floatingToolbar.visible) {
      return;
    }

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target;

      if (!(target instanceof Element)) {
        return;
      }

      if (target.closest(".script-floating-toolbar") || target.closest(".script-cell-input.words")) {
        return;
      }

      setFloatingToolbar((currentToolbar) => ({ ...currentToolbar, visible: false }));
    };

    window.addEventListener("pointerdown", handlePointerDown);
    return () => window.removeEventListener("pointerdown", handlePointerDown);
  }, [floatingToolbar.visible]);

  const guardEditable = () => {
    if (isPreviewingVersion) {
      return false;
    }

    if (!isScriptApproved) {
      return true;
    }

    setIsApprovedEditModalOpen(true);
    return false;
  };

  const markSaving = () => {
    const savingVersionId = selectedVersionId;
    setSaveState("Saving...");

    if (saveTimeoutRef.current) {
      window.clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = window.setTimeout(() => {
      const savedAt = new Date();
      setSaveState("Saved");
      setLastSavedAt(savedAt);
      setVersionMetaById((currentMeta) => ({
        ...currentMeta,
        [savingVersionId]: {
          ...(currentMeta[savingVersionId] ?? defaultVersionMeta),
          latestAction: {
            kind: "edited",
            time: formatSavedTime(savedAt),
          },
        },
      }));
    }, 650);
  };

  const pushRows = (nextRows: ScriptRow[]) => {
    setRows(nextRows);
    setVersions((currentVersions) =>
      currentVersions.map((version) =>
        version.id === selectedVersionId
          ? {
              ...version,
              rows: cloneRows(nextRows),
            }
          : version,
      ),
    );
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

    updateRows((currentRows) => {
      if (currentRows.length === 0 && rowId === emptyScriptRowId) {
        return [
          {
            ...emptyScriptPlaceholderRow,
            [field]: value,
            change: {
              added: field === "words" ? "Edited just now" : undefined,
              author: "Tom",
            },
          },
        ];
      }

      return currentRows.map((row) =>
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
      );
    });
  };

  const focusRowWords = (rowId: string) => {
    window.setTimeout(() => wordInputRefs.current.get(rowId)?.focus(), 0);
  };

  const addRowAfter = (rowId: string | null) => {
    const newRow = createEmptyRow(rows.length + 1);

    updateRows((currentRows) => {
      if (!rowId) {
        return [...currentRows, newRow];
      }

      const rowIndex = currentRows.findIndex((row) => row.id === rowId);

      if (rowIndex === -1) {
        return [...currentRows, newRow];
      }

      return [...currentRows.slice(0, rowIndex + 1), newRow, ...currentRows.slice(rowIndex + 1)];
    });
    focusRowWords(newRow.id);
  };

  const addRowBefore = (rowId: string) => {
    const newRow = createEmptyRow(rows.length + 1);

    updateRows((currentRows) => {
      const rowIndex = currentRows.findIndex((row) => row.id === rowId);

      if (rowIndex === -1) {
        return [newRow, ...currentRows];
      }

      return [...currentRows.slice(0, rowIndex), newRow, ...currentRows.slice(rowIndex)];
    });
    focusRowWords(newRow.id);
  };

  const deleteEmptyRow = (row: ScriptRow) => {
    const currentIndex = rows.findIndex((currentRow) => currentRow.id === row.id);
    const previousRow = rows.slice(0, currentIndex).reverse().find((currentRow) => !currentRow.deletedMeta);

    updateRows((currentRows) => currentRows.filter((currentRow) => currentRow.id !== row.id));

    if (previousRow) {
      window.setTimeout(() => wordInputRefs.current.get(previousRow.id)?.focus(), 0);
    }
  };

  const addDocHistoryEntry = (entry: Omit<DocHistoryEntry, "id">) => {
    setDocHistoryEntries((currentEntries) => [
      createDocHistoryEntry(entry, currentEntries.length),
      ...currentEntries,
    ]);
  };

  const setSelectedVersionLatestAction = (latestAction: VersionLatestAction) => {
    setVersionMetaById((currentMeta) => ({
      ...currentMeta,
      [selectedVersionId]: {
        ...(currentMeta[selectedVersionId] ?? defaultVersionMeta),
        latestAction,
      },
    }));
  };

  const deleteSelectedRows = () => {
    if (selectedRows.length === 0) {
      return;
    }

    if (!guardEditable()) {
      return;
    }

    const deletedRowLabels = selectedRows.map((row) => getRowLabel(row.id, rows));

    pushRows(cloneRows(rows).filter((row) => !selectionState.selectedRowIds.has(row.id)));
    addDocHistoryEntry({
      title: selectedRows.length === 1 ? `${deletedRowLabels[0]} deleted` : `${selectedRows.length} rows deleted`,
      detail:
        selectedRows.length === 1
          ? `${deletedRowLabels[0]} was removed from the document.`
          : `${deletedRowLabels.join(", ")} were removed from the document.`,
      actor: "Tom",
      time: "just now",
    });
    setSelectionState({ lastRowId: null, selectedRowIds: new Set<string>() });
  };

  const deleteRowById = (rowId: string, shouldSkipConfirm = false) => {
    const row = rows.find((currentRow) => currentRow.id === rowId);

    if (!row) {
      return;
    }

    const hasContent = Boolean(row.words.trim() || row.visuals.trim() || row.media.length > 0);

    if (!guardEditable()) {
      return;
    }

    if (hasContent && !shouldSkipConfirm) {
      setOpenRowMenuId(rowId);
      setConfirmingDeleteRowId(rowId);
      return;
    }

    const rowLabel = getRowLabel(rowId, rows);
    const rowPreview = row.words.trim() ? `Deleted line: "${truncateText(row.words.trim(), 72)}"` : "Empty row removed.";

    pushRows(cloneRows(rows).filter((currentRow) => currentRow.id !== rowId));
    addDocHistoryEntry({
      title: `${rowLabel} deleted`,
      detail: rowPreview,
      actor: "Tom",
      time: "just now",
    });
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
    const selection = getTrimmedSelection(target);

    if (!selection) {
      setFloatingToolbar((currentToolbar) => ({ ...currentToolbar, visible: false }));
      setActiveCommentAnchor((currentAnchor) =>
        currentAnchor.kind === "selection" && currentAnchor.rowId === row.id
          ? {
              kind: "row",
              label: getRowLabel(row.id, rows),
              rowId: row.id,
            }
          : currentAnchor,
      );
      return;
    }

    const position = getFloatingToolbarPosition(target);
    setFloatingToolbar({ visible: true, rowId: row.id, ...position });
    setActiveCommentAnchor({
      kind: "selection",
      label: getRowLabel(row.id, rows),
      rowId: row.id,
      snippet: selection.text.length > 44 ? `${selection.text.slice(0, 44)}...` : selection.text,
      range: { start: selection.start, end: selection.end },
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

  const loadRowsFromVersion = (version: ScriptVersion) => {
    const nextRows = cloneRows(version.rows);

    setRows(nextRows);
    setRowHistory([cloneRows(nextRows)]);
    setHistoryIndex(0);
    setHasTypedThisSession(nextRows.some((row) => row.words.trim() || row.visuals.trim()));
    setSelectionState({ lastRowId: null, selectedRowIds: new Set<string>() });
  };

  const previewVersionForReadOnly = (versionId: string) => {
    const version = versions.find((item) => item.id === versionId);

    if (!version || version.id === selectedVersionId) {
      return;
    }

    setPreviewVersionId(version.id);
    loadRowsFromVersion(version);
    setSaveState("Saved");
  };

  const returnToCurrentVersion = () => {
    loadRowsFromVersion(selectedVersion);
    setPreviewVersionId(null);
    setRestoreCandidateId(null);
  };

  const createScriptVersion = (label: string, nextRows: ScriptRow[], snapshotName: string): ScriptVersion => ({
    id: `${label}-${Date.now()}`,
    label,
    snapshotName,
    approvedSnapshot: false,
    createdBy: role === "customer" ? "Customer" : "Studio",
    createdAt: formatSnapshotDate(new Date()),
    rows: cloneRows(nextRows),
  });

  const activateVersion = (version: ScriptVersion, nextRows: ScriptRow[], message: string) => {
    setSelectedVersionId(version.id);
    setRows(cloneRows(nextRows));
    setRowHistory([cloneRows(nextRows)]);
    setHistoryIndex(0);
    setHasTypedThisSession(nextRows.some((row) => row.words.trim() || row.visuals.trim()));
    setSelectionState({ lastRowId: null, selectedRowIds: new Set<string>() });
    setSaveState("Saved");
    setLastSavedAt(new Date());
    setIsScriptApproved(version.approvedSnapshot);
    setToastMessage(message);
    setPreviewVersionId(null);
    setRestoreCandidateId(null);
    setIsVersionsPanelOpen(false);
    setIsCurrentVersionMenuOpen(false);
  };

  const createNewScriptDocument = () => {
    const nextRows: ScriptRow[] = [];
    const nextLabel = getNextVersionLabel(versions);
    const nextVersion = createScriptVersion(nextLabel, nextRows, `Script ${nextLabel} - Current`);

    setVersions((currentVersions) => [...currentVersions, nextVersion]);
    setVersionMetaById((currentMeta) => ({
      ...currentMeta,
      [nextVersion.id]: { ...defaultVersionMeta },
    }));
    setStatus("In script");
    addDocHistoryEntry({
      title: `Tom created ${nextLabel}`,
      detail: "Started a fresh script version.",
      actor: "Tom",
      time: "Just now",
    });
    activateVersion(nextVersion, nextRows, `${nextLabel} created`);
  };

  const createNewScriptDocumentFromMenu = () => {
    setIsCurrentVersionMenuOpen(false);
    createNewScriptDocument();
  };

  const toggleShowChangesFromMenu = () => {
    setShowChanges((isShowingChanges) => !isShowingChanges);
    setIsCurrentVersionMenuOpen(false);
  };

  const duplicateVersion = (versionId: string) => {
    const sourceVersion = versions.find((version) => version.id === versionId);

    if (!sourceVersion) {
      return;
    }

    const nextLabel = getNextVersionLabel(versions);
    const nextVersion = createScriptVersion(nextLabel, sourceVersion.rows, `${getVersionHistoryBaseTitle(sourceVersion)} copy`);

    setVersions((currentVersions) => [...currentVersions, nextVersion]);
    setVersionMetaById((currentMeta) => ({
      ...currentMeta,
      [nextVersion.id]: { ...defaultVersionMeta },
    }));
    addDocHistoryEntry({
      title: `Tom duplicated ${getVersionHistoryBaseTitle(sourceVersion)}`,
      detail: "Duplicated the selected script version.",
      actor: "Tom",
      time: "Just now",
    });
    activateVersion(nextVersion, sourceVersion.rows, "Script duplicated");
  };

  const deleteVersion = (versionId: string) => {
    const version = versions.find((item) => item.id === versionId);

    if (!version) {
      return;
    }

    if (version.approvedSnapshot) {
      setToastMessage("The approved version can't be deleted. Un-approve or approve a different version first.");
      setIsVersionsPanelOpen(false);
      return;
    }

    if (versions.length <= 1) {
      setToastMessage("Keep at least one script version");
      setIsVersionsPanelOpen(false);
      return;
    }

    const selectedIndex = versions.findIndex((currentVersion) => currentVersion.id === versionId);
    const fallbackVersion = versions[selectedIndex - 1] ?? versions[selectedIndex + 1] ?? versions[0];

    setVersions((currentVersions) => currentVersions.filter((currentVersion) => currentVersion.id !== versionId));
    setVersionMetaById((currentMeta) => {
      const nextMeta = { ...currentMeta };
      delete nextMeta[versionId];
      return nextMeta;
    });
    if (versionId === selectedVersionId) {
      activateVersion(fallbackVersion, fallbackVersion.rows, "Script deleted");
    } else {
      if (previewVersionId === versionId) {
        returnToCurrentVersion();
      }

      setToastMessage("Script deleted");
      setIsVersionsPanelOpen(false);
    }
  };

  const renameVersion = (versionId: string, nextLabel: string) => {
    const trimmedLabel = nextLabel.trim();

    if (!trimmedLabel) {
      return;
    }

    setVersions((currentVersions) =>
      currentVersions.map((currentVersion) =>
        currentVersion.id === versionId
          ? {
              ...currentVersion,
              displayName: trimmedLabel,
            }
          : currentVersion,
      ),
    );
  };

  const startCurrentVersionRename = () => {
    isCancellingCurrentVersionRenameRef.current = false;
    setIsCurrentVersionMenuOpen(false);
    setIsVersionsPanelOpen(false);
    setCurrentVersionRenameDraft(getVersionButtonLabel(selectedVersion, versionMetaById[selectedVersion.id] ?? defaultVersionMeta));
    setIsRenamingCurrentVersion(true);
  };

  const saveCurrentVersionRename = () => {
    if (isCancellingCurrentVersionRenameRef.current) {
      isCancellingCurrentVersionRenameRef.current = false;
      return;
    }

    const trimmedDraft = currentVersionRenameDraft.trim();

    if (trimmedDraft) {
      renameVersion(selectedVersion.id, trimmedDraft);
    }

    setIsRenamingCurrentVersion(false);
    setCurrentVersionRenameDraft("");
  };

  const cancelCurrentVersionRename = () => {
    isCancellingCurrentVersionRenameRef.current = true;
    setIsRenamingCurrentVersion(false);
    setCurrentVersionRenameDraft("");
  };

  const openRestoreConfirmation = (versionId: string) => {
    const version = versions.find((item) => item.id === versionId);

    if (!version || version.id === selectedVersionId) {
      return;
    }

    setRestoreCandidateId(version.id);
    setIsVersionsPanelOpen(false);
  };

  const restoreVersionAsNew = () => {
    if (!restoreCandidate) {
      return;
    }

    const nextLabel = getNextVersionLabel(versions);
    const nextVersion = createScriptVersion(nextLabel, restoreCandidate.rows, `Script ${nextLabel} - Current`);

    setVersions((currentVersions) => [...currentVersions, nextVersion]);
    setVersionMetaById((currentMeta) => ({
      ...currentMeta,
      [nextVersion.id]: { ...defaultVersionMeta },
    }));
    addDocHistoryEntry({
      title: `Tom restored ${restoreCandidate.label} as ${nextLabel}`,
      detail: "Restored an older script as the current version.",
      actor: "Tom",
      time: "Just now",
    });
    activateVersion(nextVersion, restoreCandidate.rows, `${nextLabel} restored`);
  };

  const approveScript = () => {
    const approvedAt = formatSnapshotDate(new Date());
    const previouslyApprovedVersion = versions.find((version) => version.approvedSnapshot && version.id !== selectedVersionId);

    setIsScriptApproved(true);
    setStatus("Approved");
    setEnabledSubtabs(new Set(optionalSubtabs.map((tab) => tab.id)));
    setVersions((currentVersions) =>
      currentVersions.map((version) =>
        version.id === selectedVersionId
          ? {
              ...version,
              approvedSnapshot: true,
              approvedBy: "Tom",
              approvedAt,
              displayName: undefined,
              snapshotName: `${version.label} - Approved`,
            }
          : {
              ...version,
              approvedSnapshot: false,
              approvedBy: undefined,
              approvedAt: undefined,
            },
      ),
    );
    if (previouslyApprovedVersion) {
      addDocHistoryEntry({
        title: `Tom un-approved ${previouslyApprovedVersion.label}`,
        detail: `${previouslyApprovedVersion.label} is no longer marked approved.`,
        actor: "Tom",
        time: "Just now",
      });
    }
    addDocHistoryEntry({
      title: `Tom approved ${selectedVersion.label}`,
      detail: "Approval recorded for this version.",
      actor: "Tom",
      time: "Just now",
    });
    setToastMessage(
      previouslyApprovedVersion
        ? `${selectedVersion.label} approved. ${previouslyApprovedVersion.label} no longer marked approved.`
        : `${selectedVersion.label} approved.`,
    );
  };

  const unapproveScript = (shouldDuplicateSnapshot: boolean) => {
    setIsScriptApproved(false);
    setStatus("Waiting on Customer");

    if (shouldDuplicateSnapshot) {
      const actor = role === "customer" ? "Customer" : "Studio";
      const editLabel = role === "customer" ? "Client Edit" : "Studio Edit";
      const snapshotDate = formatSnapshotDate(new Date());
      const snapshotLabel = `${selectedVersion.label} (${editLabel})`;
      const snapshotName = `${snapshotLabel} - ${snapshotDate}`;
      const snapshot: ScriptVersion = {
        id: `${snapshotLabel.toLowerCase().replace(/[^a-z0-9]+/gu, "-").replace(/^-|-$/gu, "")}-${Date.now()}`,
        label: snapshotLabel,
        snapshotName,
        approvedSnapshot: false,
        approvedBy: undefined,
        approvedAt: undefined,
        createdBy: actor,
        createdAt: snapshotDate,
        rows: cloneRows(rows),
      };

      setVersions((currentVersions) => [...currentVersions, snapshot]);
      setVersionMetaById((currentMeta) => ({
        ...currentMeta,
        [snapshot.id]: { ...defaultVersionMeta },
      }));
      addDocHistoryEntry({
        title: `${actor} edited an approved script`,
        detail: "A new editable snapshot was created.",
        actor,
        time: "Just now",
      });
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

  const applyTextMark = (mark: "bold" | "link") => {
    const activeRowId = floatingToolbar.rowId ?? selectionState.lastRowId;

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

  const openSelectionComment = () => {
    if (activeCommentAnchor.kind !== "selection" || !activeCommentAnchor.rowId) {
      return;
    }

    const rowId = activeCommentAnchor.rowId;
    const input = wordInputRefs.current.get(rowId);

    if (!input) {
      return;
    }

    setOpenCommentRowId(rowId);
    setIsCommentComposerOpen(true);
    setFloatingCommentPosition(getFloatingCommentPosition(input.getBoundingClientRect()));
    setIsCommentsOverviewOpen(false);
    setFloatingToolbar((currentToolbar) => ({ ...currentToolbar, visible: false }));
    focusCommentComposer();
  };

  const handleAiInsert = (request: ScriptAiInsertRequest) => {
    if (request.mode === "replace_selection") {
      replaceSelectedTextWithAi(request.text);
      return;
    }

    if (request.mode === "replace_script_new_version") {
      createScriptDocumentFromAi(request.rows);
      return;
    }

    if (request.mode === "replace_row_visuals") {
      replaceActiveRowVisuals(request.visuals);
      return;
    }

    insertAiRowsAfterActive(request.rows);
  };

  const replaceSelectedTextWithAi = (text: string) => {
    if (activeCommentAnchor.kind !== "selection" || !activeCommentAnchor.rowId || !activeCommentAnchor.range) {
      setToastMessage("Select script text before replacing it.");
      return;
    }

    updateRows((currentRows) =>
      currentRows.map((row) => {
        if (row.id !== activeCommentAnchor.rowId) {
          return row;
        }

        return {
          ...row,
          words: `${row.words.slice(0, activeCommentAnchor.range!.start)}${text}${row.words.slice(activeCommentAnchor.range!.end)}`,
        };
      }),
    );
    setFloatingToolbar((currentToolbar) => ({ ...currentToolbar, visible: false }));
    setToastMessage("Selection replaced by ChopChop AI.");
  };

  const createScriptDocumentFromAi = (draftRows: ScriptAiRowDraft[]) => {
    const nextRows = createRowsFromAiDrafts(draftRows);
    const nextLabel = getNextVersionLabel(versions);
    const nextVersion = createScriptVersion(nextLabel, nextRows, `Script ${nextLabel} - AI draft`);

    setVersions((currentVersions) => [...currentVersions, nextVersion]);
    setVersionMetaById((currentMeta) => ({
      ...currentMeta,
      [nextVersion.id]: { ...defaultVersionMeta },
    }));
    addDocHistoryEntry({
      title: `Tom created ${nextLabel} with ChopChop AI`,
      detail: "Generated a fresh script version from the brief.",
      actor: "Tom",
      time: "Just now",
    });
    activateVersion(nextVersion, nextRows, `${nextLabel} created from ChopChop AI`);
  };

  const replaceActiveRowVisuals = (visuals: string) => {
    const activeRowId = activeCommentAnchor.rowId ?? selectionState.lastRowId ?? rows[0]?.id;

    if (!activeRowId) {
      setToastMessage("Choose a script row before inserting visuals.");
      return;
    }

    updateRows((currentRows) =>
      currentRows.map((row) => (row.id === activeRowId ? { ...row, visuals } : row)),
    );
    setAreVisualsVisible(true);
    setToastMessage("Visual direction inserted.");
  };

  const insertAiRowsAfterActive = (draftRows: ScriptAiRowDraft[]) => {
    updateRows((currentRows) => {
      const activeRowId = activeCommentAnchor.rowId ?? selectionState.lastRowId ?? currentRows[0]?.id;
      const activeIndex = activeRowId ? currentRows.findIndex((row) => row.id === activeRowId) : currentRows.length - 1;
      const insertIndex = activeIndex === -1 ? currentRows.length : activeIndex + 1;
      const aiRows = createRowsFromAiDrafts(draftRows, currentRows.length);

      return [...currentRows.slice(0, insertIndex), ...aiRows, ...currentRows.slice(insertIndex)];
    });
    setToastMessage("ChopChop AI rows inserted.");
  };

  const focusCommentComposer = () => {
    window.setTimeout(() => {
      document.querySelector<HTMLTextAreaElement>(".floating-comment-shell .composer-input")?.focus();
    }, 0);
  };

  const openUniversalRowAnchor = (anchor: ScriptRowUniversalAnchor, triggerRect: DOMRect) => {
    if (anchor.surfaceType !== "script" || anchor.surfaceId !== scriptSurfaceId || anchor.anchorType !== "row") {
      return;
    }

    const row = rows.find((candidate) => candidate.id === anchor.anchorRef);
    const target = wordInputRefs.current.get(anchor.anchorRef);
    const selection = target ? getTrimmedSelection(target) : null;
    const liveSelectionAnchor =
      row && selection
        ? ({
            kind: "selection",
            label: getRowLabel(row.id, rows),
            rowId: row.id,
            snippet: selection.text.length > 44 ? `${selection.text.slice(0, 44)}...` : selection.text,
            range: { start: selection.start, end: selection.end },
          } satisfies ScriptCommentAnchor)
        : null;
    const selectedTextAnchor =
      activeCommentAnchor.kind === "selection" && activeCommentAnchor.rowId === anchor.anchorRef
        ? activeCommentAnchor
        : null;
    const nextAnchor =
      liveSelectionAnchor ??
      selectedTextAnchor ??
      ({
        kind: "row",
        label: getRowLabel(anchor.anchorRef, rows),
        rowId: anchor.anchorRef,
      } satisfies ScriptCommentAnchor);

    setActiveCommentAnchor(nextAnchor);
    setOpenCommentRowId(anchor.anchorRef);
    setIsCommentComposerOpen(true);
    setFloatingCommentPosition(getFloatingCommentPosition(triggerRect));
    setIsCommentsOverviewOpen(false);
    focusCommentComposer();
  };

  const mergeScopedComments = (previousScope: ScriptComment[], nextScope: ScriptComment[]) => {
    const previousIds = new Set(previousScope.map((comment) => comment.id));

    setComments((currentComments) => [
      ...currentComments.filter((comment) => !previousIds.has(comment.id)),
      ...cloneComments(nextScope),
    ]);

    if (nextScope.length > previousScope.length) {
      const actor: VersionRoleLabel = role === "customer" ? "Customer" : "Studio";
      const commentCount = nextScope.filter((comment) => {
        const author = scriptUsers.find((user) => user.id === comment.authorId);
        return actor === "Customer" ? author?.team === "customer" : author?.team === "studio";
      }).length;

      setSelectedVersionLatestAction({
        kind: "commented",
        actor,
        count: Math.max(commentCount, 1),
        date: formatSnapshotDate(new Date()),
      });
    }
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

  const openAllComments = () => {
    if (isCommentsOverviewOpen) {
      setIsCommentsOverviewOpen(false);
      return;
    }

    const bodyTop = scriptBodyRef.current?.getBoundingClientRect().top ?? 0;
    setCommentsPanelTop(Math.max(0, Math.round(bodyTop)));
    setActiveCommentAnchor(overallCommentAnchor);
    setIsCommentsOverviewOpen(true);
    setIsVersionsPanelOpen(false);
    setIsCurrentVersionMenuOpen(false);
    setOpenCommentRowId(null);
    setIsCommentComposerOpen(false);
    setFloatingCommentPosition(null);
  };

  const copyCurrentVersionLink = async () => {
    const shareUrl = `https://share.brisk.prototype/script/${selectedVersion.label}`;

    try {
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(shareUrl);
      }
    } catch {
      // Prototype-only: keep feedback visible if local clipboard permissions are blocked.
    }

    setToastMessage(`Link copied for script ${selectedVersion.label}`);
  };

  const requestCurrentVersionReview = () => {
    setIsRequestReviewOpen(true);
    setIsVersionsPanelOpen(false);
    setIsCurrentVersionMenuOpen(false);
    setIsCommentsOverviewOpen(false);
    setOpenCommentRowId(null);
    setIsCommentComposerOpen(false);
    setFloatingCommentPosition(null);
  };

  const handleReviewRequestSent = (recipientName: string) => {
    setSelectedVersionLatestAction({
      kind: "shared",
      target: recipientName.toLowerCase().includes("internal") ? "Studio" : "Customer",
      date: formatSnapshotDate(new Date()),
    });
    setToastMessage(`Review request sent to ${recipientName}`);
  };

  const isWritingSurfaceInput = (target: EventTarget | null) =>
    target instanceof HTMLTextAreaElement && target.classList.contains("script-cell-input");

  const handleScriptBodyFocusCapture = (event: ReactFocusEvent<HTMLElement>) => {
    if (isWritingSurfaceInput(event.target)) {
      setIsEditorFocused(true);
    }
  };

  const handleScriptBodyBlurCapture = () => {
    window.setTimeout(() => {
      setIsEditorFocused(isWritingSurfaceInput(document.activeElement));
    }, 0);
  };

  return (
    <main className={`script-shell script-density-${density} ${isCustomer ? "customer" : "studio"} ${isCommentsOverviewOpen ? "comments-overview-open" : ""}`}>
      <ScriptHeader enabledSubtabLabels={enabledSubtabLabels} role={role} />

      <section
        className={`script-subheader ${isScriptToolbarVisible ? "toolbar-visible" : "toolbar-hidden"}`}
        aria-label="Script controls"
        onMouseEnter={() => {
          setIsToolbarDismissedFromTop(false);
          setIsToolbarRowHovered(true);
        }}
        onMouseLeave={() => setIsToolbarRowHovered(false)}
      >
        <div className="script-subheader-left">
          <div className="script-version-control">
            <div className="script-version-panel-wrap">
              {isRenamingCurrentVersion ? (
                <input
                  ref={currentVersionRenameInputRef}
                  aria-label={`Rename ${getVersionButtonLabel(selectedVersion, versionMetaById[selectedVersion.id] ?? defaultVersionMeta)}`}
                  className="script-version-rename-input script-current-version-rename-input label-xs-semibold"
                  value={currentVersionRenameDraft}
                  onBlur={saveCurrentVersionRename}
                  onChange={(event) => setCurrentVersionRenameDraft(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      saveCurrentVersionRename();
                    }

                    if (event.key === "Escape") {
                      event.preventDefault();
                      cancelCurrentVersionRename();
                    }
                  }}
                />
              ) : (
                <button
                  className={`script-current-version-button label-xs-semibold ${isPreviewingVersion ? "previewing" : ""}`}
                  type="button"
                  aria-label="Open versions"
                  aria-expanded={isVersionsPanelOpen}
                  onClick={() => {
                    setIsVersionsPanelOpen((isOpen) => !isOpen);
                    setIsCurrentVersionMenuOpen(false);
                    setIsCommentsOverviewOpen(false);
                    setOpenCommentRowId(null);
                    setIsCommentComposerOpen(false);
                    setFloatingCommentPosition(null);
                  }}
                >
                  <span>{getVersionButtonLabel(dropdownVersion, dropdownVersionMeta)}</span>
                  <DsIcon name="caret-down" size={14} />
                </button>
              )}
              {isVersionsPanelOpen ? (
                <VersionsPanel
                  entries={docHistoryEntries}
                  isCustomer={isCustomer}
                  lastSavedAt={lastSavedAt}
                  previewVersionId={previewVersionId}
                  saveState={saveState}
                  selectedVersionId={selectedVersionId}
                  versionMetaById={versionMetaById}
                  versions={versions}
                  onViewVersion={previewVersionForReadOnly}
                />
              ) : null}
            </div>
            <div className="script-current-version-menu-wrap">
              <button
                className="script-version-row-menu-button"
                type="button"
                aria-label={`Open menu for ${getVersionHistoryTitle(selectedVersion, versionMetaById[selectedVersion.id] ?? defaultVersionMeta)}`}
                aria-expanded={isCurrentVersionMenuOpen}
                onClick={() => {
                  setIsCurrentVersionMenuOpen((isOpen) => !isOpen);
                  setIsVersionsPanelOpen(false);
                  setIsCommentsOverviewOpen(false);
                }}
              >
                <DsIcon name="dots-three" size={14} />
              </button>
              {isCurrentVersionMenuOpen ? (
                <span className="script-version-row-menu script-current-version-menu">
                  {!isCustomer ? (
                    <>
                      <button
                        className="label-xs-semibold"
                        type="button"
                        aria-pressed={showChanges}
                        onClick={toggleShowChangesFromMenu}
                      >
                        <span>{showChanges ? "Hide changes" : "Show changes"}</span>
                        {showChanges ? <DsIcon name="check" size={12} /> : null}
                      </button>
                      <button className="label-xs-semibold" type="button" onClick={createNewScriptDocumentFromMenu}>
                        New script
                      </button>
                      <span className="script-menu-divider" aria-hidden="true" />
                    </>
                  ) : null}
                  <button className="label-xs-semibold" type="button" onClick={() => duplicateVersion(selectedVersion.id)}>
                    Duplicate
                  </button>
                  <button className="label-xs-semibold" type="button" onClick={startCurrentVersionRename}>
                    Rename
                  </button>
                  <button
                    className="delete label-xs-semibold"
                    disabled={selectedVersion.approvedSnapshot}
                    title={selectedVersion.approvedSnapshot ? "The approved version can't be deleted. Un-approve or approve a different version first." : undefined}
                    type="button"
                    onClick={() => {
                      setIsCurrentVersionMenuOpen(false);
                      deleteVersion(selectedVersion.id);
                    }}
                  >
                    Delete
                  </button>
                </span>
              ) : null}
            </div>
            <ScriptHistoryControls onRedo={redoRows} onUndo={undoRows} />
            <span className="script-save-note label-xs">
              {saveState === "Saving..." ? "Saving..." : `Saved · ${formatSavedTime(lastSavedAt)}`}
            </span>
          </div>
        </div>
        {!isCommentsOverviewOpen ? (
          <div className="script-subheader-actions">
            <ScriptActionCluster
              approvedAt={selectedVersion.approvedAt}
              approvedBy={selectedVersion.approvedBy}
              isApproved={isScriptApproved}
              isPreviewing={isPreviewingVersion}
              subtabLabel="script"
              versionLabel={selectedVersion.label}
              onApprove={approveScript}
              onCopyLink={copyCurrentVersionLink}
              onRequestReview={requestCurrentVersionReview}
              onUnapprove={() => unapproveScript(true)}
            />
            <button
              className="script-quiet-icon"
              type="button"
              aria-label="Comments"
              aria-expanded={isCommentsOverviewOpen}
              aria-pressed={isCommentsOverviewOpen}
              data-tooltip="Comments"
              onClick={openAllComments}
            >
              <DsIcon name="chat-circle" size={16} />
            </button>
          </div>
        ) : null}
        {isCommentsOverviewOpen ? (
          <div className="script-comments-sidebar-actions" aria-label="Comments share controls">
            <ScriptActionCluster
              approvedAt={selectedVersion.approvedAt}
              approvedBy={selectedVersion.approvedBy}
              isApproved={isScriptApproved}
              isPreviewing={isPreviewingVersion}
              subtabLabel="script"
              versionLabel={selectedVersion.label}
              onApprove={approveScript}
              onCopyLink={copyCurrentVersionLink}
              onRequestReview={requestCurrentVersionReview}
              onUnapprove={() => unapproveScript(true)}
            />
            <button
              className="script-quiet-icon active"
              type="button"
              aria-label="Comments"
              aria-expanded={isCommentsOverviewOpen}
              aria-pressed={isCommentsOverviewOpen}
              data-tooltip="Comments"
              onClick={openAllComments}
            >
              <DsIcon name="chat-circle" size={16} />
            </button>
          </div>
        ) : null}
      </section>

      <section
        className={`script-body ${isCommentsOverviewOpen ? "comments-overview-open" : ""}`}
        ref={scriptBodyRef}
        onBlurCapture={handleScriptBodyBlurCapture}
        onFocusCapture={handleScriptBodyFocusCapture}
      >
        <div className="script-editor-column">
          {previewVersion ? (
            <VersionPreviewBanner
              version={previewVersion}
              versionMeta={versionMetaById[previewVersion.id] ?? defaultVersionMeta}
              onRestore={() => openRestoreConfirmation(previewVersion.id)}
              onReturn={returnToCurrentVersion}
            />
          ) : null}
          <AvScriptEditor
            commentsByRow={commentsByRow}
            density={density}
            draggingRowId={draggingRowId}
            dropRowId={dropRowId}
            hasTypedThisSession={hasTypedThisSession}
            isApproved={isScriptApproved || isPreviewingVersion}
            highlightedRowId={highlightedRowId}
            openMediaMenuRowId={openMediaMenuRowId}
            openRowMenuId={openRowMenuId}
            confirmingDeleteRowId={confirmingDeleteRowId}
            rows={visibleRows}
            areVisualsVisible={areVisualsVisible}
            selectedRowIds={selectionState.selectedRowIds}
            showChanges={showChanges}
            wordInputRefs={wordInputRefs}
            visualInputRefs={visualInputRefs}
            onAddMediaItem={addMediaItem}
            onAddRowAfter={addRowAfter}
            onAddRowBefore={addRowBefore}
            onCancelRowDelete={() => setConfirmingDeleteRowId(null)}
            onCaptureSelectionAnchor={captureSelectionAnchor}
            onDeleteRow={deleteRowById}
            onToggleVisuals={() => setAreVisualsVisible((isVisible) => !isVisible)}
            onDragEnd={() => {
              setDraggingRowId(null);
              setDropRowId(null);
            }}
            onDragOverRow={(rowId) => setDropRowId(rowId)}
            onDragStartRow={setDraggingRowId}
            onDuplicateRow={duplicateRowById}
            onGuardApproved={isPreviewingVersion ? () => false : guardEditable}
            onOpenRowAnnotation={openUniversalRowAnchor}
            onPasteWords={handleWordsPaste}
            onReorderRows={(targetRowId) => {
              if (draggingRowId) {
                reorderRows(draggingRowId, targetRowId);
              }
            }}
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
          {showChanges ? <RedlineLegend /> : null}
        </div>

        {isCommentsOverviewOpen ? (
          <div
            className="script-comment-popover overview"
            style={{
              height: `calc(100vh - ${commentsPanelTop}px)`,
              top: `${commentsPanelTop}px`,
            }}
          >
            <CommentRail
              activeAnchor={overallCommentAnchor}
              comments={visibleComments}
              composerAnchor={overallCommentAnchor}
              composerPlacement="top"
              currentUserId={currentUserId}
              showComposer={false}
              users={scriptUsers}
              canPostInternal={!isCustomer}
              canSeeInternal={!isCustomer}
              filterMode={isCustomer ? "customer" : "studio"}
              title={`Comments (${visibleComments.length})`}
              onClose={() => {
                setOpenCommentRowId(null);
                setIsCommentComposerOpen(false);
                setFloatingCommentPosition(null);
                setIsCommentsOverviewOpen(false);
              }}
              onCommentsChange={(nextScopedComments) =>
                mergeScopedComments(visibleComments, nextScopedComments)
              }
              onSelectComment={selectCommentAnchor}
            />
          </div>
        ) : null}

        {!isCommentsOverviewOpen && (openCommentRowId || isCommentComposerOpen) && floatingCommentPosition ? (
          <FloatingCommentShell
            anchor={activeCommentAnchor}
            canPostInternal={!isCustomer}
            comments={visibleOpenComments}
            currentUserId={currentUserId}
            position={floatingCommentPosition}
            users={scriptUsers}
            onCommentsChange={(nextScopedComments) => mergeScopedComments(visibleOpenComments, nextScopedComments)}
            onDismiss={() => {
              setOpenCommentRowId(null);
              setIsCommentComposerOpen(false);
              setFloatingCommentPosition(null);
            }}
          />
        ) : null}

      </section>

      <footer className={`script-word-footer word-${wordState}`}>
        <span className="script-word-footer-inner">
          <span className="script-word-footer-copy">
            <span className="script-word-count">{totalWords} words</span>
            <span className="script-word-separator" aria-hidden="true">·</span>
            <span className="script-duration-pair" data-tooltip="Based on 150 words per minute.">
              <span className="script-duration-actual">{formatFooterDuration(actualDurationSeconds)}</span>
              <span className="script-duration-target"> / {formatFooterDuration(targetDurationSeconds)}</span>
            </span>
            {durationDeltaText ? <span className="script-word-delta">{durationDeltaText}</span> : null}
          </span>
        </span>
      </footer>

      <FloatingSelectionCommentButton
        state={floatingToolbar}
        onAi={() => {
          setIsAiPanelOpen(true);
          setIsAiPanelMinimised(false);
        }}
        onApply={applyTextMark}
        onComment={openSelectionComment}
      />

      {shouldShowAi ? (
        <>
          {!isAiPanelOpen ? (
            <button
              className="script-ai-fab"
              type="button"
              aria-label="Open ChopChop AI"
              onClick={() => {
                setIsAiPanelOpen(true);
                setIsAiPanelMinimised(false);
              }}
            >
              <span className="script-ai-fab-tooltip label-xs-semibold" role="tooltip">
                Brisk AI
              </span>
              <img
                alt=""
                className="script-ai-fab-image"
                draggable={false}
                src="/brisk-icons/chopchop-ai.svg?v=4"
              />
            </button>
          ) : null}
          <ScriptAiPanel
            genre={scriptBrief.genre}
            isMinimised={isAiPanelMinimised}
            isOpen={isAiPanelOpen}
            selectionContext={aiSelectionContext}
            onClose={() => setIsAiPanelOpen(false)}
            onInsert={handleAiInsert}
            onMinimise={setIsAiPanelMinimised}
          />
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

      {restoreCandidate ? (
        <div className="script-modal-backdrop" role="presentation">
          <section className="script-edit-modal" role="dialog" aria-modal="true" aria-labelledby="script-restore-title">
            <h2 id="script-restore-title">Restore {restoreCandidate.label} as a new version?</h2>
            <p>
              Your current {selectedVersion.label} will be preserved in the history. {restoreCandidate.label} will be duplicated
              and become the new current version ({getNextVersionLabel(versions)}).
            </p>
            <div className="script-modal-actions">
              <Button size="S" type="button" variant="secondary" onClick={() => setRestoreCandidateId(null)}>
                Cancel
              </Button>
              <Button size="S" type="button" variant="primary" onClick={restoreVersionAsNew}>
                Restore as {getNextVersionLabel(versions)}
              </Button>
            </div>
          </section>
        </div>
      ) : null}

      {isRequestReviewOpen ? (
        <RequestReviewModal
          role={isCustomer ? "customer" : "studio"}
          projectName={scriptBrief.projectName}
          studioName={scriptBrief.studioName}
          customerName={scriptBrief.customerName}
          onClose={() => setIsRequestReviewOpen(false)}
          onSent={handleReviewRequestSent}
        />
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
        {enabledSubtabLabels.length > 0 ? (
          <nav className="script-subtab-links" aria-label="Script sub-tabs">
            {enabledSubtabLabels.map((tab) => (
              <button type="button" key={tab.id}>
                {tab.label}
              </button>
            ))}
          </nav>
        ) : null}
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

function ScriptActionCluster({
  approvedAt,
  approvedBy,
  isApproved,
  isPreviewing,
  subtabLabel,
  versionLabel,
  onApprove,
  onCopyLink,
  onRequestReview,
  onUnapprove,
}: {
  approvedAt?: string;
  approvedBy?: string;
  isApproved: boolean;
  isPreviewing: boolean;
  subtabLabel: string;
  versionLabel: string;
  onApprove: () => void;
  onCopyLink: () => void;
  onRequestReview: () => void;
  onUnapprove: () => void;
}) {
  const targetLabel = `${subtabLabel} ${versionLabel}`;
  const disabledTooltip = "Return to current to approve or share.";
  const copyTooltip = `Copy link to ${targetLabel}`;
  const reviewTooltip = `Request review of ${targetLabel}`;
  const approveTooltip = `Approve ${targetLabel}`;
  const approvedTooltip = `Approved on ${approvedAt ?? "21 Jun"} by ${approvedBy ?? "Tom"}.`;

  return (
    <div className="share-action-row share-density-compact script-action-cluster" aria-label={`${targetLabel} actions`}>
      <div className="share-action-buttons">
        <button
          aria-label={copyTooltip}
          className="share-button share-button-tertiary script-share-icon-button label-s-semibold"
          data-tooltip={isPreviewing ? disabledTooltip : copyTooltip}
          disabled={isPreviewing}
          type="button"
          onClick={onCopyLink}
        >
          <DsIcon name="link" size={20} />
        </button>
        <button
          className="share-button share-button-secondary label-s-semibold"
          data-tooltip={isPreviewing ? disabledTooltip : reviewTooltip}
          disabled={isPreviewing}
          type="button"
          onClick={onRequestReview}
        >
          Request review
        </button>
        {isApproved && !isPreviewing ? (
          <span className="script-approved-pill-wrap">
            <button className="script-approved-pill label-s-semibold" data-tooltip={approvedTooltip} type="button" onClick={onUnapprove}>
              <DsIcon name="check" size={14} />
              {capitaliseLabel(subtabLabel)} approved
            </button>
            <button className="script-unapprove-link label-xs-semibold" type="button" onClick={onUnapprove}>
              Un-approve
            </button>
          </span>
        ) : (
          <button
            className="share-button share-button-primary label-s-semibold"
            data-tooltip={isPreviewing ? disabledTooltip : approveTooltip}
            disabled={isPreviewing}
            type="button"
            onClick={onApprove}
          >
            <DsIcon name="thumbs-up-like-fill" size={20} />
            Approve
          </button>
        )}
      </div>
    </div>
  );
}

function FloatingSelectionCommentButton({
  state,
  onAi,
  onApply,
  onComment,
}: {
  state: FloatingToolbarState;
  onAi: () => void;
  onApply: (mark: "bold" | "link") => void;
  onComment: () => void;
}) {
  if (!state.visible) {
    return null;
  }

  return (
    <div className="script-floating-toolbar" style={{ left: state.x, top: state.y }} aria-label="Selection actions">
      <button className="script-selection-icon-button label-xs-semibold" type="button" aria-label="Bold" onMouseDown={(event) => event.preventDefault()} onClick={() => onApply("bold")}>
        B
      </button>
      <button className="script-selection-icon-button" type="button" data-tooltip="Link" aria-label="Link" onMouseDown={(event) => event.preventDefault()} onClick={() => onApply("link")}>
        <DsIcon name="link" size={14} />
      </button>
      <button className="script-selection-ai-button label-xs-semibold" type="button" aria-label="Ask AI" onMouseDown={(event) => event.preventDefault()} onClick={onAi}>
        <DsIcon name="chopchop-ai" size={14} />
        AI
      </button>
      <button className="script-selection-comment-button label-xs-semibold" type="button" onMouseDown={(event) => event.preventDefault()} onClick={onComment}>
        <DsIcon name="chat-circle" size={14} />
        Comment
      </button>
    </div>
  );
}

function ScriptHistoryControls({
  onRedo,
  onUndo,
}: {
  onRedo: () => void;
  onUndo: () => void;
}) {
  return (
    <div className="script-history-controls" aria-label="Text history">
      <button className="script-quiet-icon" type="button" data-tooltip="Undo" aria-label="Undo" onClick={onUndo}>
        <DsIcon name="arrow-counter-clockwise" size={12} />
      </button>
      <button className="script-quiet-icon" type="button" data-tooltip="Redo" aria-label="Redo" onClick={onRedo}>
        <DsIcon name="arrow-clockwise" size={12} />
      </button>
    </div>
  );
}

function ScriptColumnHeaders({
  areVisualsVisible,
  onToggleVisuals,
}: {
  areVisualsVisible: boolean;
  onToggleVisuals: () => void;
}) {
  return (
    <div className={`script-column-headers ${areVisualsVisible ? "visuals-visible" : "words-only"}`} aria-label="Script column guidance">
      <section className="script-column-header words">
        <div className="script-column-header-main">
          <h2 className="script-column-title-with-tooltip" data-tooltip="Write the words of your script in this column - could be titles on screen, dialogue, voiceover etc. 150 words = 1 minute.">
            Words
          </h2>
          {!areVisualsVisible ? (
            <Button
              className="script-visuals-header-toggle"
              size="S"
              type="button"
              variant="secondary"
              onClick={onToggleVisuals}
            >
              <span>Show Visuals</span>
              <DsIcon name="caret-right" size={12} />
            </Button>
          ) : null}
        </div>
      </section>
      {areVisualsVisible ? (
        <section className="script-column-header visuals">
          <div className="script-column-header-main">
            <h2 className="script-column-title-with-tooltip" data-tooltip="Describe the visuals for each line. Add media, links or references.">
              Visuals
            </h2>
            <Button
              className="script-visuals-header-toggle"
              size="S"
              type="button"
              variant="secondary"
              onClick={onToggleVisuals}
            >
              <span>Hide Visuals</span>
              <DsIcon name="caret-left" size={12} />
            </Button>
          </div>
        </section>
      ) : null}
    </div>
  );
}

function AvScriptEditor({
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
        const hasComments = rowComments.length > 0;
        const hasUnresolvedComments = rowComments.some((comment) => !comment.resolved);
        const annotationState = !hasComments ? "none" : hasUnresolvedComments ? "unresolved" : "resolved";
        const commentTooltip = hasComments
          ? `${rowComments.length} ${rowComments.length === 1 ? "comment" : "comments"}`
          : `Add comment for ${getRowLabel(row.id, editorRows)}`;
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
                <button
                  className="script-row-drag-button"
                  type="button"
                  draggable
                  aria-label={`Drag ${getRowLabel(row.id, editorRows)}`}
                  onClick={(event) => event.preventDefault()}
                  onDragStart={(event) => {
                    event.dataTransfer.effectAllowed = "move";
                    onDragStartRow(row.id);
                  }}
                >
                  <DsIcon name="dots-six-vertical" size={16} />
                </button>
              </span>
            </div>
            <div className="script-row-words">
              {selectionHighlightRanges.length > 0 ? (
                <SelectionHighlightOverlay ranges={selectionHighlightRanges} words={row.words} />
              ) : null}
              <textarea
                className="script-cell-input words label-s"
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
              <span className="script-row-menu-wrap script-row-action-menu-wrap">
                <button
                  className="script-row-menu-button"
                  type="button"
                  aria-label={`Open menu for ${getRowLabel(row.id, editorRows)}`}
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
              <button
                className={`script-annotation-pin ${annotationState}`}
                type="button"
                aria-label={`${commentTooltip}${hasComments ? ` for ${getRowLabel(row.id, editorRows)}` : ""}`}
                data-comment-count={rowComments.length}
                data-tooltip={commentTooltip}
                onMouseDown={(event) => event.preventDefault()}
                onClick={(event) => onOpenRowAnnotation(rowUniversalAnchor, event.currentTarget.getBoundingClientRect())}
              >
                <DsIcon name="chat-circle" size={16} />
                <CommentCountBadge
                  count={rowComments.length}
                  label={`${rowComments.length} ${rowComments.length === 1 ? "comment" : "comments"}`}
                />
              </button>
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
  return (
    <div className="script-media-menu-wrap script-visual-empty-wrap">
      <button
        className="script-media-add script-visual-empty"
        type="button"
        aria-label={`Add visual to ${getRowLabel(row.id, rows)}`}
        aria-expanded={isOpen}
        onClick={() => (isApproved ? onGuardApproved() : onSetMediaMenuRow(isOpen ? null : row.id))}
      >
        <DsIcon name="plus" size={14} />
      </button>
      {isOpen ? (
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

function VersionsPanel({
  entries,
  isCustomer,
  lastSavedAt,
  previewVersionId,
  saveState,
  selectedVersionId,
  versionMetaById,
  versions,
  onViewVersion,
}: {
  entries: DocHistoryEntry[];
  isCustomer: boolean;
  lastSavedAt: Date;
  previewVersionId: string | null;
  saveState: "Saved" | "Saving...";
  selectedVersionId: string;
  versionMetaById: Record<string, ScriptVersionMeta>;
  versions: ScriptVersion[];
  onViewVersion: (versionId: string) => void;
}) {
  const [expandedVersionId, setExpandedVersionId] = useState<string | null>(null);

  const viewVersion = (versionId: string, isCurrent: boolean) => {
    if (!isCurrent) {
      onViewVersion(versionId);
    }
  };

  return (
    <aside className="script-versions-panel" aria-label="Versions">
      <div className="script-versions-panel-content">
        {!isCustomer ? (
          <section className="script-versions-section" aria-label="Today">
            <h3 className="label-xs-semibold">Today</h3>
            {entries.length > 0 ? (
              <div className="script-version-activity-list">
                {entries.map((entry) => (
                  <article className="script-version-activity-entry" key={entry.id}>
                    <span className="avatar mini">T</span>
                    <span className="script-version-activity-copy label-s-semibold">
                      {entry.title} · <span>{entry.time}</span>
                    </span>
                  </article>
                ))}
              </div>
            ) : (
              <p className="script-version-empty label-s">No edits in this session yet.</p>
            )}
          </section>
        ) : null}

        <section className="script-versions-section" aria-label="Saved versions">
          <h3 className="label-xs-semibold">Versions</h3>
          <div className="script-version-list">
            {[...versions].reverse().map((version) => {
              const isCurrent = version.id === selectedVersionId;
              const isPreviewing = version.id === previewVersionId;
              const versionMeta = versionMetaById[version.id] ?? defaultVersionMeta;
              const isExpanded = expandedVersionId === version.id;
              const versionTitle = getVersionHistoryTitle(version, versionMeta);
              const versionStateLine = getVersionStateLine({
                isCurrent,
                isSaving: saveState === "Saving...",
                lastSavedAt,
                version,
                versionMeta,
              });
              const auditGroups = groupVersionAuditEntriesByDay(getVersionAuditEntries(version, versionMeta));
              const rowCopy = (
                <span className="script-version-row-copy">
                  <strong className="label-s-semibold" title={versionTitle}>
                    {versionTitle}
                  </strong>
                  <span className={`script-version-row-meta label-s ${versionStateLine.tone}`}>
                    <DsIcon name={versionStateLine.icon} size={12} />
                    <span>{versionStateLine.text}</span>
                  </span>
                </span>
              );
              const expansionId = `script-version-history-${version.id}`;

              return (
                <article
                  className={`script-version-row ${isCurrent ? "current" : ""} ${isPreviewing ? "previewing" : ""} ${isExpanded ? "expanded" : ""}`}
                  aria-current={isCurrent ? "true" : undefined}
                  key={version.id}
                >
                  <div className="script-version-row-main">
                    {!isCustomer && !isCurrent ? (
                      <button className="script-version-row-body" type="button" onClick={() => viewVersion(version.id, isCurrent)}>
                        {rowCopy}
                      </button>
                    ) : (
                      <span className="script-version-row-body">{rowCopy}</span>
                    )}
                    <span className="script-version-row-side">
                      {!isCustomer ? (
                        <button
                          className="script-version-row-expand-button"
                          type="button"
                          aria-controls={expansionId}
                          aria-expanded={isExpanded}
                          aria-label={`${isExpanded ? "Collapse" : "Expand"} history for ${versionTitle}`}
                          onClick={() => {
                            setExpandedVersionId(isExpanded ? null : version.id);
                          }}
                        >
                          <DsIcon name="caret-down" size={16} />
                        </button>
                      ) : null}
                      {isCurrent ? <span className="script-doc-version-current label-xs-semibold">Current</span> : null}
                    </span>
                  </div>
                  {!isCustomer && isExpanded ? (
                    <ol className="script-version-history" id={expansionId}>
                      {auditGroups.map((group) => (
                        <li className="script-version-history-day" key={`${version.id}-${group.date}`}>
                          <span className="script-version-history-day-label">{group.date.toUpperCase()}</span>
                          <ol className="script-version-history-day-entries">
                            {group.entries.map((entry) => (
                              <li className="script-version-history-entry" key={`${version.id}-${entry.date}-${entry.time}-${entry.action}`}>
                                <span className="script-version-history-time">{entry.time}</span>
                                <span className="script-version-history-action">{entry.action}</span>
                              </li>
                            ))}
                          </ol>
                        </li>
                      ))}
                    </ol>
                  ) : null}
                </article>
              );
            })}
          </div>
        </section>
      </div>
    </aside>
  );
}

function groupVersionAuditEntriesByDay(entries: VersionAuditEntry[]): { date: string; entries: VersionAuditEntry[] }[] {
  const groups: { date: string; entries: VersionAuditEntry[] }[] = [];

  entries.forEach((entry) => {
    const currentGroup = groups[groups.length - 1];
    if (currentGroup?.date === entry.date) {
      currentGroup.entries.push(entry);
      return;
    }

    groups.push({
      date: entry.date,
      entries: [entry],
    });
  });

  return groups;
}

function VersionPreviewBanner({
  version,
  versionMeta,
  onRestore,
  onReturn,
}: {
  version: ScriptVersion;
  versionMeta: ScriptVersionMeta;
  onRestore: () => void;
  onReturn: () => void;
}) {
  return (
    <div className="script-version-preview-banner" role="status">
      <span className="label-s-semibold">Viewing {getVersionButtonLabel(version, versionMeta)}</span>
      <button className="label-xs-semibold" type="button" onClick={onReturn}>
        Return to current
      </button>
      <button className="label-xs-semibold" type="button" onClick={onRestore}>
        Restore this version
      </button>
    </div>
  );
}
function cloneVersions(versions: ScriptVersion[]) {
  const currentApprovedVersionId = [...versions].reverse().find((version) => version.approvedSnapshot)?.id;

  return versions.map((version) => ({
    ...version,
    approvedSnapshot: version.id === currentApprovedVersionId,
    approvedBy: version.id === currentApprovedVersionId ? version.approvedBy : undefined,
    approvedAt: version.id === currentApprovedVersionId ? version.approvedAt : undefined,
    rows: cloneRows(version.rows),
  }));
}

function createDocHistoryEntry(entry: Omit<DocHistoryEntry, "id">, index: number): DocHistoryEntry {
  return {
    ...entry,
    id: `doc-history-${Date.now()}-${index}`,
  };
}

function createInitialVersionMeta(versions: ScriptVersion[], masterVersionId: string) {
  return versions.reduce<Record<string, ScriptVersionMeta>>((metaById, version) => {
    metaById[version.id] = {
      isMaster: version.id === masterVersionId,
      latestAction: getInitialVersionLatestAction(version),
    };

    return metaById;
  }, {});
}

function getInitialVersionLatestAction(version: ScriptVersion): VersionLatestAction {
  if (version.id === "v1") {
    return {
      kind: "commented",
      actor: "Customer",
      count: 3,
      date: version.approvedAt ?? version.createdAt,
    };
  }

  if (version.id === "v2") {
    return {
      kind: "shared",
      target: "Customer",
      date: version.approvedAt ?? version.createdAt,
    };
  }

  return {
    kind: "edited",
    time: "12:31pm",
  };
}

function getVersionStateLine({
  isCurrent,
  isSaving,
  lastSavedAt,
  version,
  versionMeta,
}: {
  isCurrent: boolean;
  isSaving: boolean;
  lastSavedAt: Date;
  version: ScriptVersion;
  versionMeta: ScriptVersionMeta;
}): VersionStateLine {
  if (version.approvedSnapshot) {
    return {
      icon: "check",
      text: `Approved · ${version.approvedAt ?? version.createdAt}`,
      tone: "approved",
    };
  }

  if (isCurrent) {
    return isSaving
      ? {
          icon: "pencil-simple",
          text: "Editing · Just now",
          tone: "muted",
        }
      : {
          icon: "pencil-simple",
          text: `Last edit · ${formatSavedTime(lastSavedAt)}`,
          tone: "muted",
        };
  }

  const latestAction = versionMeta.latestAction ?? {
    kind: "edited",
    time: version.createdAt,
  };

  switch (latestAction.kind) {
    case "shared":
      return {
        icon: "link",
        text: `Shared with ${latestAction.target} · ${latestAction.date}`,
        tone: "muted",
      };
    case "viewed":
      return {
        icon: "eye",
        text: `Viewed by ${latestAction.actor} · ${latestAction.date}`,
        tone: "muted",
      };
    case "commented":
      return {
        icon: "chat-circle",
        text: `${latestAction.count} ${latestAction.count === 1 ? "comment" : "comments"} from ${latestAction.actor} · ${latestAction.date}`,
        tone: "attention",
      };
    case "silent":
      return {
        icon: "arrows-clockwise",
        text: `Shared ${latestAction.date} · no response`,
        tone: "quiet",
      };
    case "edited":
      return {
        icon: "pencil-simple",
        text: `Last edit · ${latestAction.time}`,
        tone: "muted",
      };
  }
}

function getVersionAuditEntries(version: ScriptVersion, versionMeta: ScriptVersionMeta): VersionAuditEntry[] {
  const label = getVersionHistoryBaseTitle(version);
  const createdAction =
    version.id === "v1"
      ? "Tom created v1"
      : version.id === "v2"
        ? "Tom created v2 from v1"
        : version.id === "v3"
          ? "Tom created v3 from v2"
          : `Tom created ${label}`;
  const entries: VersionAuditEntry[] = [
    {
      date: version.createdAt,
      time: "9:12am",
      action: createdAction,
    },
  ];

  if (version.id === "v1") {
    entries.push(
      {
        date: version.createdAt,
        time: "10:04am",
        action: "Tom shared with Customer",
      },
      {
        date: version.createdAt,
        time: "11:18am",
        action: "Viewed by Customer",
      },
      {
        date: version.createdAt,
        time: "12:05pm",
        action: "3 comments from Customer",
      },
      {
        date: version.createdAt,
        time: "12:42pm",
        action: "Tom replied to 2 comments",
      },
    );
  }

  if (version.id === "v2") {
    entries.push(
      {
        date: version.createdAt,
        time: "10:21am",
        action: "Tom edited rows 04, 07, 12",
      },
      {
        date: version.createdAt,
        time: "11:03am",
        action: "Tom shared with Customer",
      },
    );
  }

  if (version.id === "v3") {
    entries.push(
      {
        date: version.createdAt,
        time: "9:46am",
        action: "Tom edited rows 04, 05",
      },
      {
        date: version.createdAt,
        time: "12:31pm",
        action: "Tom renamed to 'Master'",
      },
    );
  }

  const latestAction = versionMeta.latestAction;

  if (latestAction?.kind === "shared" && !entries.some((entry) => entry.action === `Tom shared with ${latestAction.target}`)) {
    entries.push({
      date: latestAction.date,
      time: "11:03am",
      action: `Tom shared with ${latestAction.target}`,
    });
  }

  if (latestAction?.kind === "commented" && !entries.some((entry) => entry.action.includes(`comments from ${latestAction.actor}`))) {
    entries.push({
      date: latestAction.date,
      time: "12:05pm",
      action: `${latestAction.count} ${latestAction.count === 1 ? "comment" : "comments"} from ${latestAction.actor}`,
    });
  }

  if (version.approvedSnapshot) {
    entries.push({
      date: version.approvedAt ?? version.createdAt,
      time: "4:39pm",
      action: `Tom approved ${label}`,
    });
  }

  return entries;
}

function getVersionMarkerText(version: ScriptVersion, versionMeta: ScriptVersionMeta) {
  if (version.approvedSnapshot) {
    return "Approved";
  }

  if (versionMeta.isMaster) {
    return "Master";
  }

  return "";
}

function getVersionButtonLabel(version: ScriptVersion, versionMeta: ScriptVersionMeta) {
  if (version.displayName) {
    return version.displayName;
  }

  const markerText = getVersionMarkerText(version, versionMeta);

  return markerText ? `${version.label} - ${markerText}` : version.label;
}

function getVersionHistoryTitle(version: ScriptVersion, versionMeta: ScriptVersionMeta) {
  if (version.displayName) {
    return version.displayName;
  }

  const markerText = getVersionMarkerText(version, versionMeta);

  return markerText ? `${getVersionHistoryBaseTitle(version)} - ${markerText}` : getVersionHistoryBaseTitle(version);
}

function getVersionHistoryBaseTitle(version: ScriptVersion) {
  if (version.displayName) {
    return version.displayName;
  }

  return version.snapshotName
    .replace(/^Script\s+/iu, "")
    .replace(/\s-\s(?:Current|Master|Internal|Studio approved|Customer approved|Approved|approved)$/iu, "");
}

function getNextVersionLabel(versions: ScriptVersion[]) {
  const highestVersionNumber = versions.reduce((highestNumber, version) => {
    const versionNumber = Number.parseInt(version.label.replace(/^v/u, ""), 10);
    return Number.isNaN(versionNumber) ? highestNumber : Math.max(highestNumber, versionNumber);
  }, 0);

  return `v${highestVersionNumber + 1}`;
}

function capitaliseLabel(label: string) {
  return label.charAt(0).toUpperCase() + label.slice(1);
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
    anchor: {
      ...comment.anchor,
      range: comment.anchor.range ? { ...comment.anchor.range } : undefined,
    },
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

function getTrimmedSelection(target: HTMLTextAreaElement) {
  const rawStart = target.selectionStart;
  const rawEnd = target.selectionEnd;
  const rawSelection = target.value.slice(rawStart, rawEnd);
  const text = rawSelection.trim();

  if (!text) {
    return null;
  }

  const leadingTrimLength = rawSelection.length - rawSelection.trimStart().length;
  const trailingTrimLength = rawSelection.length - rawSelection.trimEnd().length;

  return {
    end: rawEnd - trailingTrimLength,
    start: rawStart + leadingTrimLength,
    text,
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

function createRowsFromAiDrafts(draftRows: ScriptAiRowDraft[], baseIndex = 0): ScriptRow[] {
  return draftRows.map((draftRow, index) => ({
    ...createEmptyRow(baseIndex + index + 1),
    words: draftRow.words,
    visuals: draftRow.visuals,
  }));
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

function truncateText(value: string, maxLength: number) {
  return value.length > maxLength ? `${value.slice(0, maxLength - 3)}...` : value;
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
  const shouldFlipBelow = rect.top < 56;

  return {
    x: Math.min(window.innerWidth - 16, Math.max(16, rect.left + rect.width / 2)),
    y: shouldFlipBelow ? rect.bottom + 8 : rect.top - 40,
  };
}

function getFloatingCommentPosition(rect: DOMRect): FloatingCommentPosition {
  const shellWidth = 360;
  const shellHeight = 460;
  const viewportPadding = 16;
  const triggerGap = 12;
  const preferredLeft = rect.right + triggerGap;
  const hasRoomRight = preferredLeft + shellWidth <= window.innerWidth - viewportPadding;
  const left = hasRoomRight
    ? preferredLeft
    : Math.max(viewportPadding, rect.left - shellWidth - triggerGap);
  const top = Math.min(
    Math.max(viewportPadding, rect.top - viewportPadding),
    Math.max(viewportPadding, window.innerHeight - shellHeight - viewportPadding),
  );

  return { left, top };
}

function formatSnapshotDate(date: Date) {
  return new Intl.DateTimeFormat("en-AU", { day: "2-digit", month: "short" }).format(date);
}

function formatSavedTime(date: Date) {
  return new Intl.DateTimeFormat("en-AU", { hour: "numeric", minute: "2-digit", hour12: true, timeZone: "Australia/Sydney" })
    .format(date)
    .toLowerCase()
    .replace(/\s(am|pm)$/u, "$1");
}

function formatFooterDuration(totalSeconds: number) {
  const safeSeconds = Math.max(0, Math.ceil(totalSeconds));
  const minutes = Math.floor(safeSeconds / 60);
  const seconds = safeSeconds % 60;

  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

function formatFooterDelta(secondsDelta: number, wordsDelta: number) {
  const direction = secondsDelta >= 0 ? "over" : "under";
  const absoluteSecondsDelta = Math.abs(secondsDelta);

  if (absoluteSecondsDelta < 30) {
    return `${absoluteSecondsDelta}s ${direction}`;
  }

  return `${Math.round(Math.abs(wordsDelta))} words ${direction}`;
}
