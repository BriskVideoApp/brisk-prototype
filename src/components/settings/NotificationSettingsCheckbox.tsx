"use client";

import { DsIcon } from "@/components/video-review/DsIcon";

export function NotificationSettingsCheckbox({
  checked,
  disabled = false,
  label,
  onChange,
}: {
  checked: boolean;
  disabled?: boolean;
  label: string;
  onChange?: (checked: boolean) => void;
}) {
  return (
    <label className={`notification-settings-checkbox ${disabled ? "is-disabled" : ""}`}>
      <input
        checked={checked}
        disabled={disabled}
        type="checkbox"
        onChange={(event) => onChange?.(event.target.checked)}
      />
      <span className="notification-settings-checkbox-control" aria-hidden="true">
        {checked ? <DsIcon name="check" size={14} /> : null}
      </span>
      <span className="label-s">{label}</span>
    </label>
  );
}
