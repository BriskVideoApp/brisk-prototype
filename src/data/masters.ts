export type MastersRole = "Studio Staff" | "Customer";

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
  | "Requested"
  | "Not started"
  | "In progress"
  | "Ready for review"
  | "Approved"
  | "Delivered";

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
  isRequested?: boolean;
  addedBy: "filmmaker" | "client-request";
  kind: "video" | "captions";
};

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
    status: "Delivered",
    approvedVersionId: "main-v2",
    currentVersionId: "main-v2",
    addedBy: "filmmaker",
    kind: "video",
    comments: mainComments,
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
        approved: true,
      },
    ],
  },
  {
    id: "masters-main-srt",
    briefDeliverableId: "main-video",
    parentDeliverableId: "masters-main-video",
    name: "SRT file",
    platform: "YouTube (Main)",
    format: "16:9",
    duration: "English",
    captions: ["SRT file"],
    deadline: "2026-08-07",
    status: "Delivered",
    approvedVersionId: "srt-v1",
    currentVersionId: "srt-v1",
    addedBy: "filmmaker",
    kind: "captions",
    comments: [],
    versions: [
      {
        id: "srt-v1",
        number: 1,
        filename: "Good_Citizens_Main_Master_en-AU.srt",
        uploadedAt: "2026-07-22T15:22:00+10:00",
        uploadedBy: "David Ryan",
        codec: "UTF-8 subtitles",
        resolution: "Timed text",
        fileSize: "34 KB",
        durationSeconds: 180,
        shadePath: "Shade/Good Citizens/Masters/Main Video/Captions",
        approved: true,
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
    status: "Ready for review",
    currentVersionId: "cutdown-v1",
    addedBy: "filmmaker",
    kind: "video",
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
    status: "Not started",
    addedBy: "filmmaker",
    kind: "video",
    comments: [],
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
