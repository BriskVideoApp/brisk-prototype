"use client";

import { useMemo, useState } from "react";
import { CommentAvatar } from "@/components/comments/CommentPrimitives";
import { DsIcon } from "@/components/video-review/DsIcon";
import type { ChatCall, ChatProject, ChatUser } from "@/components/chat/types";
import { formatCompactDate } from "@/components/chat/chat-utils";

type ChatCallsViewProps = {
  calls: ChatCall[];
  projects: ChatProject[];
  users: ChatUser[];
  workspaceName: string;
  onNotify: (message: string) => void;
};

export function ChatCallsView({
  calls,
  projects,
  users,
  workspaceName,
  onNotify,
}: ChatCallsViewProps) {
  const [kindFilter, setKindFilter] = useState<"all" | ChatCall["kind"]>("all");
  const [memberFilter, setMemberFilter] = useState("all");
  const [projectFilter, setProjectFilter] = useState("all");
  const usersById = useMemo(() => new Map(users.map((user) => [user.id, user])), [users]);
  const projectsById = useMemo(
    () => new Map(projects.map((project) => [project.id, project])),
    [projects],
  );
  const filteredCalls = calls.filter(
    (call) =>
      (kindFilter === "all" || call.kind === kindFilter) &&
      (memberFilter === "all" || call.memberIds.includes(memberFilter)) &&
      (projectFilter === "all" ||
        (projectFilter === "company" ? call.projectId === null : call.projectId === projectFilter)),
  );

  return (
    <section className="chat-global-page chat-calls-page" aria-label="Calls">
      <section className="chat-recent-calls" aria-labelledby="chat-recent-calls-title">
        <header>
          <div>
            <h2 className="headings-xs-bold" id="chat-recent-calls-title">Recent calls</h2>
            <span className="label-s">Calls you joined across projects and studio groups.</span>
          </div>
          <div className="chat-call-filters" aria-label="Filter recent calls">
            <label className="label-xs-semibold">
              <span className="sr-only">Call type</span>
              <select
                value={kindFilter}
                onChange={(event) => setKindFilter(event.target.value as "all" | ChatCall["kind"])}
              >
                <option value="all">All calls</option>
                <option value="audio">Audio calls</option>
                <option value="video">Video calls</option>
              </select>
              <DsIcon name="caret-down" size={12} />
            </label>
            <label className="label-xs-semibold">
              <span className="sr-only">Participant</span>
              <select value={memberFilter} onChange={(event) => setMemberFilter(event.target.value)}>
                <option value="all">With anyone</option>
                {users
                  .filter((user) => user.team === "studio")
                  .map((user) => <option value={user.id} key={user.id}>{user.name}</option>)}
              </select>
              <DsIcon name="caret-down" size={12} />
            </label>
            <label className="label-xs-semibold">
              <span className="sr-only">Project</span>
              <select value={projectFilter} onChange={(event) => setProjectFilter(event.target.value)}>
                <option value="all">In any project</option>
                <option value="company">Company calls</option>
                {projects.map((project) => (
                  <option value={project.id} key={project.id}>{project.code}</option>
                ))}
              </select>
              <DsIcon name="caret-down" size={12} />
            </label>
          </div>
        </header>

        <div className="chat-call-list">
          {filteredCalls.map((call) => {
            const project = call.projectId ? projectsById.get(call.projectId) : null;

            return (
              <article className="chat-call-card" key={call.id}>
                <span className="chat-call-kind-icon">
                  <DsIcon name={call.kind === "video" ? "video-camera" : "headphones"} size={18} />
                </span>
                <span className="chat-call-card-copy">
                  <strong className="label-s-semibold">{call.title}</strong>
                  <small className="label-xs">
                    {formatCompactDate(call.startedAt)} · {call.durationMinutes} minutes
                    {project ? ` · ${project.code}` : ` · ${workspaceName}`}
                  </small>
                </span>
                <span className="chat-call-member-stack" aria-label="Participants">
                  {call.memberIds.slice(0, 4).map((memberId) => {
                    const member = usersById.get(memberId);
                    return member ? <CommentAvatar user={member} compact key={member.id} /> : null;
                  })}
                </span>
                {call.notesAvailable ? (
                  <button
                    className="chat-secondary-button label-xs-semibold"
                    type="button"
                    onClick={() => onNotify(`Notes opened for ${call.title}`)}
                  >
                    <DsIcon name="file-text" size={14} />
                    View notes
                  </button>
                ) : (
                  <span className="chat-call-no-notes label-xs">No notes</span>
                )}
                <button
                  className="chat-icon-button"
                  type="button"
                  aria-label={`More options for ${call.title}`}
                  onClick={() => onNotify(`More options for ${call.title}`)}
                >
                  <DsIcon name="dots-three-vertical" size={16} />
                </button>
              </article>
            );
          })}
        </div>

        {filteredCalls.length === 0 ? (
          <div className="chat-empty-state compact">
            <span className="chat-empty-icon"><DsIcon name="headphones" size={24} /></span>
            <h2>No calls match these filters</h2>
            <p>Clear a filter to see more recent calls.</p>
          </div>
        ) : null}
      </section>
    </section>
  );
}
