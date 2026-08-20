"use client";

import type {
  CSSProperties,
  MouseEvent as ReactMouseEvent,
  PointerEvent as ReactPointerEvent,
  UIEvent as ReactUIEvent,
} from "react";
import { useEffect, useMemo, useRef, useState } from "react";

export type RoleVideoColumnConfig<ColumnKey extends string> = Record<
  ColumnKey,
  { label: string; width: number }
>;

export type RoleVideoColumnDragState<ColumnKey extends string> = {
  columnKey: ColumnKey;
  dropIndex: number;
  pointerId: number;
  startX: number;
  currentX: number;
  isDragging: boolean;
  originLeft: number;
  originTop: number;
  originWidth: number;
  originHeight: number;
  tableTop: number;
  tableHeight: number;
};

export type RoleVideoColumnContextMenuState<ColumnKey extends string> = {
  columnKey: ColumnKey;
  x: number;
  y: number;
};

export type RoleVideoColumnSettlingGhostState = {
  label: string;
  startLeft: number;
  endLeft: number;
  top: number;
  width: number;
  height: number;
};

type StoredColumnState<ColumnKey extends string> = {
  order: ColumnKey[];
  hidden: ColumnKey[];
};

type UseRoleVideoTableOptions<ColumnKey extends string, PrimaryColumnKey extends string> = {
  allowColumnHiding?: boolean;
  columnConfig: RoleVideoColumnConfig<ColumnKey>;
  defaultHiddenColumns?: readonly ColumnKey[];
  defaultOrder: readonly ColumnKey[];
  minimumVisibleColumns?: number;
  primaryColumnKey: PrimaryColumnKey;
  primaryColumnWidth: number;
  storageKey: string;
};

