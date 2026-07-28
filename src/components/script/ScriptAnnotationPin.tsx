import { DsIcon } from "@/components/video-review/DsIcon";

export function ScriptAnnotationPin({
  count,
  hasUnresolved,
  label,
  onOpen,
}: {
  count: number;
  hasUnresolved: boolean;
  label: string;
  onOpen: (triggerRect: DOMRect) => void;
}) {
  const annotationState = count === 0 ? "none" : hasUnresolved ? "unresolved" : "resolved";
  const commentTooltip = count > 0
    ? `${count} ${count === 1 ? "comment" : "comments"}`
    : `Add comment for ${label}`;

  return (
    <button
      className={`script-annotation-pin ${annotationState}`}
      type="button"
      aria-label={`${commentTooltip}${count > 0 ? ` for ${label}` : ""}`}
      data-comment-count={count}
      data-tooltip={commentTooltip}
      onMouseDown={(event) => {
        event.preventDefault();
        event.stopPropagation();
      }}
      onClick={(event) => {
        event.stopPropagation();
        onOpen(event.currentTarget.getBoundingClientRect());
      }}
    >
      <DsIcon name="chat-circle" size={16} />
      {count > 0 ? (
        <span className="script-comment-count label-xs-semibold" aria-hidden="true">{count}</span>
      ) : null}
    </button>
  );
}
