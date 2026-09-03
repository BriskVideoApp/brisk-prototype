"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "../../../Brisk DS/src/app/components/Button";
import { usePrototypeScenario } from "@/components/prototype-scenarios/PrototypeScenarioContext";
import { DsIcon } from "@/components/video-review/DsIcon";
import {
  getPrototypeScenarioBySelection,
  prototypeScenarioPersonas,
  prototypeScenarioStates,
  type PrototypeScenarioPersonaId,
  type PrototypeScenarioState,
} from "@/data/prototype-scenarios";

export function PrototypeScenarioPicker() {
  const {
    activeScenario,
    endTestMode,
    hasLoadedScenario,
    loadScenario,
    resetScenario,
    returnToStartingPoint,
  } = usePrototypeScenario();
  const [personaId, setPersonaId] = useState<PrototypeScenarioPersonaId>(
    activeScenario?.personaId ?? "studio-owner",
  );
  const [state, setState] = useState<PrototypeScenarioState>(
    activeScenario?.state ?? "new",
  );
  const selectedScenario = useMemo(
    () => getPrototypeScenarioBySelection(personaId, state),
    [personaId, state],
  );

  useEffect(() => {
    if (!activeScenario) return;
    setPersonaId(activeScenario.personaId);
    setState(activeScenario.state);
  }, [activeScenario]);

  return (
    <main className="prototype-scenario-page">
      <header className="prototype-scenario-page-header">
        <div>
          <span className="label-xs-semibold">Prototype-only control</span>
          <h1 className="headings-m-bold">User journey scenarios</h1>
          <p className="paragraph-s">Load a consistent role and starting state, run the journey, then reset and repeat it.</p>
        </div>
        {hasLoadedScenario && activeScenario ? (
          <section className="prototype-scenario-active" aria-label="Currently active scenario">
            <span className="prototype-scenario-active-icon" aria-hidden="true"><DsIcon name="check-circle" size={18} /></span>
            <div>
              <span className="label-xs-semibold">Currently active</span>
              <strong className="label-s-semibold">{activeScenario.personaLabel} - {activeScenario.stateLabel}</strong>
              <small className="label-xs">{activeScenario.workspaceLabel}</small>
            </div>
          </section>
        ) : null}
      </header>

      <section className="prototype-scenario-panel" aria-labelledby="scenario-selector-title">
        <div className="prototype-scenario-panel-heading">
          <div>
            <span className="label-xs-semibold">Scenario setup</span>
            <h2 className="headings-s-bold" id="scenario-selector-title">Choose a journey</h2>
          </div>
          <span className="prototype-scenario-separation label-xs-semibold">Separate from product navigation</span>
        </div>

        <div className="prototype-scenario-fields">
          <label>
            <span className="label-s-semibold">Role</span>
            <select
              className="label-s"
              value={personaId}
              onChange={(event) => setPersonaId(event.target.value as PrototypeScenarioPersonaId)}
            >
              {prototypeScenarioPersonas.map((persona) => (
                <option value={persona.id} key={persona.id}>{persona.label}</option>
              ))}
            </select>
          </label>
          <label>
            <span className="label-s-semibold">Starting state</span>
            <select
              className="label-s"
              value={state}
              onChange={(event) => setState(event.target.value as PrototypeScenarioState)}
            >
              {prototypeScenarioStates.map((scenarioState) => (
                <option value={scenarioState.id} key={scenarioState.id}>{scenarioState.label}</option>
              ))}
            </select>
          </label>
        </div>

        {selectedScenario ? (
          <article className="prototype-scenario-summary">
            <div className="prototype-scenario-summary-title">
              <span className="label-xs-semibold">{selectedScenario.accessRole} access</span>
              <h3 className="headings-xs-bold">{selectedScenario.personaLabel} - {selectedScenario.stateLabel}</h3>
              <p className="paragraph-s">{selectedScenario.summary}</p>
            </div>
            <dl>
              <div><dt className="label-xs">Participant</dt><dd className="label-s-semibold">{selectedScenario.participantName}</dd></div>
              <div><dt className="label-xs">Workspace</dt><dd className="label-s-semibold">{selectedScenario.workspaceLabel}</dd></div>
              <div><dt className="label-xs">Starts at</dt><dd className="label-s-semibold">{formatEntryLabel(selectedScenario.entry)}</dd></div>
            </dl>
            <div className="prototype-scenario-supported">
              <span className="label-xs-semibold">Supported state coverage</span>
              <ul>
                {selectedScenario.supportedStates.map((supportedState) => (
                  <li className="label-s" key={supportedState}><DsIcon name="check" size={14} />{supportedState}</li>
                ))}
              </ul>
            </div>
          </article>
        ) : null}

        <footer className="prototype-scenario-panel-actions">
          {selectedScenario ? (
            <Button size="M" onClick={() => loadScenario(selectedScenario.id)}>Load scenario</Button>
          ) : null}
          {activeScenario ? (
            <>
              <Button size="M" variant="secondary" onClick={resetScenario}>Reset current scenario</Button>
              <Button size="M" variant="ghost" onClick={returnToStartingPoint}>Return to starting point</Button>
              <Button size="M" variant="ghost" onClick={endTestMode}>End test mode</Button>
            </>
          ) : null}
        </footer>
      </section>

      <section className="prototype-scenario-note">
        <DsIcon name="info" size={18} />
        <p className="label-s">Loading or resetting removes Brisk prototype changes stored in this browser, then restores the selected fixture. It does not affect files, accounts or external services.</p>
      </section>
    </main>
  );
}

function formatEntryLabel(entry: string) {
  if (entry === "studio-sign-up") return "Studio sign-up and onboarding";
  if (entry === "studio-invitation") return "Studio invitation";
  if (entry === "freelancer-invitation") return "Freelancer invitation";
  if (entry === "client-magic-link") return "Client magic link";
  return "Existing workspace home";
}
