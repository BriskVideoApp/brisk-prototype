"use client";

import { BriskSelect } from "../../../Brisk DS/src/app/components/Select";
import { IconButton } from "../../../Brisk DS/src/app/components/IconButton";
import { DsIcon } from "@/components/video-review/DsIcon";

export function TranscriptClipMenu({
  onCopy,
  onDelete,
  onDownload,
  onHide,
  onRename,
}: {
  onCopy: () => void;
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
      { value: "copy", label: "Copy text" },
      { value: "rename", label: "Rename" },
      { value: "download", label: "Download PDF" },
      { value: "hide", label: "Hide transcript" },
      { value: "delete", label: "Delete", tone: "danger", dividerAbove: true },
    ]}
    onChange={(action) => {
      if (action === "copy") onCopy();
      else if (action === "rename") onRename();
      else if (action === "download") onDownload();
      else if (action === "hide") onHide();
      else if (action === "delete") onDelete();
    }}
    actionTrigger={(triggerProps) => <IconButton
      {...triggerProps}
      type="button"
      aria-label="More transcript actions"
      tooltipAlign="end"
    >
      <DsIcon name="dots-three" size={16} />
    </IconButton>}
  />;
}
