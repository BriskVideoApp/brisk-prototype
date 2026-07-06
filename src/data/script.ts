import type { CommentVisibility, Reaction, User } from "@/components/video-review/types";
import type { DsIconName } from "@/components/video-review/DsIcon";

export type ScriptRole = "studio" | "customer";
export type ScriptLayoutMode = "av" | "simple";
export type ScriptDensity = "compact" | "comfortable";
export type ScriptStatus = "In script" | "Waiting on Customer" | "Approved";
export type ScriptSubtabId = "script" | "transcripts" | "notes" | "storyboard";
export type ScriptStageId = "brief" | "script" | "shoot" | "storyboard" | "media" | "edit" | "masters";
export type ScriptGenre = "Documentary" | "Explainer" | "Character animation" | "Brand film" | "Scripted" | "AI video";
export type ScriptMediaType = "upload" | "library" | "stock" | "link";
export type ScriptElementType = "scene" | "action" | "character" | "dialogue" | "parenthetical" | "transition";

export type ScriptMediaItem = {
  id: string;
  type: ScriptMediaType;
  label: string;
  meta: string;
  tone: "cyan" | "lime" | "pink" | "purple" | "yellow";
};

export type ScriptRow = {
  id: string;
  words: string;
  visuals: string;
  durationSeconds: number;
  elementType: ScriptElementType;
  media: ScriptMediaItem[];
  change?: {
    deleted?: string;
    added?: string;
    author: string;
  };
  deletedMeta?: {
    person: string;
    time: string;
  };
};

export type ScriptVersion = {
  id: string;
  label: string;
  snapshotName: string;
  approvedSnapshot: boolean;
  createdBy: "Studio" | "Customer";
  createdAt: string;
  rows: ScriptRow[];
};

export type ScriptSubtab = {
  id: ScriptSubtabId;
  label: string;
  visible: boolean;
  approved: boolean;
  optional?: boolean;
};

export type ScriptCommentAnchor = {
  kind: "overall" | "row" | "selection";
  label: string;
  rowId?: string;
  snippet?: string;
};

export type ScriptComment = {
  id: string;
  authorId: string;
  visibility: CommentVisibility;
  anchor: ScriptCommentAnchor;
  createdAgo: string;
  body: string;
  resolved: boolean;
  unreadMentionUserIds?: string[];
  reactions?: Reaction[];
  replies: Array<{
    id: string;
    authorId: string;
    createdAgo: string;
    body: string;
    reactions?: Reaction[];
  }>;
};

export type ScriptBrief = {
  targetDurationSeconds: number;
  genre: ScriptGenre;
  customerName: string;
  studioName: string;
  projectName: string;
  hasDialogueMedia: boolean;
  showAiToCustomer: boolean;
};

export const scriptBrief: ScriptBrief = {
  targetDurationSeconds: 60,
  genre: "Documentary",
  customerName: "Avery Taylor",
  studioName: "Northstar Films",
  projectName: "Harbour Health - Care Journey",
  hasDialogueMedia: true,
  showAiToCustomer: false,
};

export const scriptGenres: ScriptGenre[] = [
  "Documentary",
  "Explainer",
  "Character animation",
  "Brand film",
  "Scripted",
  "AI video",
];

export const scriptUsers: User[] = [
  {
    id: "user-tom",
    name: "Tom",
    initials: "T",
    team: "studio",
    avatarTone: "sand",
  },
  {
    id: "user-jess",
    name: "Jess T.",
    initials: "JT",
    team: "customer",
    avatarTone: "pink",
  },
  {
    id: "user-david",
    name: "David R.",
    initials: "DR",
    team: "studio",
    avatarTone: "purple",
  },
  {
    id: "user-marcus",
    name: "Marcus L.",
    initials: "ML",
    team: "studio",
    avatarTone: "cyan",
  },
  {
    id: "user-priya",
    name: "Priya N.",
    initials: "PN",
    team: "studio",
    avatarTone: "yellow",
  },
];

export const scriptPresence = [
  { id: "presence-jess", name: "Jess T.", initials: "JT", tone: "pink" },
] as const;

