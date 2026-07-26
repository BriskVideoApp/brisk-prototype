import { DsIcon } from "@/components/video-review/DsIcon";
import type { ScriptSubtab, ScriptSubtabId } from "@/data/script";

export function ScriptSubtabBar({
  activeSubtabId,
  draggingSubtabId,
  subtabs,
  onActivate,
  onDragEnd,
  onDragStart,
  onReorder,
}: {
  activeSubtabId: ScriptSubtabId;
  draggingSubtabId: ScriptSubtabId | null;
  subtabs: ScriptSubtab[];
  onActivate: (subtabId: ScriptSubtabId) => void;
  onDragEnd: () => void;
  onDragStart: (subtabId: ScriptSubtabId) => void;
  onReorder: (targetSubtabId: ScriptSubtabId) => void;
}) {
  return (
    <nav className="script-subtab-bar" aria-label="Script sections">
      <div className="script-subtab-list">
        {subtabs.map((subtab) => (
          <div
            className={`script-subtab ${activeSubtabId === subtab.id ? "active" : ""} ${draggingSubtabId === subtab.id ? "dragging" : ""}`}
            draggable
            key={subtab.id}
            onDragStart={(event) => {
              event.dataTransfer.effectAllowed = "move";
              onDragStart(subtab.id);
            }}
            onDragOver={(event) => event.preventDefault()}
            onDrop={() => onReorder(subtab.id)}
            onDragEnd={onDragEnd}
          >
            <span className="script-subtab-drag" aria-hidden="true">
              <DsIcon name="dots-six-vertical" size={14} />
            </span>
            <button
              className="script-subtab-main label-s-semibold"
              type="button"
              aria-current={activeSubtabId === subtab.id ? "page" : undefined}
              onClick={() => onActivate(subtab.id)}
            >
              {subtab.label}
            </button>
          </div>
        ))}
      </div>
    </nav>
  );
}
