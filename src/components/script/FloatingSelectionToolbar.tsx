import { DsIcon, type DsIconName } from "@/components/video-review/DsIcon";

export type FloatingSelectionToolbarState = {
  visible: boolean;
  x: number;
  y: number;
};

export type FloatingSelectionToolbarAction = {
  id: string;
  label: string;
  icon?: DsIconName;
  symbol?: string;
  showLabel?: boolean;
  disabled?: boolean;
  onSelect: () => void;
};

export function FloatingSelectionToolbar({
  actions,
  ariaLabel = "Selection actions",
  state,
}: {
  actions: FloatingSelectionToolbarAction[];
  ariaLabel?: string;
  state: FloatingSelectionToolbarState;
}) {
  if (!state.visible) {
    return null;
  }

  return (
    <div
      className="script-floating-toolbar"
      style={{ left: state.x, top: state.y }}
      aria-label={ariaLabel}
    >
      {actions.map((action) => (
        <button
          className={`script-selection-toolbar-button label-xs-semibold ${action.showLabel ? "with-label" : "icon-only"}`}
          data-tooltip={action.showLabel ? undefined : action.label}
          disabled={action.disabled}
          key={action.id}
          type="button"
          aria-label={action.label}
          onMouseDown={(event) => event.preventDefault()}
          onClick={action.onSelect}
        >
          {action.symbol ? <span aria-hidden="true">{action.symbol}</span> : null}
          {action.icon ? <DsIcon name={action.icon} size={14} /> : null}
          {action.showLabel ? action.label : null}
        </button>
      ))}
    </div>
  );
}
