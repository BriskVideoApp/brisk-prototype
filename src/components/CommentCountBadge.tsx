type CommentCountBadgeProps = {
  count: number;
  label: string;
  showZero?: boolean;
};

export function CommentCountBadge({ count, label, showZero = false }: CommentCountBadgeProps) {
  if (count <= 0 && !showZero) {
    return null;
  }

  return (
    <span className="quick-action-badge label-xs-semibold" aria-label={label}>
      {count}
    </span>
  );
}
