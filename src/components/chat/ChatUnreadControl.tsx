type ChatUnreadControlProps = {
  count: number;
  ariaLabel: string;
  onMarkRead: () => void;
  className?: string;
};

export function ChatUnreadControl({
  count,
  ariaLabel,
  onMarkRead,
  className = "",
}: ChatUnreadControlProps) {
  if (count <= 0) {
    return null;
  }

  return (
    <span className={`chat-unread-control ${className}`.trim()}>
      <button
        className="chat-count-badge chat-unread-count-trigger label-xs-semibold"
        type="button"
        aria-label={ariaLabel}
        onClick={onMarkRead}
      >
        {count}
      </button>
      <button
        className="chat-unread-mark-action label-xs-semibold"
        type="button"
        onClick={onMarkRead}
      >
        Mark as read
      </button>
    </span>
  );
}
