"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Button } from "../../../Brisk DS/src/app/components/Button";
import { Input } from "../../../Brisk DS/src/app/components/Input";
import { usePrototypeScenario } from "@/components/prototype-scenarios/PrototypeScenarioContext";
import { DsIcon } from "@/components/video-review/DsIcon";
import { useStudioSettings } from "@/components/settings/StudioSettingsContext";
import { usePrototypeState } from "@/components/prototype-state/PrototypeStateContext";

export function PrototypeJourneyEntry() {
  const router = useRouter();
  const { activeScenario, hasLoadedScenario } = usePrototypeScenario();
  const { studio } = useStudioSettings();
  const { state } = usePrototypeState();
  const [name, setName] = useState("Jess Taylor");
  const [email, setEmail] = useState("jess@loom.com");

  useEffect(() => {
    if (hasLoadedScenario && !activeScenario) router.replace("/prototype/scenarios");
  }, [activeScenario, hasLoadedScenario, router]);

  useEffect(() => {
    if (
      activeScenario
      && !["client-magic-link", "freelancer-invitation", "studio-invitation"].includes(activeScenario.entry)
    ) {
      router.replace(activeScenario.startHref);
    }
  }, [activeScenario, router]);

  if (!hasLoadedScenario || !activeScenario) return null;

  const isClient = activeScenario.entry === "client-magic-link";
  const isFreelancer = activeScenario.entry === "freelancer-invitation";
  const isTeamMember = activeScenario.entry === "studio-invitation";
  const entryClient = activeScenario.clientId
    ? state.clients.find((client) => client.workspaceId === activeScenario.workspaceId && client.id === activeScenario.clientId) ?? null
    : null;

  if (!isClient && !isFreelancer && !isTeamMember) return null;

  const continueJourney = (event: FormEvent) => {
    event.preventDefault();
    if (isClient && (!name.trim() || !email.trim())) return;
    window.location.assign(activeScenario.continuationHref);
  };

  return (
    <main className={`prototype-entry-page ${isClient ? "is-client-entry" : ""}`}>
      {isClient ? (
        <header className="prototype-entry-brand" aria-label={`${studio.details.name} Client portal`}>
          <span className="prototype-entry-brand-logo" aria-hidden="true">
            {studio.branding.logoPreviewUrl ? <img src={studio.branding.logoPreviewUrl} alt="" /> : studio.details.name.split(/\s+/u).map((part) => part.charAt(0)).slice(0, 2).join("")}
          </span>
          <strong className="label-m-semibold">{studio.details.name}</strong>
        </header>
      ) : null}
      <section className="prototype-entry-card" aria-labelledby="prototype-entry-title">
        <header>
          <span className="prototype-entry-mark" aria-hidden="true"><DsIcon name={isClient ? "link" : "users-three"} size={24} /></span>
          <div>
            <span className="label-xs-semibold">Prototype journey entry</span>
            <h1 className="headings-s-bold" id="prototype-entry-title">
              {isClient
                ? `Welcome to ${activeScenario.workspaceLabel}`
                : `You’re invited to ${activeScenario.workspaceLabel}`}
            </h1>
          </div>
        </header>

        <p className="paragraph-s">
          {isClient
            ? "Confirm your details to open the Client portal. You do not need a password."
            : isFreelancer
              ? "Accept the invitation to join this Studio as a Freelancer. You will only see work the Studio assigns to you."
              : "Join the Studio workspace using the access included in this invitation."}
        </p>

        {!isClient ? <div className="prototype-entry-access">
          <DsIcon name="lock" size={16} />
          <span className="label-s">{isFreelancer ? "Access role: Studio Freelancer" : "Access role: Studio Staff"}</span>
        </div> : null}

        <form onSubmit={continueJourney}>
          {isClient ? (
            <div className="prototype-entry-fields">
              <Input label="Name" value={name} onChange={(event) => setName(event.target.value)} />
              <Input label="Email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} />
            </div>
          ) : (
            <dl className="prototype-entry-details">
              <div><dt className="label-xs">Invited as</dt><dd className="label-s-semibold">{activeScenario.participantName}</dd></div>
              <div><dt className="label-xs">Workspace</dt><dd className="label-s-semibold">{activeScenario.workspaceLabel}</dd></div>
            </dl>
          )}

          {isClient ? <div className="prototype-entry-access prototype-entry-client-identity">
            <span className="prototype-entry-client-mark label-xs-semibold" aria-hidden="true">
              {entryClient?.logoUrl ? <img src={entryClient.logoUrl} alt="" /> : entryClient?.name.slice(0, 1) ?? "C"}
            </span>
            <span><small className="label-xs">Client workspace</small><strong className="label-s-semibold">{entryClient?.name ?? "Client"}</strong></span>
          </div> : null}

          <Button type="submit" size="M" disabled={isClient && (!name.trim() || !email.trim())}>
            {isClient ? "Open Client portal" : isFreelancer ? "Accept invitation" : "Join Studio"}
          </Button>
        </form>
      </section>
      {isClient ? <footer className="prototype-entry-footer label-xs">Powered by Brisk</footer> : null}
    </main>
  );
}
