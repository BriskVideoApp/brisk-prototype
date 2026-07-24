"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { ClipboardEvent, DragEvent, KeyboardEvent } from "react";
import { MentionChip } from "@/components/comments/CommentPrimitives";
import { getSourceLabel, SourceLogo } from "@/components/chat/SourceLogo";
import { DsIcon } from "@/components/video-review/DsIcon";
import type {
  ChatAttachment,
  ChatChannel,
  ChatProject,
  ChatSource,
  ChatUser,
} from "@/components/chat/types";
import { getEnabledSources } from "@/components/chat/chat-utils";

export type ComposerSubmission = {
  body: string;
  attachments: ChatAttachment[];
  mentions: string[];
  source: ChatSource;
  editingMessageId: string | null;
};

type ChatComposerProps = {
  project: ChatProject;
  channel: ChatChannel;
  users: ChatUser[];
  projects: ChatProject[];
  compact?: boolean;
  lockedSource?: ChatSource;
  placeholder?: string;
  incomingFiles?: File[];
  onIncomingFilesConsumed?: () => void;
  onSend: (submission: ComposerSubmission) => void;
  onEditLast?: () => { id: string; body: string } | null;
};

type ScheduledDraft = {
  label: string;
  body: string;
  attachments: ChatAttachment[];
  mentions: string[];
  projectMentions: string[];
};

const emojiOptions = [
  { shortcode: "smile", emoji: "😊" },
  { shortcode: "heart", emoji: "❤️" },
  { shortcode: "fire", emoji: "🔥" },
  { shortcode: "eyes", emoji: "👀" },
  { shortcode: "thumbsup", emoji: "👍" },
  { shortcode: "clap", emoji: "👏" },
  { shortcode: "tada", emoji: "🎉" },
  { shortcode: "check", emoji: "✅" },
] as const;

