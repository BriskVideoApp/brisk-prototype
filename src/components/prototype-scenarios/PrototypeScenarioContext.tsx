"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  getPrototypeScenario,
  type PrototypeScenario,
} from "@/data/prototype-scenarios";

export const prototypeScenarioStorageKey = "brisk-prototype-scenario-v1";

type PrototypeScenarioContextValue = {
  activeScenario: PrototypeScenario | null;
  hasLoadedScenario: boolean;
  loadScenario: (scenarioId: PrototypeScenario["id"]) => void;
  resetScenario: () => void;
  returnToStartingPoint: () => void;
  endTestMode: () => void;
};

const PrototypeScenarioContext = createContext<PrototypeScenarioContextValue | null>(null);

export function PrototypeScenarioProvider({ children }: { children: ReactNode }) {
  const [activeScenario, setActiveScenario] = useState<PrototypeScenario | null>(null);
  const [hasLoadedScenario, setHasLoadedScenario] = useState(false);

  useEffect(() => {
    setActiveScenario(readStoredPrototypeScenario());
    setHasLoadedScenario(true);
  }, []);

  const value = useMemo<PrototypeScenarioContextValue>(() => ({
    activeScenario,
    hasLoadedScenario,
    loadScenario(scenarioId) {
      const scenario = getPrototypeScenario(scenarioId);
      if (!scenario) return;

      clearBriskPrototypeState();
      window.localStorage.setItem(prototypeScenarioStorageKey, scenario.id);
      window.location.assign(scenario.startHref);
    },
    resetScenario() {
      if (!activeScenario) return;

      clearBriskPrototypeState();
      window.localStorage.setItem(prototypeScenarioStorageKey, activeScenario.id);
      window.location.assign(activeScenario.startHref);
    },
    returnToStartingPoint() {
      if (!activeScenario) return;
      window.location.assign(activeScenario.startHref);
    },
    endTestMode() {
      clearBriskPrototypeState();
      setActiveScenario(null);
      window.location.assign("/today");
    },
  }), [activeScenario, hasLoadedScenario]);

  return (
    <PrototypeScenarioContext.Provider value={value}>
      {children}
    </PrototypeScenarioContext.Provider>
  );
}

export function usePrototypeScenario() {
  const context = useContext(PrototypeScenarioContext);

  if (!context) {
    throw new Error("usePrototypeScenario must be used within PrototypeScenarioProvider");
  }

  return context;
}

export function readStoredPrototypeScenario() {
  if (typeof window === "undefined") return null;

  try {
    return getPrototypeScenario(window.localStorage.getItem(prototypeScenarioStorageKey));
  } catch {
    return null;
  }
}

function clearBriskPrototypeState() {
  clearStorage(window.localStorage);
  clearStorage(window.sessionStorage);
}

function clearStorage(storage: Storage) {
  const keysToRemove = Array.from({ length: storage.length }, (_, index) => storage.key(index))
    .filter((key): key is string => Boolean(key?.startsWith("brisk-") || key?.startsWith("brisk:")));

  keysToRemove.forEach((key) => storage.removeItem(key));
}
