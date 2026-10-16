"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { useBriskAi } from "./BriskAiContext";

const BriskAiAssistant = dynamic(
  () => import("./BriskAiAssistant").then((module) => module.BriskAiAssistant),
  { ssr: false },
);

export function DeferredBriskAiAssistant() {
  const { openAssistant, view } = useBriskAi();
  const [hasOpened, setHasOpened] = useState(false);

  useEffect(() => {
    if (view !== "closed") setHasOpened(true);
  }, [view]);

  useEffect(() => {
    const openWithShortcut = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.shiftKey && event.key.toLocaleLowerCase("en-AU") === "b") {
        event.preventDefault();
        openAssistant();
      }
    };
    window.addEventListener("keydown", openWithShortcut);
    return () => window.removeEventListener("keydown", openWithShortcut);
  }, [openAssistant]);

  // Retain conversation state after the first opening, including while closed.
  return hasOpened || view !== "closed" ? <BriskAiAssistant /> : null;
}