export function useRoleVideoTable<ColumnKey extends string, PrimaryColumnKey extends string>({
  allowColumnHiding = true,
  columnConfig,
  defaultHiddenColumns = [],
  defaultOrder,
  minimumVisibleColumns = 1,
  primaryColumnKey,
  primaryColumnWidth,
  storageKey,
}: UseRoleVideoTableOptions<ColumnKey, PrimaryColumnKey>) {
  type TableColumnKey = PrimaryColumnKey | ColumnKey;

  const [columnOrder, setColumnOrder] = useState<ColumnKey[]>(() => [...defaultOrder]);
  const [hiddenColumns, setHiddenColumns] = useState<ColumnKey[]>(() => [...defaultHiddenColumns]);
  const [hasLoadedColumns, setHasLoadedColumns] = useState(false);
  const [isColumnMenuOpen, setIsColumnMenuOpen] = useState(false);
  const [isTableScrolledX, setIsTableScrolledX] = useState(false);
  const [columnDrag, setColumnDrag] = useState<RoleVideoColumnDragState<ColumnKey> | null>(null);
  const [settlingGhost, setSettlingGhost] = useState<RoleVideoColumnSettlingGhostState | null>(null);
  const [droppedColumn, setDroppedColumn] = useState<ColumnKey | null>(null);
  const [columnContextMenu, setColumnContextMenu] = useState<RoleVideoColumnContextMenuState<ColumnKey> | null>(null);
  const headerRefs = useRef<Partial<Record<TableColumnKey, HTMLTableCellElement>>>({});
  const tableScrollRef = useRef<HTMLDivElement>(null);

  const validColumns = useMemo(() => new Set(defaultOrder), [defaultOrder]);
  const visibleDataColumns = useMemo(
    () => columnOrder.filter((columnKey) => !hiddenColumns.includes(columnKey)),
    [columnOrder, hiddenColumns],
  );
  const visibleTableColumns = useMemo<TableColumnKey[]>(
    () => [primaryColumnKey, ...visibleDataColumns],
    [primaryColumnKey, visibleDataColumns],
  );
  const tableMinWidth = useMemo(
    () => primaryColumnWidth + visibleDataColumns.reduce((total, columnKey) => total + columnConfig[columnKey].width, 0),
    [columnConfig, primaryColumnWidth, visibleDataColumns],
  );
  const draggedColumn = columnDrag?.isDragging ? columnDrag.columnKey : null;
  const dropIndicatorStyle = useMemo(
    () => getDropIndicatorStyle(columnDrag, visibleTableColumns, headerRefs.current),
    [columnDrag, visibleTableColumns],
  );

  useEffect(() => {
    const storedValue = window.localStorage.getItem(storageKey);

    if (!storedValue) {
      setHasLoadedColumns(true);
      return;
    }

    try {
      const parsedValue = JSON.parse(storedValue) as unknown;

      if (Array.isArray(parsedValue)) {
        setColumnOrder(normaliseColumnOrder(parsedValue, defaultOrder, validColumns));
      } else if (isStoredColumnState<ColumnKey>(parsedValue)) {
        setColumnOrder(normaliseColumnOrder(parsedValue.order, defaultOrder, validColumns));
        setHiddenColumns(allowColumnHiding ? normaliseHiddenColumns(parsedValue.hidden, validColumns) : []);
      }
    } catch {
      window.localStorage.removeItem(storageKey);
    } finally {
      setHasLoadedColumns(true);
    }
  }, [allowColumnHiding, defaultOrder, storageKey, validColumns]);

  useEffect(() => {
    if (!hasLoadedColumns) return;

    window.localStorage.setItem(
      storageKey,
      JSON.stringify({ order: columnOrder, hidden: hiddenColumns } satisfies StoredColumnState<ColumnKey>),
    );
  }, [columnOrder, hasLoadedColumns, hiddenColumns, storageKey]);

  useEffect(() => {
    if (!droppedColumn) return;
    const timeoutId = window.setTimeout(() => setDroppedColumn(null), 300);
    return () => window.clearTimeout(timeoutId);
  }, [droppedColumn]);

  const moveColumnToIndex = (draggedColumnKey: ColumnKey, targetIndex: number) => {
    setColumnOrder((current) => {
      if (!current.includes(draggedColumnKey)) return current;

      const currentVisibleOrder = current.filter((columnKey) => !hiddenColumns.includes(columnKey));
      const nextVisibleOrder = currentVisibleOrder.filter((columnKey) => columnKey !== draggedColumnKey);
      const currentIndex = currentVisibleOrder.indexOf(draggedColumnKey);
      const targetDataIndex = targetIndex - 1;
      const adjustedTargetIndex = currentIndex < targetDataIndex ? targetDataIndex - 1 : targetDataIndex;
      const boundedTargetIndex = Math.max(0, Math.min(adjustedTargetIndex, nextVisibleOrder.length));

      nextVisibleOrder.splice(boundedTargetIndex, 0, draggedColumnKey);

      return [
        ...nextVisibleOrder,
        ...current.filter((columnKey) => hiddenColumns.includes(columnKey)),
      ];
    });
  };

  useEffect(() => {
    if (!columnDrag) return;

    const handlePointerMove = (event: PointerEvent) => {
      setColumnDrag((current) => {
        if (!current || event.pointerId !== current.pointerId) return current;

        return {
          ...current,
          currentX: event.clientX,
          dropIndex: getDropIndexFromPointer(event.clientX, visibleTableColumns, headerRefs.current, primaryColumnKey),
          isDragging: true,
        };
      });
    };

    const finishDrag = (event: PointerEvent, isCancelled: boolean) => {
      if (event.pointerId !== columnDrag.pointerId) return;

      const isValidDrop = !isCancelled && columnDrag.isDragging && isPointerInsideElement(event, tableScrollRef.current);
      const targetLeft = isValidDrop
        ? getDropLeft(columnDrag.dropIndex, visibleTableColumns, headerRefs.current) ?? columnDrag.originLeft
        : columnDrag.originLeft;

      settleColumnGhost(columnDrag, targetLeft, columnConfig, setSettlingGhost);

      if (isValidDrop) {
        moveColumnToIndex(columnDrag.columnKey, columnDrag.dropIndex);
        setDroppedColumn(columnDrag.columnKey);
      }

      setColumnDrag(null);
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      settleColumnGhost(columnDrag, columnDrag.originLeft, columnConfig, setSettlingGhost);
      setColumnDrag(null);
    };

    const handlePointerUp = (event: PointerEvent) => finishDrag(event, false);
    const handlePointerCancel = (event: PointerEvent) => finishDrag(event, true);

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
    window.addEventListener("pointercancel", handlePointerCancel);
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
      window.removeEventListener("pointercancel", handlePointerCancel);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [columnConfig, columnDrag, hiddenColumns, primaryColumnKey, visibleTableColumns]);

  const moveColumnByStep = (columnKey: ColumnKey, step: -1 | 1) => {
    setColumnOrder((current) => {
      const visibleOrder = current.filter((currentColumnKey) => !hiddenColumns.includes(currentColumnKey));
      const currentIndex = visibleOrder.indexOf(columnKey);
      const nextIndex = currentIndex + step;

      if (currentIndex === -1 || nextIndex < 0 || nextIndex >= visibleOrder.length) return current;

      const nextVisibleOrder = [...visibleOrder];
      nextVisibleOrder.splice(currentIndex, 1);
      nextVisibleOrder.splice(nextIndex, 0, columnKey);

      return [
        ...nextVisibleOrder,
        ...current.filter((currentColumnKey) => hiddenColumns.includes(currentColumnKey)),
      ];
    });
    setDroppedColumn(columnKey);
  };

  const pinColumn = (columnKey: ColumnKey) => {
    moveColumnToIndex(columnKey, 1);
    setDroppedColumn(columnKey);
  };

  const hideColumn = (columnKey: ColumnKey) => {
    if (!allowColumnHiding || visibleDataColumns.length <= minimumVisibleColumns) return;
    setHiddenColumns((current) => (current.includes(columnKey) ? current : [...current, columnKey]));
    setColumnContextMenu(null);
  };

  const toggleColumnVisibility = (columnKey: ColumnKey) => {
    if (!allowColumnHiding) return;
    const isHidden = hiddenColumns.includes(columnKey);
    if (!isHidden && visibleDataColumns.length <= minimumVisibleColumns) return;
    setHiddenColumns((current) =>
      isHidden ? current.filter((currentColumnKey) => currentColumnKey !== columnKey) : [...current, columnKey],
    );
  };

  const resetColumns = () => {
    setColumnOrder([...defaultOrder]);
    setHiddenColumns([...defaultHiddenColumns]);
  };

  const handleTableScroll = (event: ReactUIEvent<HTMLDivElement>) => {
    setIsTableScrolledX(event.currentTarget.scrollLeft > 0);
  };

  const handleColumnPointerDown = (event: ReactPointerEvent<HTMLTableCellElement>, columnKey: ColumnKey) => {
    if (event.button !== 0 || columnContextMenu) return;

    event.currentTarget.setPointerCapture(event.pointerId);
    const headerRect = event.currentTarget.getBoundingClientRect();
    const tableRect = tableScrollRef.current?.getBoundingClientRect() ?? headerRect;

    setColumnContextMenu(null);
    setColumnDrag({
      columnKey,
      currentX: event.clientX,
      dropIndex: getDropIndexFromPointer(event.clientX, visibleTableColumns, headerRefs.current, primaryColumnKey),
      pointerId: event.pointerId,
      startX: event.clientX,
      isDragging: true,
      originLeft: headerRect.left,
      originTop: headerRect.top,
      originWidth: headerRect.width,
      originHeight: headerRect.height,
      tableTop: tableRect.top,
      tableHeight: tableRect.height,
    });
  };

  const handleColumnContextMenu = (event: ReactMouseEvent<HTMLTableCellElement>, columnKey: ColumnKey) => {
    event.preventDefault();
    setColumnContextMenu({ columnKey, x: event.clientX, y: event.clientY });
  };

  const getColumnWidth = (columnKey: TableColumnKey) =>
    columnKey === primaryColumnKey ? primaryColumnWidth : columnConfig[columnKey as ColumnKey].width;

  const getColumnShiftDirectionFor = (columnKey: TableColumnKey) =>
    getColumnShiftDirection(columnKey, visibleTableColumns, columnDrag, primaryColumnKey);

  return {
    columnContextMenu,
    columnDrag,
    columnOrder,
    draggedColumn,
    droppedColumn,
    dropIndicatorStyle,
    getColumnShiftDirection: getColumnShiftDirectionFor,
    getColumnWidth,
    handleColumnContextMenu,
    handleColumnPointerDown,
    handleTableScroll,
    headerRefs,
    hiddenColumns,
    hideColumn,
    isColumnMenuOpen,
    isTableScrolledX,
    moveColumnByStep,
    pinColumn,
    resetColumns,
    setColumnContextMenu,
    setIsColumnMenuOpen,
    settlingGhost,
    tableMinWidth,
    tableScrollRef,
    toggleColumnVisibility,
    visibleDataColumns,
    visibleTableColumns,
  };
}

function normaliseColumnOrder<ColumnKey extends string>(
  value: unknown,
  defaultOrder: readonly ColumnKey[],
  validColumns: Set<ColumnKey>,
) {
  if (!Array.isArray(value)) return [...defaultOrder];

  const validOrder = value.filter(
    (columnKey): columnKey is ColumnKey => typeof columnKey === "string" && validColumns.has(columnKey as ColumnKey),
  );
  const dedupedOrder = Array.from(new Set(validOrder));
  const missingColumns = defaultOrder.filter((columnKey) => !dedupedOrder.includes(columnKey));
  return [...dedupedOrder, ...missingColumns];
}

function normaliseHiddenColumns<ColumnKey extends string>(value: unknown, validColumns: Set<ColumnKey>) {
  if (!Array.isArray(value)) return [];
  return Array.from(new Set(value.filter(
    (columnKey): columnKey is ColumnKey => typeof columnKey === "string" && validColumns.has(columnKey as ColumnKey),
  )));
}

function isStoredColumnState<ColumnKey extends string>(value: unknown): value is StoredColumnState<ColumnKey> {
  if (!value || typeof value !== "object") return false;
  const possibleState = value as Partial<StoredColumnState<ColumnKey>>;
  return Array.isArray(possibleState.order) && Array.isArray(possibleState.hidden);
}

function getDropIndexFromPointer<ColumnKey extends string, PrimaryColumnKey extends string>(
  pointerX: number,
  visibleColumns: Array<PrimaryColumnKey | ColumnKey>,
  headerElements: Partial<Record<PrimaryColumnKey | ColumnKey, HTMLTableCellElement>>,
  primaryColumnKey: PrimaryColumnKey,
) {
  const candidateColumns = visibleColumns.filter((columnKey): columnKey is ColumnKey => columnKey !== primaryColumnKey);

  for (const columnKey of candidateColumns) {
    const element = headerElements[columnKey];
    if (!element) continue;
    const rect = element.getBoundingClientRect();
    if (pointerX < rect.left + rect.width / 2) return Math.max(1, visibleColumns.indexOf(columnKey));
  }

  return visibleColumns.length;
}

function getColumnShiftDirection<ColumnKey extends string, PrimaryColumnKey extends string>(
  columnKey: PrimaryColumnKey | ColumnKey,
  visibleColumns: Array<PrimaryColumnKey | ColumnKey>,
  columnDrag: RoleVideoColumnDragState<ColumnKey> | null,
  primaryColumnKey: PrimaryColumnKey,
) {
  if (!columnDrag?.isDragging || columnKey === primaryColumnKey || columnKey === columnDrag.columnKey) return null;

  const originIndex = visibleColumns.indexOf(columnDrag.columnKey);
  const currentIndex = visibleColumns.indexOf(columnKey);
  if (originIndex === -1 || currentIndex === -1) return null;
  if (columnDrag.dropIndex > originIndex && currentIndex > originIndex && currentIndex < columnDrag.dropIndex) return "left" as const;
  if (columnDrag.dropIndex < originIndex && currentIndex >= columnDrag.dropIndex && currentIndex < originIndex) return "right" as const;
  return null;
}

function getDropIndicatorStyle<ColumnKey extends string, PrimaryColumnKey extends string>(
  columnDrag: RoleVideoColumnDragState<ColumnKey> | null,
  visibleColumns: Array<PrimaryColumnKey | ColumnKey>,
  headerElements: Partial<Record<PrimaryColumnKey | ColumnKey, HTMLTableCellElement>>,
) {
  if (!columnDrag?.isDragging) return null;

  const dropIndex = Math.max(1, Math.min(columnDrag.dropIndex, visibleColumns.length - 1));
  const targetColumn = visibleColumns[dropIndex];
  const previousColumn = visibleColumns[dropIndex - 1];
  const targetRect = targetColumn ? headerElements[targetColumn]?.getBoundingClientRect() : null;
  const previousRect = previousColumn ? headerElements[previousColumn]?.getBoundingClientRect() : null;
  const left = targetRect?.left ?? previousRect?.right;
  if (left === undefined) return null;
  return { left, top: columnDrag.tableTop, height: columnDrag.tableHeight } as CSSProperties;
}

function getDropLeft<ColumnKey extends string, PrimaryColumnKey extends string>(
  dropIndex: number,
  visibleColumns: Array<PrimaryColumnKey | ColumnKey>,
  headerElements: Partial<Record<PrimaryColumnKey | ColumnKey, HTMLTableCellElement>>,
) {
  const boundedDropIndex = Math.max(1, Math.min(dropIndex, visibleColumns.length - 1));
  const targetColumn = visibleColumns[boundedDropIndex];
  const previousColumn = visibleColumns[boundedDropIndex - 1];
  return targetColumn
    ? headerElements[targetColumn]?.getBoundingClientRect().left
    : previousColumn
      ? headerElements[previousColumn]?.getBoundingClientRect().right
      : undefined;
}

function settleColumnGhost<ColumnKey extends string>(
  columnDrag: RoleVideoColumnDragState<ColumnKey>,
  endLeft: number,
  columnConfig: RoleVideoColumnConfig<ColumnKey>,
  setSettlingGhost: (state: RoleVideoColumnSettlingGhostState | null) => void,
) {
  setSettlingGhost({
    label: columnConfig[columnDrag.columnKey].label,
    startLeft: columnDrag.originLeft + columnDrag.currentX - columnDrag.startX,
    endLeft,
    top: columnDrag.originTop,
    width: columnDrag.originWidth,
    height: columnDrag.originHeight,
  });
  window.setTimeout(() => setSettlingGhost(null), 220);
}

function isPointerInsideElement(event: PointerEvent, element: HTMLElement | null) {
  if (!element) return false;
  const rect = element.getBoundingClientRect();
  return event.clientX >= rect.left && event.clientX <= rect.right && event.clientY >= rect.top && event.clientY <= rect.bottom;
}
