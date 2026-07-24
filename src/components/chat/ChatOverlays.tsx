"use client";

import { useMemo, useState } from "react";
import { CommentAvatar } from "@/components/comments/CommentPrimitives";
import { getMessageSourceDirection, getSourceLabel, SourceLogo } from "@/components/chat/SourceLogo";
import { DsIcon } from "@/components/video-review/DsIcon";
import type {
  ChatClientStatus,
  ChatConnectorSource,
  ChatMessage,
  ChatProject,
  ChatRole,
  ChatSource,
  ChatUser,
} from "@/components/chat/types";
import { attachmentMatches, formatCompactDate } from "@/components/chat/chat-utils";

type SearchOverlayProps = {
  messages: ChatMessage[];
  projects: ChatProject[];
  users: ChatUser[];
  role: ChatRole;
  currentUserId: string;
  onClose: () => void;
  onSelectMessage: (message: ChatMessage) => void;
};

export function ChatSearchOverlay({
  messages,
  projects,
  users,
  role,
  currentUserId,
  onClose,
  onSelectMessage,
}: SearchOverlayProps) {
  const [query, setQuery] = useState("");
  const usersById = useMemo(() => new Map(users.map((user) => [user.id, user])), [users]);
  const projectsById = useMemo(
    () => new Map(projects.map((project) => [project.id, project])),
    [projects],
  );
  const parsedQuery = parseSearchQuery(query);
  const accessibleProjectIds =
    role === "Customer"
      ? new Set(projects.filter((project) => project.clientMemberIds.includes(currentUserId)).map((project) => project.id))
      : new Set(projects.map((project) => project.id));
  const results = messages
    .filter((message) => message.threadId === null && !message.deletedAt)
    .filter((message) => accessibleProjectIds.has(message.projectId))
    .filter((message) => role !== "Customer" || message.channel === "external")
    .filter((message) => {
      const project = projectsById.get(message.projectId);
      const sender = message.senderId ? usersById.get(message.senderId) : undefined;
      const matchesText =
        !parsedQuery.text ||
        `${message.body} ${project?.code ?? ""} ${project?.title ?? ""} ${sender?.name ?? ""}`
          .toLowerCase()
          .includes(parsedQuery.text);
      const matchesProject =
        !parsedQuery.project ||
        `${project?.code ?? ""} ${project?.title ?? ""}`
          .toLowerCase()
          .includes(parsedQuery.project);
      const matchesSender =
        !parsedQuery.sender || sender?.name.toLowerCase().includes(parsedQuery.sender);
      const requestedAttachmentType = parsedQuery.has;
      const matchesAttachment =
        !requestedAttachmentType ||
        message.attachments.some((attachment) =>
          attachmentMatches(attachment, requestedAttachmentType),
        ) ||
        (requestedAttachmentType === "link" && /https?:\/\//u.test(message.body));
      const createdAt = new Date(message.createdAt).getTime();
      const matchesBefore =
        !parsedQuery.before || createdAt < new Date(parsedQuery.before).getTime();
      const matchesAfter =
        !parsedQuery.after || createdAt > new Date(parsedQuery.after).getTime();

      return (
        matchesText &&
        matchesProject &&
        matchesSender &&
        matchesAttachment &&
        matchesBefore &&
        matchesAfter
      );
    })
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt))
    .slice(0, 20);

  return (
    <div className="chat-modal-backdrop" role="presentation" onMouseDown={onClose}>
      <section
        className="chat-search-modal"
        role="dialog"
        aria-modal="true"
        aria-label="Search all messages"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="chat-search-field">
          <DsIcon name="search" size={20} />
          <input
            autoFocus
            value={query}
            placeholder="Search messages or use in:, from:, has:, before:, after:"
            aria-label="Search messages"
            onChange={(event) => setQuery(event.target.value)}
          />
          <kbd>Esc</kbd>
        </div>
        <div className="chat-search-filter-hints">
          {["In:LOOM-24", "From:Jess", "Has:file", "After:2026-07-20"].map((hint) => (
            <button
              className="label-xs-semibold"
              type="button"
              key={hint}
              onClick={() => setQuery((current) => `${current}${current ? " " : ""}${hint}`)}
            >
              {hint}
            </button>
          ))}
        </div>
        <div className="chat-search-results">
          {results.map((message) => {
            const project = projectsById.get(message.projectId);
            const sender = message.senderId ? usersById.get(message.senderId) : undefined;

            if (!project) {
              return null;
            }

            return (
              <button
                className="chat-search-result"
                type="button"
                key={message.id}
                onClick={() => onSelectMessage(message)}
              >
                <span className="chat-search-result-project">
                  <span className="chat-project-card-icon"><DsIcon name="chat-circle" size={16} /></span>
                  <span>
                    <strong className="label-xs-semibold">{project.code}</strong>
                    <small className="label-xs">{project.title}</small>
                  </span>
                </span>
                <span className="chat-search-result-message">
                  {sender ? <CommentAvatar user={sender} compact /> : null}
                  <span>
                    <strong className="label-xs-semibold">
                      {sender?.name ?? message.senderSystem ?? "Brisk"}
                    </strong>
                    <small className="label-s">{message.body}</small>
                  </span>
                  <SourceLogo
                    source={message.sourceChannel}
                    project={project}
                    direction={getMessageSourceDirection(message)}
                    senderName={sender?.name}
                    tooltipFocusable={false}
                  />
                </span>
                <time className="label-xs">{formatCompactDate(message.createdAt)}</time>
              </button>
            );
          })}
          {query && results.length === 0 ? (
            <div className="chat-search-empty">
              <DsIcon name="search" size={24} />
              <h2>No messages match “{query}”</h2>
              <p>Try a different search or clear filters.</p>
            </div>
          ) : null}
          {!query ? (
            <div className="chat-search-empty compact">
              <p>Search every project conversation you can access.</p>
            </div>
          ) : null}
        </div>
      </section>
    </div>
  );
}

