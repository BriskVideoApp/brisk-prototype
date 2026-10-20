"use client";

import { Button } from "../../../Brisk DS/src/app/components/Button";
import { FilterButton, FilterGroup } from "../../../Brisk DS/src/app/components/FilterGroup";
import { useId, useMemo, useState } from "react";
import Link from "next/link";
import { CommentAvatar } from "@/components/comments/CommentPrimitives";
import type { PrototypeRole } from "@/components/navigation/PrototypeRoleContext";
import { DsIcon } from "@/components/video-review/DsIcon";
import type {
  ChatMessage,
  ChatProject,
  ChatProjectStatus,
  ChatUser,
} from "@/components/chat/types";
import { formatCompactDate, getLastProjectMessage } from "@/components/chat/chat-utils";
import { ChatUnreadControl } from "@/components/chat/ChatUnreadControl";

type ProjectListFilter = ChatProjectStatus | "All";

type ChatProjectListProps = {
  projects: ChatProject[];
  messages: ChatMessage[];
  users: ChatUser[];
  clientName?: string | null;
  showCompanyChat?: boolean;
  onProjectSelect: (projectId: string) => void;
  onCompanyChat: () => void;
  onCustomerSettings: () => void;
  onProjectMarkRead: (projectId: string) => void;
  role: PrototypeRole;
};

const listFilters: ProjectListFilter[] = ["In Production", "Queued", "Completed", "All"];

export function ChatProjectList({
  projects,
  messages,
  users,
  clientName = null,
  showCompanyChat = true,
  onProjectSelect,
  onCompanyChat,
  onCustomerSettings,
  onProjectMarkRead,
  role,
}: ChatProjectListProps) {
  const headingId = useId();
  const [filter, setFilter] = useState<ProjectListFilter>("In Production");
  const usersById = useMemo(() => new Map(users.map((user) => [user.id, user])), [users]);
  const visibleProjects = projects.filter((project) => filter === "All" || project.status === filter);
  const allMemberIds = [...new Set(projects.flatMap((project) => project.memberIds))];
  const memberIds = allMemberIds.slice(0, 5);
  const remainingMemberCount = Math.max(0, allMemberIds.length - memberIds.length);

  return (
    <section className="chat-project-list-page" aria-labelledby={headingId}>
      <header className="chat-main-header chat-project-list-header">
        <div className="chat-main-header-title">
          <h1 id={headingId}>
            {clientName ? `${clientName} projects` : "All project conversations"}
          </h1>
        </div>
        <div className="chat-project-list-actions">
          <div className="chat-avatar-stack" aria-label="Workspace members">
            {memberIds.map((memberId) => {
              const user = usersById.get(memberId);
              return user ? <CommentAvatar key={user.id} user={user} compact /> : null;
            })}
            {remainingMemberCount > 0 ? (
              <span className="chat-avatar-more label-xs-semibold">+{remainingMemberCount}</span>
            ) : null}
          </div>
          {showCompanyChat ? (
            <>
              <Button size="S" variant="secondary" type="button" onClick={onCompanyChat}>
                Client chat
              </Button>
              <Button size="S" variant="ghost" type="button" aria-label={`Open ${clientName} settings`} onClick={onCustomerSettings}>
                Client settings
              </Button>
            </>
          ) : null}
        </div>
      </header>

      <div className="chat-project-list-content">
        <div className="chat-project-status-filters">
          <FilterGroup aria-label="Project status">
            {listFilters.map((status) => (
              <FilterButton
                selected={filter === status}
                key={status}
                onClick={() => setFilter(status)}
              >
                {status}
              </FilterButton>
            ))}
          </FilterGroup>
        </div>

        <div className="chat-project-card-list">
          {visibleProjects.map((project) => {
            const lastMessage = getLastProjectMessage(messages, project.id);
            const sender = lastMessage?.senderId ? usersById.get(lastMessage.senderId) : undefined;
            const unread = project.externalUnread + project.internalUnread;
            const senderName = sender?.name ?? lastMessage?.senderSystem ?? "No messages yet";
            const preview = lastMessage?.body ?? "Open this video and start the conversation.";
            const previewText = `${senderName}: ${preview}`;
            const previewTime = lastMessage ? formatCompactDate(lastMessage.createdAt) : "";

            return (
              <div className="chat-project-card-row" key={project.id}>
                <button
                  className="chat-project-card"
                  type="button"
                  aria-label={`${project.title}, ${project.code}, ${project.clientName}, ${project.status}`}
                  aria-description={`${previewText}${previewTime ? ` · ${previewTime}` : ""}`}
                  data-tooltip={previewText}
                  onClick={() => onProjectSelect(project.id)}
                >
                  <strong className="chat-project-card-title label-s-semibold">
                    {project.title}
                  </strong>
                  <span className="chat-project-card-meta label-xs">{project.code} · {project.clientName}</span>
                  <span className="chat-status-chip label-xs-semibold">{project.status}</span>
                  <span className="chat-project-preview-copy label-s">
                    <strong className="label-s-semibold">{senderName}</strong>{": "}
                    <span>{preview}</span>
                  </span>
                  <span className="chat-project-preview-time label-xs">
                    {previewTime}
                  </span>
                </button>
                <ChatUnreadControl
                  className="card"
                  count={unread}
                  ariaLabel={`Mark ${unread} unread messages in ${project.code} as read`}
                  onMarkRead={() => onProjectMarkRead(project.id)}
                />
              </div>
            );
          })}
        </div>

        {visibleProjects.length === 0 ? (
          <div className="chat-empty-state">
            <span className="chat-empty-icon"><DsIcon name="chats" size={24} /></span>
            <h2>{role === "Studio Freelancer" ? "No conversations yet" : role === "Customer" ? "No conversations yet" : "No video conversations yet"}</h2>
            <p>{role === "Studio Freelancer"
              ? "Project conversations will appear when a Studio invites you."
              : role === "Customer"
                ? "Messages from your Studio will appear here."
                : "Start a video and its Client and team channels will appear here."}</p>
            <Link className="chat-primary-button label-s-semibold" href={role === "Customer" ? "/customer-dashboard" : "/active-videos"}>
              {role === "Customer" ? "Back to dashboard" : "Open Videos"}
            </Link>
          </div>
        ) : null}
      </div>
    </section>
  );
}
