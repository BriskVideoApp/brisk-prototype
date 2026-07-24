import type { Reaction, User } from "@/components/video-review/types";

export type ChatRole = "Studio Staff" | "Studio Freelancer" | "Customer";

export type ChatChannel = "external" | "internal";

export type ChatSource = "brisk" | "email" | "whatsapp" | "slack" | "teams";

export type ChatProjectUpdate =
  | {
      kind: "review";
      action: string;
      context: string;
      asset: "Script" | "Edit" | "Masters";
      ctaLabel: "Review" | "Approve" | "Open";
      thumbnailUrl: string;
    }
  | {
      kind: "completed" | "neutral";
      copy: string;
    };

export type ChatConnectorSource = Exclude<ChatSource, "brisk">;

export type ChatProjectStatus = "In Production" | "Queued" | "Completed";

export type ChatClientStatus = "Active" | "Inactive" | "Archived";

export type ChatClient = {
  name: string;
  status: ChatClientStatus;
  userIds: string[];
};

export type ChatAttachment = {
  id: string;
  type: "image" | "video" | "file" | "loom";
  name: string;
  size?: string;
  url?: string;
  previewUrl?: string;
  mimeType?: string;
};

export type ChatMessage = {
  id: string;
  projectId: string;
  channel: ChatChannel;
  threadId: string | null;
  senderId: string | null;
  senderSystem: string | null;
  senderRole: "team" | "client" | "system";
  body: string;
  attachments: ChatAttachment[];
  reactions: Reaction[];
  sourceChannel: ChatSource;
  createdAt: string;
  editedAt: string | null;
  deletedAt: string | null;
  readBy: string[];
  mentions: string[];
  deepLinkStage?: "Script" | "Edit" | "Masters";
  projectUpdate?: ChatProjectUpdate;
};

export type ConnectorState = {
  enabled: boolean;
  connected: boolean;
  detail: string;
  audience?:
    | { kind: "shared" }
    | {
        kind: "individual";
        contactName: string;
        possessiveAdjective: string;
      };
};

export type ChatProject = {
  id: string;
  code: string;
  title: string;
  clientName: string;
  status: ChatProjectStatus;
  memberIds: string[];
  clientMemberIds: string[];
  externalUnread: number;
  internalUnread: number;
  preferredSource: ChatSource;
  connectors: Record<ChatConnectorSource, ConnectorState>;
};

export type ChatUser = User & {
  roleLabel: string;
  email: string;
};

export type ConversationPreview = {
  id: string;
  title: string;
  memberIds: string[];
  lastSenderId: string;
  preview: string;
  createdAt: string;
  unread: number;
};

export type ChatCall = {
  id: string;
  title: string;
  kind: "audio" | "video";
  memberIds: string[];
  projectId: string | null;
  startedAt: string;
  durationMinutes: number;
  notesAvailable: boolean;
};