export const initialScriptSubtabs: ScriptSubtab[] = [
  { id: "script", label: "Script", visible: true, approved: false },
  { id: "transcripts", label: "Transcripts", visible: true, approved: true },
  { id: "notes", label: "Notes", visible: false, approved: false, optional: true },
  { id: "storyboard", label: "Storyboard", visible: false, approved: false, optional: true },
];

export const scriptStages: Array<{ id: ScriptStageId; label: string; icon: DsIconName }> = [
  { id: "brief", label: "Brief", icon: "clipboard-text" },
  { id: "script", label: "Script", icon: "pen-nib" },
  { id: "shoot", label: "Shoot", icon: "video-camera-ds" },
  { id: "storyboard", label: "Storyboard", icon: "grid-four" },
  { id: "media", label: "Media", icon: "image-square" },
  { id: "edit", label: "Edit", icon: "stage-edit" },
  { id: "masters", label: "Masters", icon: "film-strip" },
];

export const scriptTranscriptLines = [
  "Avery: The handover point is where families feel the most uncertainty.",
  "Nurse Maya: We want the process to feel calm, clear and human.",
  "Avery: That moment should guide the opening line of the film.",
] as const;

const baseRows: ScriptRow[] = [
  {
    id: "row-01",
    words: "Meet Maya, a nurse helping families navigate care decisions with calm and clarity.",
    visuals: "Maya walks through a bright clinic corridor, greeting a family at reception.",
    durationSeconds: 6,
    elementType: "action",
    media: [
      {
        id: "media-01-a",
        type: "library",
        label: "Clinic walk-in",
        meta: "Library clip",
        tone: "cyan",
      },
    ],
  },
  {
    id: "row-02",
    words: "When a loved one needs support, every next step can feel bigger than it should.",
    visuals: "Close-up on a phone showing unread messages, then a quiet kitchen table.",
    durationSeconds: 6,
    elementType: "dialogue",
    media: [],
    change: {
      deleted: "the whole process can feel overwhelming",
      added: "every next step can feel bigger than it should",
      author: "Jess T.",
    },
  },
  {
    id: "row-03",
    words: "Harbour Health brings the plan, the people and the paperwork into one guided path.",
    visuals: "Soft overhead shot of forms, calendar cards and a support plan coming together.",
    durationSeconds: 7,
    elementType: "action",
    media: [
      {
        id: "media-03-a",
        type: "stock",
        label: "Planning desk",
        meta: "Stock option",
        tone: "lime",
      },
      {
        id: "media-03-b",
        type: "link",
        label: "Brand board",
        meta: "Reference link",
        tone: "purple",
      },
    ],
  },
  {
    id: "row-04",
    words: "Families can see what is happening now, what happens next and who is responsible.",
    visuals: "Animated interface cards slide from Brief to Script, then into Shoot and Media.",
    durationSeconds: 7,
    elementType: "dialogue",
    media: [],
  },
  {
    id: "row-05",
    words: "The Studio team stays aligned too, with updates that are visible before bottlenecks build.",
    visuals: "Producer, editor and client avatars appear around the same production timeline.",
    durationSeconds: 7,
    elementType: "action",
    media: [],
  },
  {
    id: "row-06",
    words: "Instead of chasing answers, Maya can spend more time with the people who need her.",
    visuals: "Maya sits with an older patient and their daughter, both visibly more relaxed.",
    durationSeconds: 7,
    elementType: "dialogue",
    media: [
      {
        id: "media-06-a",
        type: "upload",
        label: "Interview still",
        meta: "Uploaded",
        tone: "pink",
      },
    ],
  },
  {
    id: "row-07",
    words: "For care providers, that means fewer missed details and a smoother path to approval.",
    visuals: "Tick marks move through a simple approval checklist without feeling mechanical.",
    durationSeconds: 6,
    elementType: "action",
    media: [],
  },
  {
    id: "row-08",
    words: "For families, it means a shared view of care that feels understandable from day one.",
    visuals: "Family members look at the same tablet while a care coordinator points to next steps.",
    durationSeconds: 7,
    elementType: "dialogue",
    media: [],
    change: {
      deleted: "clear from the beginning",
      added: "understandable from day one",
      author: "Marcus L.",
    },
  },
  {
    id: "row-09",
    words: "Harbour Health is built for the moments when trust depends on being organised.",
    visuals: "Calm brand-colour title card, then a subtle cut back to Maya in the clinic.",
    durationSeconds: 6,
    elementType: "action",
    media: [],
  },
  {
    id: "row-10",
    words: "One place for the brief, the decisions and the handover into the next stage.",
    visuals: "Circular stage markers move from Brief to Script to Media with a human pace.",
    durationSeconds: 5,
    elementType: "dialogue",
    media: [],
  },
  {
    id: "row-11",
    words: "So everyone can keep the work moving without losing the person at the centre.",
    visuals: "Montage of staff, family and patient sharing small reassuring moments.",
    durationSeconds: 6,
    elementType: "dialogue",
    media: [],
  },
  {
    id: "row-12",
    words: "Harbour Health. Care journeys made clearer for the people who carry them.",
    visuals: "End card with Harbour Health mark and a quiet clinic ambience bed.",
    durationSeconds: 5,
    elementType: "transition",
    media: [],
  },
];

