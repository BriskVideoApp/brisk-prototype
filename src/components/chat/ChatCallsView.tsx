"use client";

import { Button } from "../../../Brisk DS/src/app/components/Button";
import { BriskSelect } from "@/components/form/BriskSelect";

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
              <BriskSelect<string> ariaLabel={"Call type"} clearable={false} placeholder={"Choose an option"} value={kindFilter} onChange={(value) => setKindFilter(value as "all" | ChatCall["kind"])} options={[{ value: "all", label: "All calls" }, { value: "audio", label: "Audio calls" }, { value: "video", label: "Video calls" }]} />
            </label>
            <label className="label-xs-semibold">
              <span className="sr-only">Participant</span>
              <BriskSelect<string> ariaLabel={"Participant"} clearable={false} placeholder={"Choose an option"} value={memberFilter} onChange={(value) => setMemberFilter(value)} options={[{ value: "all", label: "With anyone" }, ...users
                  .filter((user) => user.team === "studio")
                  .sort((a, b) => a.name.localeCompare(b.name, "en-AU"))
                  .map((user) => ({ value: user.id, label: (user.name) }))]} />
            </label>
            <label className="label-xs-semibold">
              <span className="sr-only">Project</span>
              <BriskSelect<string> ariaLabel={"Project"} clearable={false} placeholder={"Choose an option"} value={projectFilter} onChange={(value) => setProjectFilter(value)} options={[{ value: "all", label: "In any project" }, { value: "company", label: "Client calls" }, ...projects.map((project) => ({ value: project.id, label: (project.code) }))]} />
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
                  <Button size="S" variant="secondary"
                    className="chat-secondary-button"
                    type="button"
                    onClick={() => onNotify(`Notes opened for ${call.title}`)}
                  >
                    <DsIcon name="file-text" size={14} />
                    View notes
                  </Button>
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
