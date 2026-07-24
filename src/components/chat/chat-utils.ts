import type { ChatAttachment, ChatMessage, ChatProject } from "@/components/chat/types";

export function formatCompactDate(isoDate: string) {
  const date = new Date(isoDate);

  return new Intl.DateTimeFormat("en-AU", {
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

export function formatMessageTime(isoDate: string) {
  const date = new Date(isoDate);
  return new Intl.DateTimeFormat("en-AU", {
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

export function formatMessageDate(isoDate: string) {
  const date = new Date(isoDate);
  const today = startOfLocalDay(new Date());
  const messageDay = startOfLocalDay(date);
  const differenceInDays = Math.round(
    (today.getTime() - messageDay.getTime()) / (24 * 60 * 60 * 1_000),
  );

  if (differenceInDays === 0) {
    return "Today";
  }

  if (differenceInDays === 1) {
    return "Yesterday";
  }

  return new Intl.DateTimeFormat("en-AU", {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(date);
}

export function groupMessagesByDate(messages: ChatMessage[]) {
  return messages.reduce<Array<{ key: string; messages: ChatMessage[] }>>((groups, message) => {
    const key = dateKey(message.createdAt);
    const currentGroup = groups.at(-1);

    if (currentGroup?.key === key) {
      currentGroup.messages.push(message);
    } else {
      groups.push({ key, messages: [message] });
    }

    return groups;
  }, []);
}

export function formatRelativeTime(isoDate: string) {
  const milliseconds = Date.now() - new Date(isoDate).getTime();
  const minutes = Math.max(1, Math.floor(milliseconds / 60_000));

  if (minutes < 60) {
    return `${minutes}m ago`;
  }

  const hours = Math.floor(minutes / 60);

  if (hours < 24) {
    return `${hours}h ago`;
  }

  const days = Math.floor(hours / 24);
  return `${days} ${days === 1 ? "day" : "days"} ago`;
}

export function isSameMessageRun(previous: ChatMessage | undefined, message: ChatMessage) {
  if (!previous || previous.senderId !== message.senderId || previous.senderRole !== message.senderRole) {
    return false;
  }

  const difference = new Date(message.createdAt).getTime() - new Date(previous.createdAt).getTime();
  return difference >= 0 && difference <= 5 * 60_000;
}

export function getLastProjectMessage(messages: ChatMessage[], projectId: string) {
  return [...messages]
    .filter((message) => message.projectId === projectId && message.threadId === null && !message.deletedAt)
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt))[0];
}

export function getEnabledSources(project: ChatProject) {
  return (Object.entries(project.connectors) as Array<
    [keyof ChatProject["connectors"], ChatProject["connectors"][keyof ChatProject["connectors"]]]
  >)
    .filter(([, connector]) => connector.enabled && connector.connected)
    .map(([source]) => source);
}

export function attachmentMatches(
  attachment: ChatAttachment,
  requestedType: "link" | "file" | "image",
) {
  if (requestedType === "image") {
    return attachment.type === "image";
  }

  if (requestedType === "file") {
    return attachment.type === "file" || attachment.type === "video";
  }

  return Boolean(attachment.url);
}

function startOfLocalDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function dateKey(isoDate: string) {
  const date = new Date(isoDate);
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}
