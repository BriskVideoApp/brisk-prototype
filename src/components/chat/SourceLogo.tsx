"use client";

import { useId } from "react";
import type {
  ChatMessage,
  ChatProject,
  ChatSource,
} from "@/components/chat/types";

const sourceDetails: Record<ChatSource, { label: string; src: string }> = {
  brisk: { label: "Brisk", src: "/assets/logos/brisk.svg" },
  email: { label: "Email", src: "/assets/logos/email.svg" },
  whatsapp: { label: "WhatsApp", src: "/assets/logos/whatsapp.svg" },
  slack: { label: "Slack", src: "/assets/logos/slack.svg" },
  teams: { label: "Microsoft Teams", src: "/assets/logos/teams.svg" },
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
    ? getSourceTooltipCopy(source, direction, project, senderName)
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
  senderName?: string,
): SourceTooltipCopy {
  const clientName = project.clientName;

  if (direction === "internal") {
    return {
      title: "Internal message - Brisk only",
      summary: "This message is visible only to members of your studio. Clients cannot see it.",
      explanation: "It will never be sent by email, WhatsApp, Slack or Microsoft Teams.",
    };
  }

  if (source === "brisk" || direction === "native") {
    return direction === "composer"
      ? {
          title: "Send only in Brisk",
          summary: "When you send this message, it will appear in this External chat for everyone who has access to it.",
          explanation: "It will not be sent by email, WhatsApp, Slack or Microsoft Teams.",
        }
      : {
          title: "Sent only in Brisk",
          summary: "This message was written directly in Brisk and is visible to everyone who has access to this External chat.",
          explanation: "It was not sent by email, WhatsApp, Slack or Microsoft Teams.",
        };
  }

  const connector = project.connectors[source];
  const destination = source === "email" && connector.detail.startsWith("project-code@")
    ? `${project.code.toLowerCase()}@in.briskapp.com`
    : connector.detail;
  const clientPossessive = makePossessive(clientName);

  if (source === "slack") {
    if (direction === "inbound") {
      return {
        title: `Received from ${clientPossessive} Slack workspace`,
        summary: `This message was written in ${destination} in ${clientPossessive} Slack workspace. Brisk copied it into this External chat so the ${clientName} team and your studio team can read and reply here.`,
        explanation: `If you reply using the message box below while Slack is selected, Brisk will post your reply to ${destination} in ${clientPossessive} Slack workspace and keep a copy in this External chat. Internal messages are never sent to Slack.`,
      };
    }

    if (direction === "composer") {
      return {
        title: `Send to ${clientPossessive} Slack workspace`,
        summary: `When you send this message, Brisk will add it to this External chat and post it to ${destination} in ${clientPossessive} Slack workspace. Everyone with access to that channel will be able to read it.`,
        explanation: "Replies written in Slack will be copied back into this chat. Internal messages are never sent to Slack.",
      };
    }

    return {
      title: `Sent to ${clientPossessive} Slack workspace`,
      summary: `This message was written in Brisk and posted to ${destination} in ${clientPossessive} Slack workspace. Everyone with access to that channel can read it, including people who do not use Brisk.`,
      explanation: `If you reply using the message box below while Slack is selected, Brisk will post your reply to ${destination} in ${clientPossessive} Slack workspace and keep a copy in this External chat. Replies written in Slack will also appear here.`,
    };
  }

  if (source === "email") {
    if (direction === "inbound") {
      return {
        title: `Received through ${clientPossessive} project email conversation`,
        summary: `This message was sent to ${destination} and copied into this External chat. Your studio can read and reply to it in Brisk.`,
        explanation: `If you reply using the message box below while Email is selected, Brisk will email your reply to the ${clientName} recipients connected to this project and keep a copy in this External chat. Their email replies will also appear here.`,
      };
    }

    if (direction === "composer") {
      return {
        title: `Send by email to ${clientName}`,
        summary: `When you send this message, Brisk will add it to this External chat and email it to the ${clientName} recipients connected to this project, using ${destination}.`,
        explanation: "Their email replies will be copied back into this chat. Internal messages are never sent by email.",
      };
    }

    return {
      title: `Sent by email to ${clientName}`,
      summary: `This message was written in Brisk and emailed to the ${clientName} recipients connected to this project, using ${destination}.`,
      explanation: `If you reply using the message box below while Email is selected, Brisk will email your reply to the ${clientName} recipients connected to this project and keep a copy in this External chat. Their email replies will also appear here.`,
    };
  }

  if (source === "whatsapp") {
    const audience = connector.audience ?? { kind: "shared" as const };
    const isIndividual = audience.kind === "individual";
    const connectedName = isIndividual ? audience.contactName : clientName;
    const connectedPossessive = makePossessive(connectedName);
    const replyOwner = isIndividual ? audience.possessiveAdjective : "Their team’s";
    const replyDestination = isIndividual ? audience.possessiveAdjective.toLowerCase() : "their";

    if (direction === "inbound") {
      return {
        title: `${connectedPossessive} WhatsApp is connected`,
        summary: `${replyOwner} WhatsApp replies appear here.`,
        explanation: `Reply here and Brisk will send it to ${replyDestination} WhatsApp too.`,
      };
    }

    if (direction === "composer") {
      return {
        title: `Send to ${connectedPossessive} WhatsApp`,
        summary: `Brisk will keep this message here and send it to ${replyDestination} WhatsApp too.`,
        explanation: `${replyOwner} WhatsApp replies will appear here. Internal chat never leaves Brisk.`,
      };
    }

    return {
      title: `Sent to ${connectedPossessive} WhatsApp`,
      summary: `Brisk kept this message here and sent it to ${replyDestination} WhatsApp too.`,
      explanation: `${replyOwner} WhatsApp replies appear here.`,
    };
  }

  if (direction === "inbound") {
    return {
      title: `Received from ${clientPossessive} Microsoft Teams organisation`,
      summary: `This message was written in ${destination} in ${clientPossessive} Microsoft Teams organisation. Brisk copied it into this External chat so both teams can read and reply here.`,
      explanation: `If you reply using the message box below while Microsoft Teams is selected, Brisk will post your reply to ${destination} in ${clientPossessive} Microsoft Teams organisation and keep a copy in this External chat. Internal messages are never sent to Microsoft Teams.`,
    };
  }

  if (direction === "composer") {
    return {
      title: `Send to ${clientPossessive} Microsoft Teams organisation`,
      summary: `When you send this message, Brisk will add it to this External chat and post it to ${destination} in ${clientPossessive} Microsoft Teams organisation.`,
      explanation: "Replies written in Microsoft Teams will be copied back into this chat. Internal messages are never sent to Microsoft Teams.",
    };
  }

  return {
    title: `Sent to ${clientPossessive} Microsoft Teams organisation`,
    summary: `This message was written in Brisk and posted to ${destination} in ${clientPossessive} Microsoft Teams organisation. Everyone with access to that channel can read it.`,
    explanation: `If you reply using the message box below while Microsoft Teams is selected, Brisk will post your reply to ${destination} in ${clientPossessive} Microsoft Teams organisation and keep a copy in this External chat. Replies written in Microsoft Teams will also appear here.`,
  };
}

function makePossessive(name: string) {
  return name.toLowerCase().endsWith("s") ? `${name}’` : `${name}’s`;
}
