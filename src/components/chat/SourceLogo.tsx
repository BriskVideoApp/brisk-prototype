"use client";

import { useId } from "react";
import type {
  ChatMessage,
  ChatProject,
  ChatSource,
} from "@/components/chat/types";

const sourceDetails: Record<ChatSource, { label: string; src: string }> = {
  brisk: { label: "Brisk", src: "/assets/logos/brisk.svg" },
  whatsapp: { label: "WhatsApp", src: "/assets/logos/whatsapp.svg" },
  slack: { label: "Slack", src: "/assets/logos/slack.svg" },
};

type SourceDirection = "inbound" | "outbound" | "composer" | "native" | "internal";

type SourceTooltipCopy = {
  title: string;
  summary: string;
  explanation: string;
};

export function SourceLogo({
  source,
  size = 16,
  withLabel = false,
  project,
  direction,
  senderName,
  tooltipPlacement = "start",
  tooltipFocusable = true,
}: {
  source: ChatSource;
  size?: 14 | 16 | 20;
  withLabel?: boolean;
  project?: ChatProject;
  direction?: SourceDirection;
  senderName?: string;
  tooltipPlacement?: "start" | "end";
  tooltipFocusable?: boolean;
}) {
  const details = sourceDetails[source];
  const tooltipId = useId();
  const tooltipCopy = project && direction
    ? getSourceTooltipCopy(source, direction, project)
    : null;

  return (
    <span
      className={`chat-source-logo-wrap ${tooltipCopy ? "has-tooltip" : ""} ${tooltipPlacement}`}
      title={tooltipCopy ? undefined : details.label}
      tabIndex={tooltipCopy && tooltipFocusable ? 0 : undefined}
      aria-describedby={tooltipCopy && tooltipFocusable ? tooltipId : undefined}
    >
      {/* Brand SVGs are exported from the Brisk DS logo library. */}
      <img
        className="chat-source-logo"
        src={details.src}
        alt=""
        width={size}
        height={size}
      />
      {withLabel ? <span>{details.label}</span> : null}
      {tooltipCopy ? (
        <span className="chat-source-tooltip" id={tooltipId} role="tooltip">
          <strong className="label-s-semibold">{tooltipCopy.title}</strong>
          <span className="label-xs">{tooltipCopy.summary}</span>
          <span className="label-xs">{tooltipCopy.explanation}</span>
        </span>
      ) : null}
    </span>
  );
}

export function getMessageSourceDirection(message: ChatMessage): SourceDirection {
  if (message.channel === "internal") {
    return "internal";
  }

  if (message.sourceChannel === "brisk") {
    return "native";
  }

  return message.senderRole === "client" ? "inbound" : "outbound";
}

export function getSourceLabel(source: ChatSource) {
  return sourceDetails[source].label;
}

function getSourceTooltipCopy(
  source: ChatSource,
  direction: SourceDirection,
  project: ChatProject,
): SourceTooltipCopy {
  const clientName = project.clientName;

  if (direction === "internal") {
    return {
      title: "Internal message - Brisk only",
      summary: "This message is visible only to members of your studio. Clients cannot see it.",
      explanation: "It will never be sent to WhatsApp or Slack.",
    };
  }

  if (source === "brisk" || direction === "native") {
    return direction === "composer"
      ? {
          title: "Send only in Brisk",
          summary: "When you send this message, it will appear in this External chat for everyone who has access to it.",
          explanation: "It will not be sent to WhatsApp or Slack.",
        }
      : {
          title: "Sent only in Brisk",
          summary: "This message was written directly in Brisk and is visible to everyone who has access to this External chat.",
          explanation: "It was not sent to WhatsApp or Slack.",
        };
  }

  const audience = source === "whatsapp"
    ? project.connectors.whatsapp.audience ?? { kind: "shared" as const }
    : { kind: "shared" as const };
  const isIndividual = audience.kind === "individual";
  const connectedName = isIndividual ? audience.contactName : clientName;
  const connectorName = sourceDetails[source].label;
  const replyOwner = isIndividual ? audience.possessiveAdjective : "Their team's";
  const replyDestination = isIndividual ? audience.possessiveAdjective.toLowerCase() : "their";

  return {
    title: `${makePossessive(connectedName)} ${connectorName} is connected`,
    summary: `${replyOwner} ${connectorName} replies appear here.`,
    explanation: `Reply here and Brisk will send it to ${replyDestination} ${connectorName} too.`,
  };
}

function makePossessive(name: string) {
  return name.toLowerCase().endsWith("s") ? `${name}'` : `${name}'s`;
}
