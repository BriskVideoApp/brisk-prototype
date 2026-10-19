"use client";

import { BriskSelect } from "@/components/form/BriskSelect";

import { EditingDialog } from "../../../Brisk DS/src/app/components/EditingDialog";

import Link from "next/link";
import { useState } from "react";
import { Button } from "../../../Brisk DS/src/app/components/Button";
import { Radio } from "../../../Brisk DS/src/app/components/Radio";
import { Toggle } from "../../../Brisk DS/src/app/components/Toggle";
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
    <> <EditingDialog title={<>External Chat settings
            </>} onCancel={onClose} size="wide" description={<>  <div>
            <p className="label-xs">{project.code} · {project.title}</p>

          </div>    </>}>  <div className="chat-connector-intro">
          <DsIcon name="lock" size={18} />
          <span>
            <strong className="label-s-semibold">External messages only</strong>
            <p className="label-xs">
              Brisk keeps the complete conversation here. Internal Chat, notes, rates, costs and invoices never leave Brisk.
            </p>
          </span>
        </div>  <div className="chat-connector-settings-content">
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
                    <Toggle
                      wrapperClassName="chat-project-connector-switch"
                      label={<span className="label-xs-semibold">Use for this project</span>}
                      checked={connector.enabled}
                      disabled={!connection.connected}
                      aria-label={`Use ${getSourceLabel(source)} for ${project.code}`}
                      onChange={(event) => updateEnabled(source, event.target.checked)}
                    />

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
                            <BriskSelect<string> ariaLabel={"Business number"} clearable={false} placeholder={"Choose an option"} triggerClassName="label-s" value={whatsAppNumberOwner} onChange={(value) => setWhatsAppNumberOwner(value as "studio" | "client")} options={[{ value: "studio", label: ((studioName) + " Business") }, { value: "client", label: ((project.clientName) + " Business") }]} />
                          </label>
                          <label className="chat-connector-config-field">
                            <span>
                              <strong className="label-xs-semibold">Client conversation</strong>
                              <small className="label-xs">Incoming replies return to this project&apos;s External Chat.</small>
                            </span>
                            <BriskSelect<string> ariaLabel={"Client conversation"} clearable={false} placeholder={"Choose an option"} triggerClassName="label-s" value={whatsAppConversation} onChange={(value) => setWhatsAppConversation(value)} options={[{ value: ((project.clientName) + " project group"), label: ((project.clientName) + " project group") }, { value: ((project.clientName) + " approvals"), label: ((project.clientName) + " approvals") }, { value: (project.connectors.whatsapp.conversationName), label: (project.connectors.whatsapp.conversationName) }]} />
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
                            <BriskSelect<string> ariaLabel={"Slack setup"} clearable={false} placeholder={"Choose an option"} triggerClassName="label-s" value={slackSetup} onChange={(value) => setSlackSetup(value as "slack-connect" | "brisk-app")} options={[{ value: "slack-connect", label: "Slack Connect" }, { value: "brisk-app", label: "Brisk Slack app" }]} />
                          </label>
                          <label className="chat-connector-config-field">
                            <span>
                              <strong className="label-xs-semibold">Mapped channel</strong>
                              <small className="label-xs">Messages, files, threads and mentions stay with this project.</small>
                            </span>
                            <BriskSelect<string> ariaLabel={"Mapped channel"} clearable={false} placeholder={"Choose an option"} triggerClassName="label-s" value={slackChannel} onChange={(value) => setSlackChannel(value)} options={[{ value: ("#" + (project.code.toLowerCase()) + "-client"), label: ("#" + (project.code.toLowerCase()) + "-client") }, { value: ("#" + (project.clientName.toLowerCase().replaceAll(" ", "-")) + "-video-production"), label: ("#" + (project.clientName.toLowerCase().replaceAll(" ", "-")) + "-video-production") }, { value: (project.connectors.slack.channelName), label: (project.connectors.slack.channelName) }]} />
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
                <Radio
                  wrapperClassName="chat-default-route-option"
                  key={source}
                  name={`default-route-${project.id}`}
                  value={source}
                  checked={project.preferredSource === source}
                  onChange={() => onProjectChange({ ...project, preferredSource: source })}
                  label={<span className="chat-default-route-copy"><SourceLogo source={source} size={20} tooltipFocusable={false} /><span className="label-s-semibold">{source === "brisk" ? "Brisk only" : getSourceLabel(source)}</span></span>}
                />
              ))}
            </div>
          </fieldset>
        </div> </EditingDialog> </>
  );
}
