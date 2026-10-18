"use client";

import { Checkbox } from "../../../Brisk DS/src/app/components/Checkbox";

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
    <Checkbox
      checked={checked}
      disabled={disabled}
      label={label}
      onChange={onChange}
      wrapperClassName="notification-settings-checkbox"
    />
  );
}
