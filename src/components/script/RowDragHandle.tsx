"use client";

import type { DragEvent, KeyboardEvent } from "react";
import { DsIcon } from "@/components/video-review/DsIcon";

export function RowDragHandle({
  label,
  onDragEnd,
  onDragStart,
  onKeyDown,
}: {
  label: string;
  onDragEnd?: (event: DragEvent<HTMLButtonElement>) => void;
  onDragStart: (event: DragEvent<HTMLButtonElement>) => void;
  onKeyDown?: (event: KeyboardEvent<HTMLButtonElement>) => void;
}) {
  return (
    <button
      className="script-row-drag-button"
      type="button"
      draggable
      aria-label={label}
      onClick={(event) => event.preventDefault()}
      onDragEnd={onDragEnd}
      onDragStart={onDragStart}
      onKeyDown={onKeyDown}
    >
      <DsIcon name="dots-six-vertical" size={16} />
    </button>
  );
}
