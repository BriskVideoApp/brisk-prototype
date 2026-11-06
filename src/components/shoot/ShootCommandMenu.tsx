import type { ReactNode } from "react";
import { BriskSelect, type BriskSelectOption } from "@/components/form/BriskSelect";
import { DsIcon } from "@/components/video-review/DsIcon";
import { Button } from "../../../Brisk DS/src/app/components/Button";
import { IconButton } from "../../../Brisk DS/src/app/components/IconButton";

// Keep Shoot callbacks at their call sites while the DS owns all menu behaviour.
export function ShootCommandMenu({ label, actions, trigger, variant = "ghost", align, open, onOpenChange, fallbackFocus, compact = false }: {
  label: string;
  actions: Array<Omit<BriskSelectOption<string>, "value"> & { onSelect?: () => void }>;
  trigger?: ReactNode;
  align?: "start" | "end";
  variant?: "primary" | "secondary" | "ghost";
  compact?: boolean;
  fallbackFocus?: (trigger: HTMLButtonElement | null) => HTMLElement | null;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  return <BriskSelect className="shoot-command-menu" mode="action" actionMenuAlign={align} actionMenuSize={compact ? "compact" : undefined} value="" clearable={false} ariaLabel={label} placeholder={label}
    open={open} onOpenChange={onOpenChange}
    actionFallbackFocus={fallbackFocus ?? ((anchor) => anchor?.closest('main')?.querySelector<HTMLButtonElement>('[role="tab"][aria-selected="true"]') ?? null)}
    options={actions.map((action, index) => ({ ...action, value: String(index) }))}
    onChange={(value) => { if (value) actions[Number(value)]?.onSelect?.(); }}
    actionTrigger={(props) => trigger
      ? <Button {...props} size="S" variant={variant}>{trigger}</Button>
      : <IconButton {...props} aria-label={label} tooltipAlign="end"><DsIcon name="dots-three" size={18} /></IconButton>}
  />;
}