type CustomerSettingsProps = {
  clientName: string;
  status: ChatClientStatus;
  projects: ChatProject[];
  companyUsers: ChatUser[];
  onClose: () => void;
  onStatusChange: (status: ChatClientStatus) => void;
  onProjectsChange: (projects: ChatProject[]) => void;
  onNotify: (message: string) => void;
};

const connectorSources: ChatConnectorSource[] = ["email", "whatsapp", "slack", "teams"];

export function CustomerSettings({
  clientName,
  status,
  projects,
  companyUsers,
  onClose,
  onStatusChange,
  onProjectsChange,
  onNotify,
}: CustomerSettingsProps) {
  const [activeTab, setActiveTab] = useState<"overview" | "people" | "connectors">("overview");
  const [isPreferredSourceMenuOpen, setIsPreferredSourceMenuOpen] = useState(false);
  const referenceProject = projects[0];
  const availablePreferredSources: ChatSource[] = referenceProject
    ? [
        "brisk",
        ...connectorSources.filter(
          (source) => referenceProject.connectors[source].enabled && referenceProject.connectors[source].connected,
        ),
      ]
    : ["brisk"];

  const updateConnector = (
    source: ChatConnectorSource,
    update: Partial<ChatProject["connectors"][ChatConnectorSource]>,
  ) => {
    onProjectsChange(
      projects.map((project) => ({
        ...project,
        connectors: {
          ...project.connectors,
          [source]: { ...project.connectors[source], ...update },
        },
      })),
    );
  };

  return (
    <div className="chat-modal-backdrop" role="presentation" onMouseDown={onClose}>
      <section
        className="chat-settings-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="chat-settings-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header>
          <div>
            <p className="label-xs">Customer settings</p>
            <h2 className="headings-2xs-bold" id="chat-settings-title">{clientName}</h2>
          </div>
          <button className="chat-icon-button" type="button" aria-label="Close settings" onClick={onClose}>
            <DsIcon name="x-close-cross" size={18} />
          </button>
        </header>

        <div className="chat-settings-tabs" role="tablist" aria-label="Customer settings sections">
          {(["overview", "people", "connectors"] as const).map((tab) => (
            <button
              className={`label-s-semibold ${activeTab === tab ? "active" : ""}`}
              type="button"
              role="tab"
              aria-selected={activeTab === tab}
              key={tab}
              onClick={() => setActiveTab(tab)}
            >
              {tab[0].toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>

        {activeTab === "overview" ? (
          <div className="chat-settings-section">
            <label className="chat-settings-field">
              <span>
                <strong className="label-s-semibold">Customer status</strong>
                <small className="label-xs">Controls where {clientName} appears in customer filters.</small>
              </span>
              <select className="label-s" value={status} onChange={(event) => onStatusChange(event.target.value as ChatClientStatus)}>
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
                <option value="Archived">Archived</option>
              </select>
            </label>
            <div className="chat-settings-summary-grid">
              <article>
                <span className="label-xs">Projects</span>
                <strong className="headings-xs-bold">{projects.length}</strong>
              </article>
              <article>
                <span className="label-xs">Customer users</span>
                <strong className="headings-xs-bold">{companyUsers.length}</strong>
              </article>
              <article>
                <span className="label-xs">Connected channels</span>
                <strong className="headings-xs-bold">{referenceProject ? connectorSources.filter((source) => referenceProject.connectors[source].enabled).length : 0}</strong>
              </article>
            </div>
          </div>
        ) : null}

        {activeTab === "people" ? (
          <div className="chat-settings-section">
            <div className="chat-settings-section-heading">
              <span>
                <strong className="label-s-semibold">People at {clientName}</strong>
                <small className="label-xs">These people can be added to individual projects.</small>
              </span>
              <button className="chat-primary-button label-s-semibold" type="button" onClick={() => onNotify(`Invite to ${clientName} ready`)}>
                <DsIcon name="plus" size={15} />
                Invite person
              </button>
            </div>
            <div className="chat-settings-member-list">
              {companyUsers.map((user) => (
                <article className="chat-settings-member-row" key={user.id}>
                  <CommentAvatar user={user} />
                  <span className="chat-settings-member-copy">
                    <strong className="label-s-semibold">{user.name}</strong>
                    <small className="label-xs">{user.roleLabel} · {user.email}</small>
                  </span>
                </article>
              ))}
            </div>
          </div>
        ) : null}

        {activeTab === "connectors" && referenceProject ? (
          <>
            <div className="chat-connector-guardrail">
              <DsIcon name="lock" size={18} />
              <span>
                <strong className="label-s-semibold">How connected channels work</strong>
                <p className="label-xs">
                  Your customer probably won&apos;t have Brisk open all day. Connect the channels they already use so nothing gets missed.
                </p>
                <p className="label-xs">
                  Every External message flows both ways: they can reply from Email, WhatsApp, Slack or Teams and it lands here. You reply here, and it reaches them there.
                </p>
              </span>
            </div>
            <div className="chat-connector-list">
              {connectorSources.map((source) => {
                const connector = referenceProject.connectors[source];
                return (
                  <article className="chat-connector-card" key={source}>
                    <div className="chat-connector-card-main">
                      <span className="chat-connector-logo-tile"><SourceLogo source={source} size={20} /></span>
                      <span>
                        <strong className="label-s-semibold">{formatSourceName(source)}</strong>
                        <small className="label-xs">{connector.detail}</small>
                      </span>
                    </div>
                    {!connector.connected ? (
                      <button className="chat-reconnect-button label-xs-semibold" type="button" onClick={() => updateConnector(source, { connected: true })}>Reconnect</button>
                    ) : (
                      <label className="chat-toggle">
                        <span className="sr-only">Enable {formatSourceName(source)}</span>
                        <input type="checkbox" checked={connector.enabled} onChange={(event) => updateConnector(source, { enabled: event.target.checked })} />
                        <span className="chat-toggle-track" aria-hidden="true">
                          <span className="chat-toggle-thumb" />
                        </span>
                      </label>
                    )}
                  </article>
                );
              })}
            </div>
            <div className="chat-preferred-source">
              <span>
                <strong className="label-s-semibold">Preferred outbound channel</strong>
                <small className="label-xs">New External messages for {clientName} use this channel by default.</small>
              </span>
              <div
                className="chat-source-picker chat-preferred-source-picker"
                onBlur={(event) => {
                  const nextFocus = event.relatedTarget;

                  if (!(nextFocus instanceof Node) || !event.currentTarget.contains(nextFocus)) {
                    setIsPreferredSourceMenuOpen(false);
                  }
                }}
                onKeyDown={(event) => {
                  if (event.key === "Escape") {
                    setIsPreferredSourceMenuOpen(false);
                  }
                }}
              >
                <button
                  className="chat-source-select label-xs-semibold"
                  type="button"
                  aria-haspopup="listbox"
                  aria-expanded={isPreferredSourceMenuOpen}
                  aria-label={`Choose preferred outbound channel. ${getSourceLabel(referenceProject.preferredSource)} selected`}
                  onClick={() => setIsPreferredSourceMenuOpen((isOpen) => !isOpen)}
                >
                  <SourceLogo source={referenceProject.preferredSource} size={16} tooltipFocusable={false} />
                  <span>{getSourceLabel(referenceProject.preferredSource)}</span>
                  <DsIcon name="caret-down" size={12} />
                </button>
                {isPreferredSourceMenuOpen ? (
                  <div className="chat-source-menu" role="listbox" aria-label="Preferred outbound channel">
                    {availablePreferredSources.map((source) => (
                      <button
                        className={`chat-source-option label-s ${source === referenceProject.preferredSource ? "selected" : ""}`}
                        type="button"
                        role="option"
                        aria-selected={source === referenceProject.preferredSource}
                        key={source}
                        onClick={() => {
                          onProjectsChange(projects.map((project) => ({ ...project, preferredSource: source })));
                          setIsPreferredSourceMenuOpen(false);
                        }}
                      >
                        <SourceLogo source={source} size={20} tooltipFocusable={false} />
                        <span>{getSourceLabel(source)}</span>
                        {source === referenceProject.preferredSource ? <DsIcon name="check" size={16} /> : null}
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>
            </div>
          </>
        ) : null}
      </section>
    </div>
  );
}

type ProjectMemberSettingsProps = {
  project: ChatProject;
  users: ChatUser[];
  companyUsers: ChatUser[];
  canManage?: boolean;
  onClose: () => void;
  onProjectChange: (project: ChatProject) => void;
};

export function ProjectMemberSettings({ project, users, companyUsers, canManage = true, onClose, onProjectChange }: ProjectMemberSettingsProps) {
  const usersById = new Map(users.map((user) => [user.id, user]));
  const studioUsers = project.memberIds.map((id) => usersById.get(id)).filter((user): user is ChatUser => Boolean(user && user.team === "studio"));
  const customerUsers = project.clientMemberIds.map((id) => usersById.get(id)).filter((user): user is ChatUser => Boolean(user));
  const availableStudioUsers = users.filter((user) => user.team === "studio" && !project.memberIds.includes(user.id));
  const availableCompanyUsers = companyUsers.filter((user) => !project.clientMemberIds.includes(user.id));

  const removeStudioMember = (userId: string) => onProjectChange({
    ...project,
    memberIds: project.memberIds.filter((id) => id !== userId),
  });
  const addStudioMember = (userId: string) => onProjectChange({
    ...project,
    memberIds: [...new Set([...project.memberIds, userId])],
  });
  const removeCustomer = (userId: string) => onProjectChange({
    ...project,
    memberIds: project.memberIds.filter((id) => id !== userId),
    clientMemberIds: project.clientMemberIds.filter((id) => id !== userId),
  });
  const addCustomer = (userId: string) => onProjectChange({
    ...project,
    memberIds: [...new Set([...project.memberIds, userId])],
    clientMemberIds: [...new Set([...project.clientMemberIds, userId])],
  });

  return (
    <div className="chat-modal-backdrop" role="presentation" onMouseDown={onClose}>
      <section className="chat-settings-modal" role="dialog" aria-modal="true" aria-labelledby="project-members-title" onMouseDown={(event) => event.stopPropagation()}>
        <header>
          <div>
            <h2 className="headings-2xs-bold" id="project-members-title">People with access</h2>
            <span className="label-s">{project.code} {project.title}</span>
          </div>
          <button className="chat-icon-button" type="button" aria-label="Close settings" onClick={onClose}><DsIcon name="x-close-cross" size={18} /></button>
        </header>
        <div className="chat-settings-section">
          <div className="chat-settings-member-group">
            <strong className="label-s-semibold">Studio team</strong>
            <div className="chat-settings-member-list">
              {studioUsers.map((user) => (
                <article className="chat-settings-member-row" key={user.id}>
                  <CommentAvatar user={user} />
                  <span className="chat-settings-member-copy"><strong className="label-s-semibold">{user.name}</strong><small className="label-xs">{user.roleLabel}</small></span>
                  {canManage ? <button className="chat-secondary-button label-xs-semibold" type="button" onClick={() => removeStudioMember(user.id)}>Remove</button> : null}
                </article>
              ))}
            </div>
          </div>
          {canManage && availableStudioUsers.length > 0 ? (
            <div className="chat-settings-member-group">
              <strong className="label-s-semibold">Add from your studio</strong>
              <div className="chat-settings-member-list">
                {availableStudioUsers.map((user) => (
                  <article className="chat-settings-member-row" key={user.id}>
                    <CommentAvatar user={user} />
                    <span className="chat-settings-member-copy"><strong className="label-s-semibold">{user.name}</strong><small className="label-xs">{user.roleLabel}</small></span>
                    <button className="chat-primary-button label-xs-semibold" type="button" onClick={() => addStudioMember(user.id)}><DsIcon name="plus" size={14} />Add</button>
                  </article>
                ))}
              </div>
            </div>
          ) : null}
          <div className="chat-settings-member-group">
            <strong className="label-s-semibold">{project.clientName} access</strong>
            <div className="chat-settings-member-list">
              {customerUsers.map((user) => (
                <article className="chat-settings-member-row" key={user.id}>
                  <CommentAvatar user={user} />
                  <span className="chat-settings-member-copy"><strong className="label-s-semibold">{user.name}</strong><small className="label-xs">{user.roleLabel} · {user.email}</small></span>
                  {canManage ? <button className="chat-secondary-button label-xs-semibold" type="button" onClick={() => removeCustomer(user.id)}>Remove</button> : null}
                </article>
              ))}
            </div>
          </div>
          {canManage && availableCompanyUsers.length > 0 ? (
            <div className="chat-settings-member-group">
              <strong className="label-s-semibold">Add from {project.clientName}</strong>
              <div className="chat-settings-member-list">
                {availableCompanyUsers.map((user) => (
                  <article className="chat-settings-member-row" key={user.id}>
                    <CommentAvatar user={user} />
                    <span className="chat-settings-member-copy"><strong className="label-s-semibold">{user.name}</strong><small className="label-xs">{user.roleLabel} · {user.email}</small></span>
                    <button className="chat-primary-button label-xs-semibold" type="button" onClick={() => addCustomer(user.id)}><DsIcon name="plus" size={14} />Add</button>
                  </article>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      </section>
    </div>
  );
}

export function ShortcutSheet({ onClose }: { onClose: () => void }) {
  const shortcuts = [
    ["⌘ K", "Jump to projects, DMs and messages"],
    ["⌘ ⇧ A", "Show all unreads"],
    ["⌘ B / ⌘ I", "Bold or italic in the composer"],
    ["⌘ Enter", "Send message"],
    ["Esc", "Close a thread or overlay"],
    ["↑", "Edit your last message"],
    ["⌘ /", "Show this shortcut sheet"],
  ];

  return (
    <div className="chat-modal-backdrop" role="presentation" onMouseDown={onClose}>
      <section
        className="chat-shortcuts-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="chat-shortcuts-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header>
          <h2 id="chat-shortcuts-title">Keyboard shortcuts</h2>
          <button className="chat-icon-button" type="button" aria-label="Close shortcuts" onClick={onClose}>
            <DsIcon name="x-close-cross" size={18} />
          </button>
        </header>
        <dl>
          {shortcuts.map(([keys, action]) => (
            <div key={keys}>
              <dt><kbd>{keys}</kbd></dt>
              <dd className="label-s">{action}</dd>
            </div>
          ))}
        </dl>
      </section>
    </div>
  );
}

function parseSearchQuery(query: string) {
  const lowerQuery = query.toLowerCase();
  const readToken = (name: string) =>
    lowerQuery.match(new RegExp(`(?:^|\\s)${name}:([^\\s]+)`, "u"))?.[1] ?? "";
  const hasToken = readToken("has");
  const text = lowerQuery
    .replace(/(?:^|\s)(?:in|from|has|before|after):[^\s]+/gu, " ")
    .trim();

  return {
    text,
    project: readToken("in"),
    sender: readToken("from"),
    has: hasToken === "link" || hasToken === "file" || hasToken === "image" ? hasToken : "",
    before: readToken("before"),
    after: readToken("after"),
  } as const;
}

function formatSourceName(source: ChatConnectorSource) {
  if (source === "whatsapp") {
    return "WhatsApp";
  }

  if (source === "teams") {
    return "Microsoft Teams";
  }

  return source[0].toUpperCase() + source.slice(1);
}