export function ChatComposer({
  project,
  channel,
  users,
  projects,
  compact = false,
  lockedSource,
  placeholder,
  incomingFiles = [],
  onIncomingFilesConsumed,
  onSend,
  onEditLast,
}: ChatComposerProps) {
  const [body, setBody] = useState("");
  const [attachments, setAttachments] = useState<ChatAttachment[]>([]);
  const [mentions, setMentions] = useState<string[]>([]);
  const [projectMentions, setProjectMentions] = useState<string[]>([]);
  const [activePicker, setActivePicker] = useState<"mention" | "project" | "emoji" | null>(null);
  const [isSourceMenuOpen, setIsSourceMenuOpen] = useState(false);
  const [isScheduleMenuOpen, setIsScheduleMenuOpen] = useState(false);
  const [isCustomScheduleOpen, setIsCustomScheduleOpen] = useState(false);
  const [customScheduleValue, setCustomScheduleValue] = useState("");
  const [scheduledDraft, setScheduledDraft] = useState<ScheduledDraft | null>(null);
  const [outboundSource, setOutboundSource] = useState<ChatSource>(
    channel === "external" ? lockedSource ?? project.preferredSource : "brisk",
  );
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [isBold, setIsBold] = useState(false);
  const [isItalic, setIsItalic] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const availableUsers = useMemo(
    () =>
      users.filter(
        (user) =>
          project.memberIds.includes(user.id) &&
          (channel === "external" || user.team === "studio"),
      ),
    [channel, project.memberIds, users],
  );
  const enabledSources = useMemo(
    () => ["brisk", ...getEnabledSources(project)] as ChatSource[],
    [project],
  );
  const composerPlaceholder = getComposerPlaceholder(
    placeholder ?? `Message #${project.code} - ${channel}`,
    project,
    channel,
    outboundSource,
  );
  const mentionQuery = body.match(/@([^@\s]*)$/u)?.[1]?.toLowerCase() ?? "";
  const projectQuery = body.match(/#([^#\s]*)$/u)?.[1]?.toLowerCase() ?? "";
  const emojiQuery = body.match(/:([^:\s]*)$/u)?.[1]?.toLowerCase() ?? "";
  const isSendDisabled = !body.trim() && attachments.length === 0;

  const filteredUsers = availableUsers.filter((user) =>
    `${user.name} ${user.roleLabel}`.toLowerCase().includes(mentionQuery),
  );
  const filteredProjects = projects.filter((candidate) =>
    `${candidate.code} ${candidate.title}`.toLowerCase().includes(projectQuery),
  );
  const filteredEmoji = emojiOptions.filter((option) => option.shortcode.includes(emojiQuery));

  useEffect(() => {
    const availableSources = ["brisk", ...getEnabledSources(project)] as ChatSource[];
    setOutboundSource(
      channel === "external"
        ? lockedSource && availableSources.includes(lockedSource)
          ? lockedSource
          : availableSources.includes(project.preferredSource)
            ? project.preferredSource
            : "brisk"
        : "brisk",
    );
    setActivePicker(null);
    setIsSourceMenuOpen(false);
    setIsScheduleMenuOpen(false);
    setIsCustomScheduleOpen(false);
    setScheduledDraft(null);
    setMentions([]);
    setProjectMentions([]);
  }, [channel, lockedSource, project.connectors, project.id, project.preferredSource]);

  useEffect(() => {
    if (incomingFiles.length === 0) {
      return;
    }

    const nextAttachments = incomingFiles.map<ChatAttachment>((file) => ({
      id: `dropped-attachment-${Date.now()}-${file.name}`,
      type: file.type.startsWith("image/")
        ? "image"
        : file.type.startsWith("video/")
          ? "video"
          : "file",
      name: file.name,
      size: formatFileSize(file.size),
      mimeType: file.type,
      previewUrl: file.type.startsWith("image/") ? URL.createObjectURL(file) : undefined,
    }));
    setAttachments((current) => [...current, ...nextAttachments]);
    onIncomingFilesConsumed?.();
  }, [incomingFiles, onIncomingFilesConsumed]);

  const updateBody = (value: string) => {
    setBody(value);

    if (/@[^@\s]*$/u.test(value)) {
      setActivePicker("mention");
    } else if (/#[^#\s]*$/u.test(value)) {
      setActivePicker("project");
    } else if (/:[^:\s]*$/u.test(value)) {
      setActivePicker("emoji");
    } else {
      setActivePicker(null);
    }
  };

  const addUserMention = (user: ChatUser) => {
    setBody((current) => current.replace(/@[^@\s]*$/u, `@${user.name} `));
    setMentions((current) => [...new Set([...current, user.id])]);
    setActivePicker(null);
  };

  const addProjectMention = (mentionedProject: ChatProject) => {
    setBody((current) => current.replace(/#[^#\s]*$/u, `#${mentionedProject.code} `));
    setProjectMentions((current) => [...new Set([...current, mentionedProject.id])]);
    setActivePicker(null);
  };

  const addEmoji = (emoji: string) => {
    setBody((current) => {
      if (/:[^:\s]*$/u.test(current)) {
        return current.replace(/:[^:\s]*$/u, `${emoji} `);
      }

      return `${current}${current.endsWith(" ") || current.length === 0 ? "" : " "}${emoji}`;
    });
    setActivePicker(null);
  };

  const addFiles = (files: File[]) => {
    const nextAttachments = files.map<ChatAttachment>((file) => ({
      id: `draft-attachment-${Date.now()}-${file.name}`,
      type: file.type.startsWith("image/")
        ? "image"
        : file.type.startsWith("video/")
          ? "video"
          : "file",
      name: file.name,
      size: formatFileSize(file.size),
      mimeType: file.type,
      previewUrl: file.type.startsWith("image/") ? URL.createObjectURL(file) : undefined,
    }));
    setAttachments((current) => [...current, ...nextAttachments]);
  };

  const clearDraft = () => {
    setBody("");
    setAttachments([]);
    setMentions([]);
    setProjectMentions([]);
    setEditingMessageId(null);
    setActivePicker(null);
  };

  const submit = () => {
    const trimmedBody = body.trim();

    if (!trimmedBody && attachments.length === 0) {
      return;
    }

    onSend({
      body: trimmedBody,
      attachments,
      mentions,
      source: channel === "internal" ? "brisk" : outboundSource,
      editingMessageId,
    });
    clearDraft();
    setIsScheduleMenuOpen(false);
  };

  const scheduleMessage = (label: string) => {
    const trimmedBody = body.trim();

    if (!trimmedBody && attachments.length === 0) {
      return;
    }

    setScheduledDraft({
      label,
      body,
      attachments,
      mentions,
      projectMentions,
    });
    clearDraft();
    setIsScheduleMenuOpen(false);
    setIsCustomScheduleOpen(false);
    setCustomScheduleValue("");
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.metaKey && event.key.toLowerCase() === "b") {
      event.preventDefault();
      setIsBold((current) => !current);
      return;
    }

    if (event.metaKey && event.key.toLowerCase() === "i") {
      event.preventDefault();
      setIsItalic((current) => !current);
      return;
    }

    if (event.key === "ArrowUp" && body.length === 0 && onEditLast) {
      const lastMessage = onEditLast();

      if (lastMessage) {
        event.preventDefault();
        setBody(lastMessage.body);
        setEditingMessageId(lastMessage.id);
      }
      return;
    }

    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      submit();
    }
  };

  const handlePaste = (event: ClipboardEvent<HTMLTextAreaElement>) => {
    const imageFiles = Array.from(event.clipboardData.files).filter((file) =>
      file.type.startsWith("image/"),
    );

    if (imageFiles.length > 0) {
      addFiles(imageFiles);
    }
  };

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    addFiles(Array.from(event.dataTransfer.files));
  };

  return (
    <section
      className={`chat-composer ${compact ? "compact" : ""}`}
      aria-label={compact ? "Reply in thread" : "Write a message"}
      onDragOver={(event) => event.preventDefault()}
      onDrop={handleDrop}
    >
      {editingMessageId ? (
        <div className="chat-composer-editing label-xs-semibold">
          Editing your last message
          <button
            type="button"
            onClick={() => {
              setBody("");
              setEditingMessageId(null);
            }}
          >
            Cancel
          </button>
        </div>
      ) : null}

      {scheduledDraft ? (
        <div className="chat-scheduled-confirmation" role="status" aria-live="polite">
          <DsIcon name="clock-clockwise" size={20} />
          <span className="label-s">
            Your message will be sent {lowercaseInitial(scheduledDraft.label)}.
          </span>
          <button
            className="label-s-semibold"
            type="button"
            onClick={() => {
              setBody(scheduledDraft.body);
              setAttachments(scheduledDraft.attachments);
              setMentions(scheduledDraft.mentions);
              setProjectMentions(scheduledDraft.projectMentions);
              setScheduledDraft(null);
            }}
          >
            Undo
          </button>
        </div>
      ) : null}

      <div className={`composer-box chat-composer-box ${channel}`}>
        {(attachments.length > 0 || mentions.length > 0 || projectMentions.length > 0) ? (
          <div className="chat-composer-chip-row">
            {mentions.map((userId) => {
              const user = users.find((candidate) => candidate.id === userId);
              return user ? <MentionChip key={user.id}>@{user.name}</MentionChip> : null;
            })}
            {projectMentions.map((projectId) => {
              const mentionedProject = projects.find((candidate) => candidate.id === projectId);
              return mentionedProject ? (
                <MentionChip key={mentionedProject.id}>#{mentionedProject.code}</MentionChip>
              ) : null;
            })}
            {attachments.map((attachment) => (
              <span className="chat-draft-attachment label-xs-semibold" key={attachment.id}>
                {attachment.type === "image" && attachment.previewUrl ? (
                  <img src={attachment.previewUrl} alt="" />
                ) : (
                  <DsIcon name={attachment.type === "image" ? "image-square" : "file-text"} size={14} />
                )}
                <span>{attachment.name}</span>
                <button
                  type="button"
                  aria-label={`Remove ${attachment.name}`}
                  onClick={() =>
                    setAttachments((current) =>
                      current.filter((candidate) => candidate.id !== attachment.id),
                    )
                  }
                >
                  <DsIcon name="x-close-cross" size={12} />
                </button>
              </span>
            ))}
          </div>
        ) : null}

        <textarea
          className="composer-input chat-composer-input paragraph-s"
          value={body}
          rows={compact ? 2 : 3}
          placeholder={composerPlaceholder}
          aria-label={`Message ${project.code} ${channel} channel`}
          onChange={(event) => updateBody(event.target.value)}
          onKeyDown={handleKeyDown}
          onPaste={handlePaste}
        />

        {activePicker ? (
          <div className="chat-composer-picker">
            {activePicker === "mention" ? (
              <>
                <p className="label-xs-semibold">Mention someone</p>
                {filteredUsers.map((user) => (
                  <button type="button" key={user.id} onClick={() => addUserMention(user)}>
                    <span className={`avatar compact ${user.avatarTone}`}>{user.initials}</span>
                    <span>
                      <strong className="label-s-semibold">{user.name}</strong>
                      <small className="label-xs">{user.roleLabel}</small>
                    </span>
                  </button>
                ))}
                {filteredUsers.length === 0 ? (
                  <span className="chat-picker-empty label-s">No members match.</span>
                ) : null}
              </>
            ) : null}
            {activePicker === "project" ? (
              <>
                <p className="label-xs-semibold">Reference a project</p>
                {filteredProjects.slice(0, 6).map((candidate) => (
                  <button
                    type="button"
                    key={candidate.id}
                    onClick={() => addProjectMention(candidate)}
                  >
                    <DsIcon name="chat-circle" size={16} />
                    <span>
                      <strong className="label-s-semibold">{candidate.code}</strong>
                      <small className="label-xs">{candidate.title}</small>
                    </span>
                  </button>
                ))}
              </>
            ) : null}
            {activePicker === "emoji" ? (
              <div className="chat-emoji-grid" aria-label="Emoji">
                {filteredEmoji.map((option) => (
                  <button
                    type="button"
                    key={option.shortcode}
                    title={`:${option.shortcode}:`}
                    onClick={() => addEmoji(option.emoji)}
                  >
                    {option.emoji}
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        ) : null}

        <div className="composer-toolbar chat-composer-toolbar">
          <div className="composer-tools chat-format-tools" aria-label="Formatting tools">
            <button
              className={isBold ? "active" : ""}
              type="button"
              aria-label="Bold - Command B"
              aria-pressed={isBold}
              onClick={() => setIsBold((current) => !current)}
            >
              <strong>B</strong>
            </button>
            <button
              className={isItalic ? "active" : ""}
              type="button"
              aria-label="Italic - Command I"
              aria-pressed={isItalic}
              onClick={() => setIsItalic((current) => !current)}
            >
              <em>I</em>
            </button>
            <button type="button" aria-label="Add link">
              <DsIcon name="link" size={16} />
            </button>
            <button type="button" aria-label="Add image" onClick={() => fileInputRef.current?.click()}>
              <DsIcon name="image-square" size={16} />
            </button>
            <button
              type="button"
              aria-label="Choose emoji"
              aria-expanded={activePicker === "emoji"}
              onClick={() => setActivePicker((current) => current === "emoji" ? null : "emoji")}
            >
              <DsIcon name="smiley" size={16} />
            </button>
          </div>

          <div className="chat-composer-send-area">
            <button
              className="chat-attach-button"
              type="button"
              aria-label="Attach file"
              onClick={() => fileInputRef.current?.click()}
            >
              <DsIcon name="paperclip" size={18} />
            </button>
            <button
              className="chat-record-button"
              type="button"
              aria-label="Record video - coming in V2"
              title="Video recording comes in V2"
              disabled
            >
              <DsIcon name="video-camera" size={18} />
            </button>
            {channel === "external" && lockedSource ? (
              <div
                className="chat-source-select locked label-xs-semibold"
                aria-label={`Replies use ${getSourceLabel(outboundSource)}`}
              >
                <SourceLogo
                  source={outboundSource}
                  project={project}
                  direction="composer"
                  tooltipPlacement="end"
                />
                <span>{getSourceLabel(outboundSource)}</span>
              </div>
            ) : channel === "external" ? (
              <div
                className="chat-source-picker"
                onBlur={(event) => {
                  const nextFocus = event.relatedTarget;

                  if (!(nextFocus instanceof Node) || !event.currentTarget.contains(nextFocus)) {
                    setIsSourceMenuOpen(false);
                  }
                }}
                onKeyDown={(event) => {
                  if (event.key === "Escape") {
                    setIsSourceMenuOpen(false);
                  }
                }}
              >
                <button
                  className="chat-source-select label-xs-semibold"
                  type="button"
                  aria-haspopup="listbox"
                  aria-expanded={isSourceMenuOpen}
                  aria-label={`Choose outbound channel. ${getSourceLabel(outboundSource)} selected`}
                  onClick={() => {
                    setIsScheduleMenuOpen(false);
                    setIsSourceMenuOpen((current) => !current);
                  }}
                >
                  <SourceLogo
                    source={outboundSource}
                    project={project}
                    direction="composer"
                    tooltipPlacement="end"
                    tooltipFocusable={false}
                  />
                  <span>{getSourceLabel(outboundSource)}</span>
                  <DsIcon name="caret-down" size={12} />
                </button>
                {isSourceMenuOpen ? (
                  <div className="chat-source-menu" role="listbox" aria-label="Send message through">
                    {enabledSources.map((source) => (
                      <button
                        className={`chat-source-option label-s ${
                          source === outboundSource ? "selected" : ""
                        }`}
                        type="button"
                        role="option"
                        aria-selected={source === outboundSource}
                        key={source}
                        onClick={() => {
                          setOutboundSource(source);
                          setIsSourceMenuOpen(false);
                        }}
                      >
                        <SourceLogo source={source} size={20} tooltipFocusable={false} />
                        <span>{getSourceLabel(source)}</span>
                        {source === outboundSource ? <DsIcon name="check" size={16} /> : null}
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>
            ) : null}
            <div
              className={`chat-send-split${isSendDisabled ? " disabled" : ""}`}
              onBlur={(event) => {
                const nextFocus = event.relatedTarget;

                if (!(nextFocus instanceof Node) || !event.currentTarget.contains(nextFocus)) {
                  setIsScheduleMenuOpen(false);
                  setIsCustomScheduleOpen(false);
                }
              }}
              onKeyDown={(event) => {
                if (event.key === "Escape") {
                  setIsScheduleMenuOpen(false);
                  setIsCustomScheduleOpen(false);
                }
              }}
            >
              <button
                className="send-button chat-send-button"
                type="button"
                aria-label={editingMessageId ? "Save message" : "Send message"}
                disabled={isSendDisabled}
                onClick={submit}
              >
                <DsIcon name={editingMessageId ? "check" : "paper-plane-tilt"} size={17} />
              </button>
              {!editingMessageId ? (
                <span
                  className="chat-schedule-tooltip"
                  data-tooltip="Schedule for later"
                >
                  <button
                    className="chat-schedule-toggle"
                    type="button"
                    aria-label="Schedule message for later"
                    aria-haspopup="menu"
                    aria-expanded={isScheduleMenuOpen}
                    disabled={isSendDisabled}
                    onClick={() => {
                      setActivePicker(null);
                      setIsSourceMenuOpen(false);
                      setIsCustomScheduleOpen(false);
                      setIsScheduleMenuOpen((current) => !current);
                    }}
                  >
                    <DsIcon name="caret-down" size={12} />
                  </button>
                </span>
              ) : null}

              {isScheduleMenuOpen ? (
                <div className="chat-schedule-menu" role="menu" aria-label="Schedule message">
                  <p className="label-s">Schedule message</p>
                  <button
                    className="label-m"
                    type="button"
                    role="menuitem"
                    onClick={() => scheduleMessage("Tomorrow at 9:00 am")}
                  >
                    Tomorrow at 9:00 am
                  </button>
                  <button
                    className="label-m"
                    type="button"
                    role="menuitem"
                    onClick={() => scheduleMessage("Monday at 9:00 am")}
                  >
                    Monday at 9:00 am
                  </button>
                  <button
                    className="chat-schedule-custom-trigger label-m"
                    type="button"
                    role="menuitem"
                    aria-expanded={isCustomScheduleOpen}
                    onClick={() => setIsCustomScheduleOpen((current) => !current)}
                  >
                    Custom time
                    <DsIcon name="caret-right" size={14} />
                  </button>
                  {isCustomScheduleOpen ? (
                    <div className="chat-schedule-custom">
                      <label className="label-xs-semibold" htmlFor={`schedule-${project.id}-${channel}`}>
                        Date and time
                      </label>
                      <input
                        id={`schedule-${project.id}-${channel}`}
                        type="datetime-local"
                        value={customScheduleValue}
                        onChange={(event) => setCustomScheduleValue(event.target.value)}
                      />
                      <button
                        className="chat-schedule-confirm label-s-semibold"
                        type="button"
                        disabled={!customScheduleValue}
                        onClick={() => {
                          const label = formatScheduledDate(customScheduleValue);

                          if (label) {
                            scheduleMessage(label);
                          }
                        }}
                      >
                        <DsIcon name="clock-clockwise" size={16} />
                        Schedule message
                      </button>
                    </div>
                  ) : null}
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </div>

      <input
        className="sr-only"
        ref={fileInputRef}
        type="file"
        multiple
        accept="image/*,video/*,.pdf,.doc,.docx"
        onChange={(event) => {
          addFiles(Array.from(event.target.files ?? []));
          event.target.value = "";
        }}
      />
    </section>
  );
}

function getComposerPlaceholder(
  basePlaceholder: string,
  project: ChatProject,
  channel: ChatChannel,
  source: ChatSource,
) {
  if (channel !== "external" || source === "brisk") {
    return basePlaceholder;
  }

  const clientPossessive = makePossessive(project.clientName);
  const connectorDetail = project.connectors[source].detail;
  const destination = source === "email" && connectorDetail.startsWith("project-code@")
    ? `${project.code.toLowerCase()}@in.briskapp.com`
    : connectorDetail;

  if (source === "slack") {
    return `${basePlaceholder} and send to ${clientPossessive} ${destination} Slack channel`;
  }

  if (source === "whatsapp") {
    return `${basePlaceholder} and send to ${clientPossessive} WhatsApp channel`;
  }

  if (source === "teams") {
    return `${basePlaceholder} and send to ${clientPossessive} Microsoft Teams channel`;
  }

  return `${basePlaceholder} and email to ${destination}`;
}

function makePossessive(name: string) {
  return name.toLowerCase().endsWith("s") ? `${name}’` : `${name}’s`;
}

function formatFileSize(bytes: number) {
  if (bytes < 1_000_000) {
    return `${Math.max(1, Math.round(bytes / 1_000))} KB`;
  }

  return `${(bytes / 1_000_000).toFixed(1)} MB`;
}

function formatScheduledDate(value: string) {
  const scheduledDate = new Date(value);

  if (Number.isNaN(scheduledDate.getTime())) {
    return null;
  }

  const date = new Intl.DateTimeFormat("en-AU", {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(scheduledDate);
  const time = new Intl.DateTimeFormat("en-AU", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(scheduledDate).toLowerCase();

  return `${date} at ${time}`;
}

function lowercaseInitial(value: string) {
  return `${value.charAt(0).toLowerCase()}${value.slice(1)}`;
}
