"use client";

import { useEffect, useState } from "react";
import { Button } from "../../../Brisk DS/src/app/components/Button";
import { EditingDialog } from "../../../Brisk DS/src/app/components/EditingDialog";
import { ConfirmationDialog } from "../../../Brisk DS/src/app/components/ConfirmationDialog";
import { SourceLogo, getSourceLabel } from "@/components/chat/SourceLogo";
import { useStudioSettings } from "./StudioSettingsContext";
import { SettingsSummaryRow } from "./SettingsSummaryRow";
import { DsIcon } from "@/components/video-review/DsIcon";
import type { StudioIntegrationId } from "@/data/studio-settings";

const integrationIds: StudioIntegrationId[] = ["whatsapp", "slack"];

export function StudioIntegrationsPage() {
  const { studio, updateIntegrationConnection } = useStudioSettings();
  const [selected, setSelected] = useState<StudioIntegrationId | null>(null);
  const [disconnecting, setDisconnecting] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const connection = selected ? studio.integrations[selected] : null;
  const label = selected ? getSourceLabel(selected) : "";

  useEffect(() => {
    if (!toast) return;
    const timeout = window.setTimeout(() => setToast(null), 4000);
    return () => window.clearTimeout(timeout);
  }, [toast]);

  function setConnection(connected: boolean) {
    if (!selected) return;
    updateIntegrationConnection(selected, connected);
    setToast(`${label} ${connected ? "reconnected" : "disconnected"} in this prototype.`);
    setDisconnecting(false);
    setSelected(null);
  }

  return <section className="studio-settings-section" aria-label="Studio messaging connections">
    <div className="studio-setup-settings-panel">
      {integrationIds.map((id) => <SettingsSummaryRow key={id} title={<SourceLogo source={id} size={20} withLabel tooltipFocusable={false} />} headingAs="h2"
        action={<Button size="S" variant="secondary" onClick={() => setSelected(id)}>{studio.integrations[id].connected ? "Manage" : "Reconnect"} {getSourceLabel(id)}</Button>}>
        <strong className="label-m-semibold">{studio.integrations[id].detail}</strong>
        <span className="paragraph-s">{studio.integrations[id].connected ? "Connected" : "Reconnect required"}</span>
        <p className="paragraph-s">{id === "whatsapp" ? "Send and receive Client messages through your WhatsApp Business account." : "Send and receive Client messages in a linked Slack channel."}</p>
      </SettingsSummaryRow>)}
    </div>
    <p className="paragraph-s studio-review-dialog-note">Connect your Studio’s account here, then choose a conversation or channel in each project’s External Chat settings. Client messages and replies sync with that conversation. Internal Chat stays private to your Studio.</p>
    {selected && connection ? <EditingDialog title={`${connection.connected ? "Manage" : "Reconnect"} ${label}`} onCancel={() => setSelected(null)}
      description="Manage the shared account used by your Studio."
      actions={<><Button size="S" variant="secondary" onClick={() => setSelected(null)}>Close</Button>{connection.connected
        ? <Button size="S" variant="danger" onClick={() => setDisconnecting(true)}>Disconnect {label}</Button>
        : <Button size="S" onClick={() => setConnection(true)}>Reconnect {label}</Button>}</>}>
      <div className="studio-editor-fields">
        <strong className="label-m-semibold">{connection.detail}</strong>
        <p className="paragraph-s">{connection.connected ? "Connected" : "Reconnect required"}</p>
        <p className="paragraph-s studio-review-dialog-note">Prototype connection only. No external account is contacted.</p>
      </div>
    </EditingDialog> : null}
    {disconnecting ? <ConfirmationDialog title={`Disconnect ${label}?`} description="New external messages will stop syncing through this shared account. Existing project messages stay available." confirmLabel="Disconnect" tone="danger" onConfirm={() => setConnection(false)} onCancel={() => setDisconnecting(false)} /> : null}
    {toast ? <div className="studio-settings-toast label-s-semibold" role="status"><DsIcon name="check-circle" size={16} />{toast}</div> : null}
  </section>;
}
