"use client";

import { useEffect, useState } from "react";
import { Button } from "../../../Brisk DS/src/app/components/Button";
import { SourceLogo, getSourceLabel } from "@/components/chat/SourceLogo";
import { useStudioSettings } from "@/components/settings/StudioSettingsContext";
import { DsIcon } from "@/components/video-review/DsIcon";
import type { StudioIntegrationId } from "@/data/studio-settings";

const integrationCopy: Record<StudioIntegrationId, { description: string; scope: string }> = {
  whatsapp: {
    description: "Send and receive Client messages through your Studio’s WhatsApp Business account.",
    scope: "Choose the WhatsApp conversation for each project in its External Chat settings.",
  },
  slack: {
    description: "Keep Client conversations in sync through Slack Connect or the Brisk Slack app.",
    scope: "Choose the Slack channel for each project in its External Chat settings.",
  },
};

const integrationIds: StudioIntegrationId[] = ["whatsapp", "slack"];

export function StudioIntegrationsPage() {
  const { studio, updateIntegrationConnection } = useStudioSettings();
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    if (!toast) return;
    const timeout = window.setTimeout(() => setToast(null), 4000);
    return () => window.clearTimeout(timeout);
  }, [toast]);

  const reconnect = (integrationId: StudioIntegrationId) => {
    updateIntegrationConnection(integrationId, true);
    setToast(`${getSourceLabel(integrationId)} reconnected for ${studio.details.name}.`);
  };

  return (
    <section className="studio-settings-section" aria-labelledby="studio-integrations-title">
      <div className="studio-settings-info-block">
        <DsIcon name="info" size={18} />
        <div>
          <h2 className="label-m-semibold" id="studio-integrations-title">One connection for the whole Studio</h2>
          <p className="paragraph-s">
            Reconnect shared accounts here. Project-specific channels and conversations stay in each project’s External Chat settings.
          </p>
        </div>
      </div>

      <div className="studio-integration-list">
        {integrationIds.map((integrationId) => {
          const integration = studio.integrations[integrationId];
          const copy = integrationCopy[integrationId];
          const label = getSourceLabel(integrationId);

          return (
            <article className="studio-integration-card" key={integrationId}>
              <div className="studio-integration-heading">
                <span className="studio-integration-logo">
                  <SourceLogo source={integrationId} size={20} tooltipFocusable={false} />
                </span>
                <div>
                  <h2 className="headings-2xs-bold">{label}</h2>
                  <p className="paragraph-s">{copy.description}</p>
                </div>
                <span className={`studio-integration-status label-xs-semibold ${integration.connected ? "is-connected" : "needs-attention"}`}>
                  <DsIcon name={integration.connected ? "check-circle" : "alert-triangle"} size={14} />
                  {integration.connected ? "Connected" : "Reconnect required"}
                </span>
              </div>

              <div className="studio-integration-details">
                <div>
                  <span className="label-xs-semibold">Connected account</span>
                  <strong className="label-s-semibold">{integration.detail}</strong>
                </div>
                <p className="label-xs">{copy.scope}</p>
                {!integration.connected ? (
                  <Button size="M" onClick={() => reconnect(integrationId)}>Reconnect {label}</Button>
                ) : null}
              </div>
            </article>
          );
        })}
      </div>

      {toast ? (
        <div className="studio-settings-toast label-s-semibold" role="status">
          <DsIcon name="check-circle" size={16} />
          {toast}
        </div>
      ) : null}
    </section>
  );
}
