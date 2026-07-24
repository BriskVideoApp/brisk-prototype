"use client";

import { useMemo, useState } from "react";
import { CommentAvatar } from "@/components/comments/CommentPrimitives";
import { DsIcon } from "@/components/video-review/DsIcon";
import type {
  ChatMessage,
  ChatProject,
  ChatProjectStatus,
  ChatUser,
} from "@/components/chat/types";
import { formatCompactDate, getLastProjectMessage } from "@/components/chat/chat-utils";

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
}: ChatProjectListProps) {
  const [filter, setFilter] = useState<ProjectListFilter>("In Production");
  const usersById = useMemo(() => new Map(users.map((user) => [user.id, user])), [users]);
  const visibleProjects = projects.filter(
    (project) => filter === "All" || project.status === filter,
  );
  const allMemberIds = [...new Set(projects.flatMap((project) => project.memberIds))];
  const memberIds = allMemberIds.slice(0, 5);
  const remainingMemberCount = Math.max(0, allMemberIds.length - memberIds.length);

  return (
    <section className="chat-project-list-page" aria-labelledby="chat-project-list-title">
      <div className="chat-company-card">
        <div>
          <p className="label-xs chat-eyebrow">{clientName ? "Client projects" : "Workspace chat"}</p>
          <h1 id="chat-project-list-title">
            {clientName ? `${clientName} projects` : "All project conversations"}
          </h1>
        </div>
        <div className="chat-company-card-actions">
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
              <button className="chat-secondary-button label-s-semibold" type="button" onClick={onCompanyChat}>
                <DsIcon name="chat-circle" size={16} />
                Company chat
              </button>
              <button className="chat-icon-button" type="button" aria-label={`Open ${clientName} settings`} onClick={onCustomerSettings}>
                <DsIcon name="settings" size={18} />
              </button>
            </>
          ) : null}
        </div>
      </div>

      <div className="chat-list-tabs" role="tablist" aria-label="Project status">
        {listFilters.map((status) => (
          <button
            className={`chat-list-tab label-s-semibold ${filter === status ? "active" : ""}`}
            type="button"
            role="tab"
            aria-selected={filter === status}
            key={status}
            onClick={() => setFilter(status)}
          >
            {status}
          </button>
        ))}
      </div>

      <div className="chat-project-card-list">
        {visibleProjects.map((project) => {
          const lastMessage = getLastProjectMessage(messages, project.id);
          const sender = lastMessage?.senderId ? usersById.get(lastMessage.senderId) : undefined;
          const unread = project.externalUnread + project.internalUnread;

          return (
            <button
              className="chat-project-card"
              type="button"
              key={project.id}
              onClick={() => onProjectSelect(project.id)}
            >
              <span className="chat-project-card-icon">
                <DsIcon name="chat-circle" size={20} />
              </span>
              <span className="chat-project-card-content">
                <span className="chat-project-card-title-row">
                  <span className="chat-project-card-heading">
                    <strong className="chat-project-card-title label-s-semibold">
                      {project.code} {project.clientName}
                    </strong>
                    <small className="label-xs">{project.title}</small>
                  </span>
                  <span className="chat-status-chip label-xs-semibold">{project.status}</span>
                </span>
                <span className="chat-project-preview-row">
                  {sender ? <CommentAvatar user={sender} compact /> : null}
                  <span className="chat-project-preview-copy">
                    <strong className="label-xs-semibold">
                      {sender?.name ?? lastMessage?.senderSystem ?? "No messages yet"}
                    </strong>
                    <span className="label-s">
                      {lastMessage?.body ?? "Open this project and start the conversation."}
                    </span>
                  </span>
                  {lastMessage ? (
                    <span className="chat-project-preview-time label-xs">
                      {formatCompactDate(lastMessage.createdAt)}
                    </span>
                  ) : null}
                  {unread > 0 ? (
                    <span className="chat-count-badge light label-xs-semibold">{unread}</span>
                  ) : null}
                </span>
              </span>
            </button>
          );
        })}
      </div>

      {visibleProjects.length === 0 ? (
        <div className="chat-empty-state">
          <span className="chat-empty-icon"><DsIcon name="chat-circle" size={24} /></span>
          <h2>No projects here yet</h2>
          <p>Your projects will show here. Create your first project to start chatting.</p>
          <button className="chat-primary-button label-s-semibold" type="button">
            <DsIcon name="plus" size={16} />
            New project
          </button>
        </div>
      ) : null}
    </section>
  );
}
