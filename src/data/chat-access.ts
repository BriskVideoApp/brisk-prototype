import type { ChatClient, ChatProject, ChatUser } from "@/components/chat/types";
import { chatUsers as seededChatUsers } from "@/data/chat";
import type { PrototypeState, PrototypeUser, ScopedProject } from "@/data/prototype-state";

function chatIdForUser(user: PrototypeUser): string {
  return seededChatUsers.find((candidate) => candidate.email.toLowerCase() === user.email.toLowerCase())?.id ?? user.id;
}

export function getChatUsers(state: PrototypeState): ChatUser[] {
  const knownEmails = new Set(seededChatUsers.map((user) => user.email.toLowerCase()));
  const clientUsers: ChatUser[] = state.users
    .filter((user) => user.role === "Client" && user.workspaceId === state.session.activeWorkspaceId)
    .filter((user) => !knownEmails.has(user.email.toLowerCase()))
    .map((user) => ({
      id: user.id,
      name: user.name,
      initials: user.name.split(/\s+/u).map((part) => part[0]).join("").slice(0, 2).toUpperCase(),
      team: "customer",
      avatarTone: "pink",
      roleLabel: "Client",
      email: user.email,
    }));
  return [...seededChatUsers, ...clientUsers];
}

export function getScopedChatClient(client: ChatClient, state: PrototypeState): ChatClient {
  const record = state.clients.find((candidate) =>
    candidate.workspaceId === state.session.activeWorkspaceId
    && (candidate.name === client.name || candidate.id === client.name.toLowerCase()));
  return {
    ...client,
    status: record?.status ?? client.status,
    userIds: record?.contacts
      .filter((contact) => contact.portalAccess !== "Paused")
      .flatMap((contact) => {
        const user = state.users.find((candidate) => candidate.id === contact.id && candidate.clientId === record.id);
        return user ? [chatIdForUser(user)] : [];
      }) ?? [],
  };
}

export function getScopedChatProject(project: ChatProject | null, state: PrototypeState): ChatProject | null {
  if (!project) return null;
  const record = state.projects.find((candidate) => candidate.id === project.id
    && candidate.workspaceId === state.session.activeWorkspaceId);
  if (!record) return null;
  const client = state.clients.find((candidate) => candidate.id === record.clientId
    && candidate.workspaceId === record.workspaceId);
  const clientMemberIds = record.clientMemberIds.flatMap((contactId) => {
    const contact = client?.contacts.find((candidate) => candidate.id === contactId && candidate.portalAccess !== "Paused");
    const user = contact && state.users.find((candidate) => candidate.id === contact.id && candidate.clientId === record.clientId);
    return user ? [chatIdForUser(user)] : [];
  });
  const studioMemberIds = project.memberIds.filter((id) => seededChatUsers.some((user) => user.id === id && user.team === "studio"));
  return {
    ...project,
    clientName: record.clientName,
    status: record.status,
    clientMemberIds,
    memberIds: [...new Set([...studioMemberIds, ...clientMemberIds])],
  };
}

export function createChatProjectForRecord(project: ScopedProject, state: PrototypeState): ChatProject {
  const studioMemberIds = state.users
    .filter((user) => user.workspaceId === project.workspaceId && user.role === "Studio Staff")
    .map(chatIdForUser);
  return {
    id: project.id,
    code: project.clientBadge,
    title: project.name,
    clientName: project.clientName,
    status: project.status,
    memberIds: studioMemberIds,
    clientMemberIds: [],
    externalUnread: 0,
    internalUnread: 0,
    preferredSource: "brisk",
    connectors: {
      whatsapp: { enabled: false, detail: "Not configured for this project", numberOwner: "studio", conversationName: "Select a Client conversation", audience: { kind: "shared" } },
      slack: { enabled: false, detail: "Not configured for this project", setup: "brisk-app", channelName: "" },
    },
  };
}
