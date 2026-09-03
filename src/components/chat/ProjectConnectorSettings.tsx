"use client";

import Link from "next/link";
import { useState } from "react";
import { Button } from "../../../Brisk DS/src/app/components/Button";
import { SourceLogo, getSourceLabel } from "@/components/chat/SourceLogo";
import type {
  ChatConnectorSource,
  ChatProject,
  ChatSource,
  StudioChatConnectors,
} from "@/components/chat/types";
import { DsIcon } from "@/components/video-review/DsIcon";

type ProjectConnectorSettingsProps = {
  project: ChatProject;
  studioName: string;
  studioConnectors: StudioChatConnectors;
  onClose: () => void;
  onNotify: (message: string) => void;
  onProjectChange: (project: ChatProject) => void;
};

const connectorSources: ChatConnectorSource[] = ["whatsapp", "slack"];

export function ProjectConnectorSettings({
  project,
  studioName,
  studioConnectors,
  onClose,
  onNotify,
  onProjectChange,
}: ProjectConnectorSettingsProps) {
  const [configureSource, setConfigureSource] = useState<ChatConnectorSource | null>(null);
  const [whatsAppNumberOwner, setWhatsAppNumberOwner] = useState(
    project.connectors.whatsapp.numberOwner,
  );
  const [whatsAppConversation, setWhatsAppConversation] = useState(
    project.connectors.whatsapp.conversationName,
  );
  const [slackSetup, setSlackSetup] = useState(project.connectors.slack.setup);
  const [slackChannel, setSlackChannel] = useState(project.connectors.slack.channelName);

  const updateEnabled = (source: ChatConnectorSource, enabled: boolean) => {
    const preferredSource = !enabled && project.preferredSource === source
      ? "brisk"
      : project.preferredSource;

    if (source === "whatsapp") {
      onProjectChange({
        ...project,
        preferredSource,
        connectors: {
          ...project.connectors,
          whatsapp: { ...project.connectors.whatsapp, enabled },
        },
      });
    } else {
      onProjectChange({
        ...project,
        preferredSource,
        connectors: {
          ...project.connectors,
          slack: { ...project.connectors.slack, enabled },
        },
      });
    }

    onNotify(`${getSourceLabel(source)} ${enabled ? "enabled" : "turned off"} for ${project.code}`);
  };

  const saveConfiguration = (source: ChatConnectorSource) => {
    if (source === "whatsapp") {
      onProjectChange({
        ...project,
        connectors: {
          ...project.connectors,
          whatsapp: {
            ...project.connectors.whatsapp,
            detail: whatsAppConversation,
            numberOwner: whatsAppNumberOwner,
            conversationName: whatsAppConversation,
          },
        },
      });
    } else {
      const setupLabel = slackSetup === "slack-connect" ? "Slack Connect" : "Brisk Slack app";

      onProjectChange({
        ...project,
        connectors: {
          ...project.connectors,
          slack: {
            ...project.connectors.slack,
            detail: `${setupLabel} · ${slackChannel}`,
            setup: slackSetup,
            channelName: slackChannel,
          },
        },
      });
    }

    setConfigureSource(null);
    onNotify(`${getSourceLabel(source)} mapping saved for ${project.code}`);
  };

  const availableDefaultRoutes: ChatSource[] = [
    "brisk",
    ...connectorSources.filter(
      (source) => project.connectors[source].enabled && studioConnectors[source].connected,
    ),
  ];

  return (
    <div className="chat-modal-backdrop" role="presentation" onMouseDown={onClose}>
      <section
        className="chat-settings-modal chat-connector-settings-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="project-connectors-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header>
          <div>
            <p className="label-xs">{project.code} · {project.title}</p>
            <h2 className="headings-2xs-bold" id="project-connectors-title">
              External Chat settings
            </h2>
          </div>
          <button
            className="chat-icon-button"
            type="button"
            aria-label="Close External Chat settings"
            onClick={onClose}
          >
            <DsIcon name="x-close-cross" size={18} />
          </button>
        </header>

        <div className="chat-connector-intro">
          <DsIcon name="lock" size={18} />
          <span>
            <strong className="label-s-semibold">External messages only</strong>
            <p className="label-xs">
              Brisk keeps the complete conversation here. Internal Chat, notes, rates, costs and invoices never leave Brisk.
            </p>
          </span>
        </div>

        <div className="chat-connector-settings-content">
          <div className="chat-project-connector-list">
            {connectorSources.map((source) => {
              const connection = studioConnectors[source];
              const connector = project.connectors[source];
              return (
                <article className="chat-project-connector-card" key={source}>
                  <div className="chat-project-connector-heading">
                    <span className="chat-connector-logo-tile">
                      <SourceLogo source={source} size={20} tooltipFocusable={false} />
                    </span>
                    <span className="chat-project-connector-copy">
                      <strong className="label-s-semibold">{getSourceLabel(source)}</strong>
                      <small className="label-xs">{connector.detail}</small>
                    </span>
                    <span
                      className={`chat-connector-status label-xs-semibold ${connection.connected ? "is-connected" : "needs-attention"}`}
                    >
                      <DsIcon name={connection.connected ? "check-circle" : "alert-triangle"} size={14} />
                      {connection.connected ? `Connected for ${studioName}` : "Reconnect required"}
                    </span>
                  </div>

                  <div className="chat-project-connector-actions">
                    <label className="chat-project-connector-switch">
                      <span className="label-xs-semibold">Use for this project</span>
                      <span className={`chat-toggle ${!connection.connected ? "is-disabled" : ""}`}>
                        <input
                          type="checkbox"
                          role="switch"
                          checked={connector.enabled}
                          disabled={!connection.connected}
                          aria-label={`Use ${getSourceLabel(source)} for ${project.code}`}
                          onChange={(event) => updateEnabled(source, event.target.checked)}
                        />
                        <span className="chat-toggle-track" aria-hidden="true">
                          <span className="chat-toggle-thumb" />
                        </span>
                      </span>
                    </label>

                    {connection.connected ? (
                      <Button
                        className="chat-connector-ds-button"
                        variant="secondary"
                        size="S"
                        onClick={() => setConfigureSource((current) => current === source ? null : source)}
                      >
                        Configure
                      </Button>
                    ) : (
                      <Link className="chat-secondary-button label-xs-semibold" href="/settings/studio/integrations">
                        Open Studio Settings
                      </Link>
                    )}
                  </div>

                  {configureSource === source ? (
                    <div className="chat-connector-config-panel">
                      {source === "whatsapp" ? (
                        <>
                          <label className="chat-connector-config-field">
                            <span>
                              <strong className="label-xs-semibold">Business number</strong>
                              <small className="label-xs">Use a Studio-owned or Client-owned WhatsApp Business number.</small>
                            </span>
                            <select
                              className="label-s"
                              value={whatsAppNumberOwner}
                              onChange={(event) => setWhatsAppNumberOwner(event.target.value as "studio" | "client")}
                            >
                              <option value="studio">{studioName} Business</option>
                              <option value="client">{project.clientName} Business</option>
                            </select>
                          </label>
                          <label className="chat-connector-config-field">
                            <span>
                              <strong className="label-xs-semibold">Client conversation</strong>
                              <small className="label-xs">Incoming replies return to this project&apos;s External Chat.</small>
                            </span>
                            <select
                              className="label-s"
                              value={whatsAppConversation}
                              onChange={(event) => setWhatsAppConversation(event.target.value)}
                            >
                              <option>{project.clientName} project group</option>
                              <option>{project.clientName} approvals</option>
                              <option>{project.connectors.whatsapp.conversationName}</option>
                            </select>
                          </label>
                          <p className="chat-connector-config-note label-xs">
                            First-contact messages use an approved WhatsApp template when required.
                          </p>
                        </>
                      ) : (
                        <>
                          <label className="chat-connector-config-field">
                            <span>
                              <strong className="label-xs-semibold">Slack setup</strong>
                              <small className="label-xs">Use Slack Connect or the Brisk Slack app for this Client workspace.</small>
                            </span>
                            <select
                              className="label-s"
                              value={slackSetup}
                              onChange={(event) => setSlackSetup(event.target.value as "slack-connect" | "brisk-app")}
                            >
                              <option value="slack-connect">Slack Connect</option>
                              <option value="brisk-app">Brisk Slack app</option>
                            </select>
                          </label>
                          <label className="chat-connector-config-field">
                            <span>
                              <strong className="label-xs-semibold">Mapped channel</strong>
                              <small className="label-xs">Messages, files, threads and mentions stay with this project.</small>
                            </span>
                            <select
                              className="label-s"
                              value={slackChannel}
                              onChange={(event) => setSlackChannel(event.target.value)}
                            >
                              <option>#{project.code.toLowerCase()}-client</option>
                              <option>#{project.clientName.toLowerCase().replaceAll(" ", "-")}-video-production</option>
                              <option>{project.connectors.slack.channelName}</option>
                            </select>
                          </label>
                          <p className="chat-connector-config-note label-xs">
                            Slack reactions appear in Brisk as display-only in V1.
                          </p>
                        </>
                      )}

                      <div className="chat-connector-config-actions">
                        <Button
                          className="chat-connector-ds-button"
                          variant="secondary"
                          size="S"
                          onClick={() => setConfigureSource(null)}
                        >
                          Cancel
                        </Button>
                        <Button
                          className="chat-connector-ds-button"
                          size="S"
                          onClick={() => saveConfiguration(source)}
                        >
                          Save mapping
                        </Button>
                      </div>
                    </div>
                  ) : null}
                </article>
              );
            })}
          </div>

          <fieldset className="chat-default-route">
            <legend className="label-s-semibold">Default route for new outgoing messages</legend>
            <p className="label-xs">Filmmakers can still choose another enabled route before sending.</p>
            <div className="chat-default-route-options">
              {availableDefaultRoutes.map((source) => (
                <label className="chat-default-route-option" key={source}>
                  <input
                    type="radio"
                    name={`default-route-${project.id}`}
                    value={source}
                    checked={project.preferredSource === source}
                    onChange={() => onProjectChange({ ...project, preferredSource: source })}
                  />
                  <SourceLogo source={source} size={20} tooltipFocusable={false} />
                  <span className="label-s-semibold">
                    {source === "brisk" ? "Brisk only" : getSourceLabel(source)}
                  </span>
                </label>
              ))}
            </div>
          </fieldset>
        </div>
      </section>
    </div>
  );
}
