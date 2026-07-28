import type { CommentReply, Reaction } from "@/components/video-review/types";

export type MastersRole = "Studio Staff" | "Studio Freelancer" | "Customer";

export type DeliverablePlatform =
  | "YouTube (Main)"
  | "Instagram"
  | "TikTok"
  | "LinkedIn"
  | "Facebook"
  | "Vimeo"
  | "Website"
  | "Internal"
  | "Other";

export type DeliverableFormat = "16:9" | "9:16" | "1:1" | string;
export type DeliverableCaption = "SRT file" | "Baked in captions" | "None";
export type DeliverableStatus =
  | "not_started"
  | "waiting_for_studio"
  | "waiting_for_customer"
  | "approved"
  | "delivered";

export type RecutMarkVerb = "keep" | "cut" | "trim" | "move";

export type RecutMark = {
  id: string;
  inSec: number;
  outSec: number;
  verb: RecutMarkVerb;
  note?: string;
  createdBy: string;
  createdAt: string;
};

export type RecutBrief = {
  sourceDeliverableId: string;
  targetDurationSec: number;
  targetAspect: string;
  marks: RecutMark[];
  notes?: string;
  source: "timeline" | "transcript";
  createdBy: string;
  createdAt: string;
};

export type MastersVersion = {
  id: string;
  number: number;
  filename: string;
  uploadedAt: string;
  uploadedBy: string;
  codec: string;
  resolution: string;
  fileSize: string;
  durationSeconds: number;
  shadePath: string;
  approved: boolean;
};

export type MastersComment = {
  id: string;
  author: string;
  initials: string;
  visibility: "internal" | "external";
  timecodeSeconds?: number;
  body: string;
  createdAgo: string;
  resolved: boolean;
  reactions?: Reaction[];
  replies?: CommentReply[];
  drawingPaths?: Array<{
    id: string;
    points: Array<{ x: number; y: number }>;
  }>;
};

export type MastersSrtLine = {
  id: string;
  startSeconds: number;
  endSeconds: number;
  text: string;
};

export type MastersSrtAttachment = {
  status: "ready";
  filename: string;
  language: string;
  source: "auto-generated" | "uploaded";
  lines: MastersSrtLine[];
};

export type MastersThumbnailAttachment = {
  status: "ready";
  imageUrl: string;
  platform: ThumbnailPlatform;
  frameSeconds: number;
  copy: string;
  source: "auto-generated" | "regenerated" | "uploaded";
};

export type ThumbnailPlatform =
  | "YouTube"
  | "LinkedIn"
  | "Instagram (feed)"
  | "Instagram (reel)"
  | "TikTok"
  | "Custom";

export type MastersGraphicsKit = {
  font: string;
  colours: string[];
  logoUrl: string;
};

export type MastersDeliverable = {
  id: string;
  briefDeliverableId: string;
  parentDeliverableId?: string;
  name: string;
  platform: DeliverablePlatform;
  format: DeliverableFormat;
  duration: string;
  captions: DeliverableCaption[];
  deadline?: string;
  status: DeliverableStatus;
  versions: MastersVersion[];
  approvedVersionId?: string;
  currentVersionId?: string;
  comments: MastersComment[];
  unreadCommentCount: number;
  isRequested?: boolean;
  addedBy: "filmmaker" | "client-request";
  kind: "video" | "captions";
  srt?: MastersSrtAttachment;
  thumbnail?: MastersThumbnailAttachment;
  createdAt?: string;
  recutBrief?: RecutBrief;
  recutSourceDeliverableId?: string;
  recutSourceUpload?: MastersVersion;
};

export const mastersGraphicsKit: MastersGraphicsKit = {
  font: "Plus Jakarta Sans",
  colours: ["#8b2cff", "#6de5fa", "#fdce5d", "#24b553"],
  logoUrl: "/assets/logos/brisk.svg",
};

export const mastersThumbnailVariantUrls = [
  "/mock-thumbnails/good-citizens-purple.svg",
  "/mock-thumbnails/good-citizens-cyan.svg",
  "/mock-thumbnails/good-citizens-yellow.svg",
  "/mock-thumbnails/good-citizens-green.svg",
] as const;

const mainComments: MastersComment[] = [
  {
    id: "masters-comment-1",
    author: "Jess Taylor",
    initials: "JT",
    visibility: "external",
    timecodeSeconds: 14,
    body: "This opening feels confident. The product reveal now lands at exactly the right moment.",
    createdAgo: "2h",
    resolved: true,
  },
  {
    id: "masters-comment-2",
    author: "Marcus Lee",
    initials: "ML",
    visibility: "internal",
    timecodeSeconds: 58,
    body: "Final audio pass is clean. Keep this mix as the canonical master.",
    createdAgo: "1h",
    resolved: false,
  },
  {
    id: "masters-comment-3",
    author: "Sarah Khan",
    initials: "SK",
    visibility: "external",
    timecodeSeconds: 103,
    body: "Approved from our side. The closing frame is spot on.",
    createdAgo: "38m",
    resolved: false,
  },
];

export function createMockSrt(id: string, filename: string, durationSeconds: number): MastersSrtAttachment {
  const segment = Math.max(2, Math.floor(durationSeconds / 4));
  return {
    status: "ready",
    filename,
    language: "English",
    source: "auto-generated",
    lines: [
      { id: `${id}-1`, startSeconds: 0, endSeconds: segment, text: "Meet Maya, bringing calm and clarity to every decision." },
      { id: `${id}-2`, startSeconds: segment, endSeconds: segment * 2, text: "One guided place keeps the people and the paperwork connected." },
      { id: `${id}-3`, startSeconds: segment * 2, endSeconds: segment * 3, text: "Everyone can see what is happening now and what comes next." },
      { id: `${id}-4`, startSeconds: segment * 3, endSeconds: durationSeconds, text: "Good Citizens. Work that moves people forward." },
    ],
  };
}

