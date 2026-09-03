"use client";

import Link from "next/link";
import {
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { Button } from "../../../Brisk DS/src/app/components/Button";
import { usePrototypeScenario } from "@/components/prototype-scenarios/PrototypeScenarioContext";
import { DsIcon } from "@/components/video-review/DsIcon";

type ToolbarPosition = {
  x: number;
  y: number;
};

const toolbarPositionStorageKey = "brisk-prototype-toolbar-position-v1";
const toolbarCollapsedStorageKey = "brisk-prototype-toolbar-collapsed-v1";
const toolbarViewportInset = 8;
const toolbarKeyboardMoveStep = 16;

export function PrototypeScenarioToolbar({ inline = false }: { inline?: boolean }) {
  const toolbarRef = useRef<HTMLElement>(null);
  const [position, setPosition] = useState<ToolbarPosition | null>(null);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const {
    activeScenario,
    hasLoadedScenario,
    resetScenario,
    returnToStartingPoint,
  } = usePrototypeScenario();

  useEffect(() => {
    const storedPosition = readStoredToolbarPosition();

    setIsCollapsed(readStoredToolbarCollapsed());

    if (storedPosition) {
      setPosition(constrainToolbarPosition(storedPosition, toolbarRef.current));
    }
  }, [hasLoadedScenario]);

  useEffect(() => {
    function keepToolbarInView() {
      setPosition((currentPosition) => (
        currentPosition
          ? constrainToolbarPosition(currentPosition, toolbarRef.current)
          : currentPosition
      ));
    }

    window.addEventListener("resize", keepToolbarInView);
    return () => window.removeEventListener("resize", keepToolbarInView);
  }, []);

  if (!hasLoadedScenario || !activeScenario) return null;

  function beginDrag(event: ReactPointerEvent<HTMLButtonElement>) {
    const toolbar = toolbarRef.current;

    if (!toolbar) return;

    event.preventDefault();
    const toolbarBounds = toolbar.getBoundingClientRect();
    const pointerOffset = {
      x: event.clientX - toolbarBounds.left,
      y: event.clientY - toolbarBounds.top,
    };
    let latestPosition = constrainToolbarPosition({
      x: toolbarBounds.left,
      y: toolbarBounds.top,
    }, toolbar);

    setPosition(latestPosition);
    setIsDragging(true);

    function moveToolbar(pointerEvent: PointerEvent) {
      latestPosition = constrainToolbarPosition({
        x: pointerEvent.clientX - pointerOffset.x,
        y: pointerEvent.clientY - pointerOffset.y,
      }, toolbar);
      setPosition(latestPosition);
    }

    function finishDrag() {
      window.removeEventListener("pointermove", moveToolbar);
      window.removeEventListener("pointerup", finishDrag);
      window.removeEventListener("pointercancel", finishDrag);
      setIsDragging(false);
      storeToolbarPosition(latestPosition);
    }

    window.addEventListener("pointermove", moveToolbar);
    window.addEventListener("pointerup", finishDrag);
    window.addEventListener("pointercancel", finishDrag);
  }

  function moveWithKeyboard(event: KeyboardEvent<HTMLButtonElement>) {
    const directionByKey: Partial<Record<string, ToolbarPosition>> = {
      ArrowLeft: { x: -toolbarKeyboardMoveStep, y: 0 },
      ArrowRight: { x: toolbarKeyboardMoveStep, y: 0 },
      ArrowUp: { x: 0, y: -toolbarKeyboardMoveStep },
      ArrowDown: { x: 0, y: toolbarKeyboardMoveStep },
    };
    const direction = directionByKey[event.key];
    const toolbar = toolbarRef.current;

    if (!direction || !toolbar) return;

    event.preventDefault();
    const toolbarBounds = toolbar.getBoundingClientRect();
    const currentPosition = position ?? { x: toolbarBounds.left, y: toolbarBounds.top };
    const nextPosition = constrainToolbarPosition({
      x: currentPosition.x + direction.x,
      y: currentPosition.y + direction.y,
    }, toolbar);

    setPosition(nextPosition);
    storeToolbarPosition(nextPosition);
  }

  function toggleCollapsed() {
    const nextCollapsed = !isCollapsed;

    setIsCollapsed(nextCollapsed);
    storeToolbarCollapsed(nextCollapsed);

    window.requestAnimationFrame(() => {
      setPosition((currentPosition) => {
        if (!currentPosition) return currentPosition;

        const nextPosition = constrainToolbarPosition(currentPosition, toolbarRef.current);
        storeToolbarPosition(nextPosition);
        return nextPosition;
      });
    });
  }

  return (
    <aside
      className={`prototype-scenario-toolbar${inline ? " is-inline" : ""}${isCollapsed ? " is-collapsed" : ""}${isDragging ? " is-dragging" : ""}`}
      aria-label="Active prototype test scenario"
      ref={toolbarRef}
      style={!inline && position ? { left: position.x, top: position.y, right: "auto", bottom: "auto" } : undefined}
    >
      {!inline ? <button
        className="prototype-scenario-toolbar-handle"
        type="button"
        aria-label="Move test toolbar"
        title="Drag to move the test toolbar. Use arrow keys for precise movement."
        onKeyDown={moveWithKeyboard}
        onPointerDown={beginDrag}
      >
        <DsIcon name="dots-six-vertical" size={18} />
      </button> : null}
      <div className={`prototype-scenario-toolbar-copy${isCollapsed ? " is-collapsed" : ""}`}>
        <span className="label-xs-semibold">Test mode</span>
        {isCollapsed ? (
          <strong className="label-xs-semibold">
            {activeScenario.personaLabel} · {activeScenario.stateLabel}
          </strong>
        ) : (
          <>
            <strong className="label-s-semibold">{activeScenario.personaLabel}</strong>
            <span className="label-xs">{activeScenario.stateLabel}</span>
          </>
        )}
      </div>
      {!isCollapsed ? (
        <div className="prototype-scenario-toolbar-actions">
          <Button size="S" variant="ghost" onClick={returnToStartingPoint}>Starting point</Button>
          <Button size="S" variant="secondary" onClick={resetScenario}>Reset</Button>
          <Link className="prototype-scenario-toolbar-link label-s-semibold" href="/prototype/scenarios">
            Scenarios
          </Link>
        </div>
      ) : null}
      <button
        className="prototype-scenario-toolbar-toggle"
        type="button"
        aria-expanded={!isCollapsed}
        aria-label={isCollapsed ? "Expand test toolbar" : "Collapse test toolbar"}
        title={isCollapsed ? "Expand test toolbar" : "Collapse test toolbar"}
        onClick={toggleCollapsed}
      >
        <DsIcon name={isCollapsed ? "caret-right" : "caret-left"} size={18} />
      </button>
    </aside>
  );
}

function constrainToolbarPosition(position: ToolbarPosition, toolbar: HTMLElement | null) {
  if (!toolbar) return position;

  const maximumX = Math.max(toolbarViewportInset, window.innerWidth - toolbar.offsetWidth - toolbarViewportInset);
  const maximumY = Math.max(toolbarViewportInset, window.innerHeight - toolbar.offsetHeight - toolbarViewportInset);

  return {
    x: Math.min(Math.max(position.x, toolbarViewportInset), maximumX),
    y: Math.min(Math.max(position.y, toolbarViewportInset), maximumY),
  };
}

function readStoredToolbarPosition(): ToolbarPosition | null {
  try {
    const storedValue = window.sessionStorage.getItem(toolbarPositionStorageKey);

    if (!storedValue) return null;

    const parsedValue = JSON.parse(storedValue) as Partial<ToolbarPosition>;
    return Number.isFinite(parsedValue.x) && Number.isFinite(parsedValue.y)
      ? { x: parsedValue.x as number, y: parsedValue.y as number }
      : null;
  } catch {
    window.sessionStorage.removeItem(toolbarPositionStorageKey);
    return null;
  }
}

function storeToolbarPosition(position: ToolbarPosition) {
  window.sessionStorage.setItem(toolbarPositionStorageKey, JSON.stringify(position));
}

function readStoredToolbarCollapsed() {
  try {
    return window.sessionStorage.getItem(toolbarCollapsedStorageKey) === "true";
  } catch {
    return false;
  }
}

function storeToolbarCollapsed(isCollapsed: boolean) {
  window.sessionStorage.setItem(toolbarCollapsedStorageKey, String(isCollapsed));
}
