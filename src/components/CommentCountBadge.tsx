type CommentCountBadgeProps = {
  count: number;
  label: string;
};

export function CommentCountBadge({ count, label }: CommentCountBadgeProps) {
  if (count <= 0) {
    return null;
  }

  return (
    <span className="quick-action-badge label-xs-semibold" aria-label={label}>
      {count}
    </span>
  );
}