export const scriptVersions: ScriptVersion[] = [
  {
    id: "v1",
    label: "v1",
    snapshotName: "Script v1 - Customer approved",
    approvedSnapshot: true,
    createdBy: "Customer",
    createdAt: "12 Jun",
    rows: baseRows.map((row) => ({
      ...row,
      words: row.words.replace("Harbour Health", "Harbour Care"),
      media: row.media.map((mediaItem) => ({ ...mediaItem })),
      change: undefined,
    })),
  },
  {
    id: "v2",
    label: "v2",
    snapshotName: "Script v2 - Studio approved",
    approvedSnapshot: true,
    createdBy: "Studio",
    createdAt: "18 Jun",
    rows: baseRows.map((row) => ({
      ...row,
      media: row.media.map((mediaItem) => ({ ...mediaItem })),
      change: undefined,
    })),
  },
  {
    id: "v3",
    label: "v3",
    snapshotName: "Script v3 - Current",
    approvedSnapshot: false,
    createdBy: "Studio",
    createdAt: "21 Jun",
    rows: baseRows.map((row) => ({
      ...row,
      media: row.media.map((mediaItem) => ({ ...mediaItem })),
    })),
  },
];

export const initialScriptComments: ScriptComment[] = [
  {
    id: "script-comment-row-02",
    authorId: "user-david",
    visibility: "external",
    anchor: { kind: "row", label: "Row 02", rowId: "row-02" },
    createdAgo: "25m",
    body: "Could this line feel a touch less heavy? The current wording is good, but maybe a little softer.",
    resolved: false,
    reactions: [{ emoji: "👍", label: "Like", selectedBy: ["user-tom"] }],
    replies: [],
  },
  {
    id: "script-comment-selection-04",
    authorId: "user-marcus",
    visibility: "internal",
    anchor: {
      kind: "selection",
      label: "Row 04",
      rowId: "row-04",
      snippet: "what happens next",
    },
    createdAgo: "38m",
    body: "Team note: keep this phrase. It maps neatly to the product promise.",
    resolved: false,
    unreadMentionUserIds: ["user-tom"],
    replies: [],
  },
  {
    id: "script-comment-row-03-resolved-01",
    authorId: "user-jess",
    visibility: "external",
    anchor: { kind: "row", label: "Row 03", rowId: "row-03" },
    createdAgo: "1d",
    body: "Planning desk direction works well here. Resolved after the latest pass.",
    resolved: true,
    replies: [],
  },
  {
    id: "script-comment-row-03-resolved-02",
    authorId: "user-priya",
    visibility: "internal",
    anchor: { kind: "row", label: "Row 03", rowId: "row-03" },
    createdAgo: "20h",
    body: "Brand board reference is now aligned with the treatment.",
    resolved: true,
    replies: [],
  },
];

export const scriptAiFixtures = [
  "Try opening with a family moment before naming the platform.",
  "Rewrite row 02 with a warmer, lower-pressure tone.",
  "Add a simple visual motif: forms becoming a clear care pathway.",
] as const;
