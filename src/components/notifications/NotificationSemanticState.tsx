import type {
  NotificationSemanticLabel,
  NotificationSemanticState as SemanticState,
} from "@/components/notifications/types";

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
      <span className={compact ? "label-xs-semibold" : "label-s-semibold"}>{label}</span>
    </span>
  );
}
