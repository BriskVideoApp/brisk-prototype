import type { ButtonHTMLAttributes } from "react";
import type { Reaction, User } from "@/components/video-review/types";

export function CommentAvatar({
  user,
  compact = false,
}: {
  user: User;
  compact?: boolean;
}) {
  return (
    <span
      className={`avatar ${user.avatarTone} ${compact ? "compact" : ""}`}
      aria-label={user.name}
      title={user.name}
    >
      {user.initials}
    </span>
  );
}

export function MentionChip({ children }: { children: React.ReactNode }) {
  return <span className="mention-chip label-xs-semibold">{children}</span>;
}

export function CommentReactionPill({
  reaction,
  selected,
  ...buttonProps
}: {
  reaction: Reaction;
  selected: boolean;
} & ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...buttonProps}
      className={`reaction-pill label-xs-semibold ${selected ? "selected" : ""} ${buttonProps.className ?? ""}`}
      type="button"
    >
      <span aria-hidden="true">{reaction.emoji}</span>
      <span>{reaction.selectedBy.length}</span>
    </button>
  );
}

