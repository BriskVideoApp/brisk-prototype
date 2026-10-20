"use client";

import { useMemo } from "react";
import { BriskSelect, type BriskActionContext } from "../../../Brisk DS/src/app/components/Select";
import { DsIcon, type DsIconName } from "@/components/video-review/DsIcon";
import type { ScriptMediaType } from "@/data/script";

export type ScriptMediaPickerOption<T extends string = string> = {
  value: T;
  label: string;
  icon: DsIconName;
};

export const scriptMediaPickerOptions: Array<ScriptMediaPickerOption<ScriptMediaType>> = [
  { value: "upload", label: "Upload file", icon: "upload-simple" },
  { value: "library", label: "Add from your Media", icon: "play" },
  { value: "stock", label: "Stock footage search", icon: "image-square" },
  { value: "link", label: "Add link", icon: "link" },
];

export function ScriptMediaPicker<T extends string>({
  isOpen,
  options,
  triggerLabel,
  triggerClassName = "",
  triggerIcon = "plus",
  triggerIconSize = 14,
  triggerText,
  triggerTooltip,
  anchorElement,
  hideTrigger = false,
  onOpenChange,
  onSelect,
}: {
  isOpen: boolean;
  options: Array<ScriptMediaPickerOption<T>>;
  triggerLabel: string;
  triggerClassName?: string;
  triggerIcon?: DsIconName | null;
  triggerIconSize?: number;
  triggerText?: string;
  triggerTooltip?: string;
  menuClassName?: string;
  /** A command menu can launch the unchanged picker from a stable opener. */
  anchorElement?: HTMLElement | null;
  hideTrigger?: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onSelect: (value: T) => void;
}) {
  const actionContext = useMemo<BriskActionContext | undefined>(() => {
    if (!hideTrigger || !anchorElement) return undefined;
    return {
      anchor: anchorElement,
      fallbackFocus: anchorElement,
      // Read the opener's current bounds when the shared menu repositions.
      get x() { return anchorElement.getBoundingClientRect().left; },
      get y() { return anchorElement.getBoundingClientRect().bottom; },
    };
  }, [anchorElement, hideTrigger]);

  if (hideTrigger && !actionContext) return null;

  return <div className="script-media-menu-wrap">
    <BriskSelect<T>
      mode="action"
      ariaLabel={triggerLabel}
      value=""
      placeholder={triggerLabel}
      clearable={false}
      open={isOpen}
      onOpenChange={onOpenChange}
      actionContext={actionContext}
      options={options.map((option) => ({ value: option.value, label: option.label }))}
      onChange={(value) => {
        const option = options.find((candidate) => candidate.value === value);
        if (option) onSelect(option.value);
      }}
      actionTrigger={(props) => <button {...props} className={`script-media-add ${triggerClassName}`.trim()} type="button" aria-label={triggerLabel} data-tooltip={triggerTooltip}>
        {triggerIcon ? <DsIcon name={triggerIcon} size={triggerIconSize} /> : null}
        {triggerText ? <span>{triggerText}</span> : null}
      </button>}
    />
  </div>;
}
