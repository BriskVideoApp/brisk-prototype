import { DsIcon, type DsIconName } from "@/components/video-review/DsIcon";
import type {
  NotificationSemanticLabel,
  NotificationSemanticState as SemanticState,
} from "@/components/notifications/types";

const iconByState: Record<SemanticState, DsIconName> = {
  success: "check-circle",
  warning: "alert-triangle",
  failure: "x-close-cross",
  information: "info",
};

export function NotificationSemanticState({
  state,
  label,
  compact = false,
}: {
  state: SemanticState;
  label: NotificationSemanticLabel;
  compact?: boolean;
}) {
  return (
    <span className={`notification-semantic-state ${state} ${compact ? "compact" : ""}`}>
      <DsIcon name={iconByState[state]} size={compact ? 14 : 16} />
      <span className={compact ? "label-xs-semibold" : "label-s-semibold"}>{label}</span>
    </span>
  );
}
