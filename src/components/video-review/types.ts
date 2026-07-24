export type CommentVisibility = "external" | "internal";

export type CommentFilter = "all" | "unresolved" | "internal" | "external";

export type User = {
  id: string;
  name: string;
  initials: string;
  team: "studio" | "customer";
  avatarTone: "pink" | "purple" | "lime" | "cyan" | "yellow" | "sand";
};

export type ReactionEmoji = "❤️" | "🔥" | "✅" | "🤔" | "👀" | "🙌" | "👏" | "🎉" | "😂" | "😍" | "🚀" | "💡" | "👍";

export type Reaction = {
  emoji: ReactionEmoji;
  label: string;
  selectedBy: string[];
};

export type FramePin = {
  x: number;
  y: number;
};

export type DrawingPoint = {
  x: number;
  y: number;
};

export type DrawingPath = {
  id: string;
  points: DrawingPoint[];
};

export type CommentReply = {
  id: string;
  authorId: string;
  createdAgo: string;
  body: string;
  reactions?: Reaction[];
};

export type ReviewComment = {
  id: string;
  authorId: string;
  visibility: CommentVisibility;
  timecodeSeconds?: number;
  createdAgo: string;
  body: string;
  resolved: boolean;
  reactions?: Reaction[];
  drawingPaths?: DrawingPath[];
  framePin?: FramePin;
  replies: CommentReply[];
};

export type Video = {
  id: string;
  fileName: string;
  versionLabel: string;
  versions: string[];
  durationSeconds: number;
  currentTimeSeconds: number;
  stage: "Edit";
  sourceUrl?: string;
  comments: ReviewComment[];
};

export type ReviewVersionStatus = "in_review" | "approved" | "changes_requested";

export type ReviewVersion = {
  label: string;
  number: number;
  fileName: string;
  uploadedAt: string;
  uploadedBy: string;
  codec: string;
  resolution: string;
  fileSize: string;
  durationSeconds: number;
  status: ReviewVersionStatus;
  sourceUrl?: string;
};