export function createMockThumbnail(
  platform: DeliverablePlatform,
  frameSeconds = 0,
): MastersThumbnailAttachment {
  const thumbnailPlatform: ThumbnailPlatform = platform === "YouTube (Main)"
    ? "YouTube"
    : platform === "Instagram"
      ? "Instagram (reel)"
      : platform === "LinkedIn"
        ? "LinkedIn"
        : platform === "TikTok"
          ? "TikTok"
          : "Custom";
  return {
    status: "ready",
    imageUrl: mastersThumbnailVariantUrls[0],
    platform: thumbnailPlatform,
    frameSeconds,
    copy: "Clarity for every care decision",
    source: "auto-generated",
  };
}

export const initialMastersDeliverables: MastersDeliverable[] = [
  {
    id: "masters-main-video",
    briefDeliverableId: "main-video",
    name: "Main Video",
    platform: "YouTube (Main)",
    format: "16:9",
    duration: "3 mins",
    captions: ["SRT file"],
    deadline: "2026-08-07",
    status: "waiting_for_customer",
    currentVersionId: "main-v2",
    addedBy: "filmmaker",
    kind: "video",
    srt: createMockSrt("main-caption", "Good_Citizens_Main_Master_en-AU.srt", 180),
    thumbnail: {
      status: "ready",
      imageUrl: mastersThumbnailVariantUrls[0],
      platform: "YouTube",
      frameSeconds: 42,
      copy: "Care decisions, made clearer",
      source: "auto-generated",
    },
    comments: mainComments,
    unreadCommentCount: 2,
    versions: [
      {
        id: "main-v1",
        number: 1,
        filename: "Good_Citizens_Main_Master_V1.mov",
        uploadedAt: "2026-07-18T09:30:00+10:00",
        uploadedBy: "David Ryan",
        codec: "ProRes 422 HQ",
        resolution: "3840 × 2160",
        fileSize: "8.4 GB",
        durationSeconds: 180,
        shadePath: "Shade/Good Citizens/Masters/Main Video/V1",
        approved: false,
      },
      {
        id: "main-v2",
        number: 2,
        filename: "Good_Citizens_Main_Master_V2.mov",
        uploadedAt: "2026-07-22T15:14:00+10:00",
        uploadedBy: "David Ryan",
        codec: "ProRes 422 HQ",
        resolution: "3840 × 2160",
        fileSize: "8.7 GB",
        durationSeconds: 180,
        shadePath: "Shade/Good Citizens/Masters/Main Video/V2",
        approved: false,
      },
    ],
  },
  {
    id: "masters-platform-cutdown",
    briefDeliverableId: "platform-cutdown",
    name: "Platform cutdown",
    platform: "Instagram",
    format: "9:16",
    duration: "30 secs",
    captions: ["Baked in captions"],
    deadline: "2026-08-12",
    status: "waiting_for_customer",
    currentVersionId: "cutdown-v1",
    addedBy: "filmmaker",
    kind: "video",
    recutSourceDeliverableId: "masters-main-video",
    srt: createMockSrt("cutdown-caption", "Good_Citizens_Instagram_30s_en-AU.srt", 30),
    thumbnail: {
      status: "ready",
      imageUrl: mastersThumbnailVariantUrls[1],
      platform: "Instagram (reel)",
      frameSeconds: 8,
      copy: "The next step, made simple",
      source: "regenerated",
    },
    comments: [
      {
        id: "masters-comment-4",
        author: "Jess Taylor",
        initials: "JT",
        visibility: "external",
        timecodeSeconds: 8,
        body: "Could the title sit for one more beat before the first cut?",
        createdAgo: "18m",
        resolved: false,
      },
    ],
    unreadCommentCount: 1,
    versions: [
      {
        id: "cutdown-v1",
        number: 1,
        filename: "Good_Citizens_Instagram_30s_V1.mp4",
        uploadedAt: "2026-07-23T08:44:00+10:00",
        uploadedBy: "Priya Nair",
        codec: "H.264 High",
        resolution: "1080 × 1920",
        fileSize: "146 MB",
        durationSeconds: 30,
        shadePath: "Shade/Good Citizens/Masters/Instagram 30s/V1",
        approved: false,
      },
    ],
  },
  {
    id: "masters-square-cut",
    briefDeliverableId: "square-cut",
    name: "Square cut",
    platform: "LinkedIn",
    format: "1:1",
    duration: "30 secs",
    captions: ["None"],
    deadline: "2026-08-15",
    status: "not_started",
    addedBy: "filmmaker",
    kind: "video",
    recutSourceDeliverableId: "masters-main-video",
    srt: createMockSrt("square-caption", "Good_Citizens_LinkedIn_30s_en-AU.srt", 30),
    thumbnail: {
      status: "ready",
      imageUrl: mastersThumbnailVariantUrls[2],
      platform: "LinkedIn",
      frameSeconds: 12,
      copy: "Clarity for every care decision",
      source: "auto-generated",
    },
    comments: [],
    unreadCommentCount: 0,
    versions: [],
  },
];

export const mastersPlatformOptions: DeliverablePlatform[] = [
  "YouTube (Main)",
  "Instagram",
  "TikTok",
  "LinkedIn",
  "Facebook",
  "Vimeo",
  "Website",
  "Internal",
  "Other",
];

export const mastersFormatOptions = ["16:9", "9:16", "1:1", "Custom"] as const;

export const mastersDurationOptions = [
  "15 secs",
  "30 secs",
  "45 secs",
  "60 secs",
  "1 min 30 secs",
  "2 mins",
  "3 mins",
  "5 mins",
  "Custom",
] as const;
