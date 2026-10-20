type CommentCountBadgeProps = {
  count: number;
  label: string;
  showZero?: boolean;
  maxCount?: number;
};

export function CommentCountBadge({ count, label, showZero = false, maxCount }: CommentCountBadgeProps) {
  if (count <= 0 && !showZero) {
    return null;
  }

  return (
    <span className="quick-action-badge label-xs-semibold" aria-label={label}>
      {maxCount !== undefined && count > maxCount ? `${maxCount}+` : count}
    </span>
  );
}
