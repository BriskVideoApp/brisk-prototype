"use client";

import { BriskSelect } from "../../../Brisk DS/src/app/components/Select";
import { DsIcon } from "@/components/video-review/DsIcon";

export function TranscriptClipMenu({
  onDelete,
  onDownload,
  onHide,
  onRename,
}: {
  onDelete: () => void;
  onDownload: () => void;
  onHide: () => void;
  onRename: () => void;
}) {
  return <BriskSelect
    mode="action"
    ariaLabel="Transcript actions"
    placeholder="Transcript actions"
    actionMenuSize="compact"
    actionFallbackFocus={(trigger) => trigger?.closest(".transcripts-panel")?.querySelector<HTMLButtonElement>(".transcript-view-toggle button") ?? null}
    className="transcript-action-menu-wrap"
    value=""
    clearable={false}
    options={[
      { value: "rename", label: "Rename" },
      { value: "download", label: "Download PDF" },
      { value: "hide", label: "Hide transcript" },
      { value: "delete", label: "Delete", tone: "danger", dividerAbove: true },
    ]}
    onChange={(action) => {
      if (action === "rename") onRename();
      else if (action === "download") onDownload();
      else if (action === "hide") onHide();
      else if (action === "delete") onDelete();
    }}
    actionTrigger={(triggerProps) => <button
      {...triggerProps}
      className="transcript-quiet-button transcript-overflow-button"
      type="button"
      aria-label="More transcript actions"
    >
      <DsIcon name="dots-three" size={16} />
    </button>}
  />;
}
