import { type ScriptRow, type ScriptTextMark } from "@/data/script";

export const scriptSurfaceId = "mock-project-script";

export const emptyScriptRowId = "script-empty-row";

export const emptyScriptPlaceholderRow: ScriptRow = {
  id: emptyScriptRowId,
  words: "",
  visuals: "",
  durationSeconds: 0,
  elementType: "action",
  media: [],
};

export type ScriptRowUniversalAnchor = {
  surfaceType: "script";
  surfaceId: string;
  anchorType: "row";
  anchorRef: string;
};

export function getRowNumber(rowId: string, rows: ScriptRow[]) {
  const visibleIndex = rows.filter((row) => !row.deletedMeta).findIndex((row) => row.id === rowId);
  return visibleIndex === -1 ? "00" : String(visibleIndex + 1).padStart(2, "0");
}

export function getRowLabel(rowId: string, rows: ScriptRow[]) {
  return `Row ${getRowNumber(rowId, rows)}`;
}

export function resizeTextAreaToContent(node: HTMLTextAreaElement | null) {
  if (!node) {
    return;
  }

  node.style.height = "auto";
  node.style.height = `${node.scrollHeight}px`;
}

export function normaliseBoldTextMarks(marks: ScriptTextMark[] | undefined, textLength: number) {
  const sortedMarks = (marks ?? [])
    .map((mark) => ({
      ...mark,
      start: Math.max(0, Math.min(mark.start, textLength)),
      end: Math.max(0, Math.min(mark.end, textLength)),
    }))
    .filter((mark) => mark.end > mark.start)
    .sort((first, second) => first.start - second.start);

  return sortedMarks.reduce<ScriptTextMark[]>((mergedMarks, mark) => {
    const previousMark = mergedMarks[mergedMarks.length - 1];

    if (previousMark && mark.start <= previousMark.end) {
      previousMark.end = Math.max(previousMark.end, mark.end);
      return mergedMarks;
    }

    return [...mergedMarks, { ...mark }];
  }, []);
}
