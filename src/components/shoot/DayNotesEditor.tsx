"use client";

import { Fragment, useEffect, useLayoutEffect, useRef, useState } from "react";
import { EmphasisButtons, type Emphasis } from "@/components/form/EmphasisButtons";
import type { DayNoteMark } from "@/data/shoot";

type NotePart = { value: string; bold?: boolean; italic?: boolean };

function noteParts(text: string, marks: DayNoteMark[] = []) {
  const parts: NotePart[] = [];
  let cursor = 0;
  for (const mark of marks) {
    if (mark.start > cursor) parts.push({ value: text.slice(cursor, mark.start) });
    parts.push({ value: text.slice(mark.start, mark.end), bold: mark.bold, italic: mark.italic });
    cursor = mark.end;
  }
  if (cursor < text.length) parts.push({ value: text.slice(cursor) });
  return parts;
}

export function DayNotesText({ text, marks }: { text: string; marks?: DayNoteMark[] }) {
  return <>{noteParts(text, marks).map(({ value, bold, italic }, index) => {
    const styled = italic ? <em>{value}</em> : value;
    return <Fragment key={index}>{bold ? <strong>{styled}</strong> : styled}</Fragment>;
  })}</>;
}

// Store plain text and emphasis ranges only. Browser-generated markup stays in the editor.
function readEditor(root: HTMLElement) {
  let text = "";
  const marks: DayNoteMark[] = [];
  function append(value: string, bold: boolean, italic: boolean) {
    if (!value) return;
    const start = text.length;
    text += value;
    if (!bold && !italic) return;
    const last = marks.at(-1);
    if (last && last.end === start && last.bold === bold && last.italic === italic) last.end = text.length;
    else marks.push({ start, end: text.length, bold, italic });
  }
  function visit(parent: HTMLElement, bold: boolean, italic: boolean) {
    let previousBlock = false;
    Array.from(parent.childNodes).forEach((node, index) => {
      const block = node instanceof HTMLElement && ["DIV", "P"].includes(node.tagName);
      if (index && (block || previousBlock)) append("\n", false, false);
      previousBlock = block;
      if (node.nodeType === Node.TEXT_NODE) append(node.textContent ?? "", bold, italic);
      if (!(node instanceof HTMLElement)) return;
      if (node.tagName === "BR") {
        if (node.nextSibling) append("\n", false, false);
        return;
      }
      const weight = node.style.fontWeight;
      const slant = node.style.fontStyle;
      visit(node, weight ? weight === "bold" || Number(weight) >= 600 : bold || ["B", "STRONG"].includes(node.tagName),
        slant ? slant === "italic" : italic || ["I", "EM"].includes(node.tagName));
    });
  }
  visit(root, false, false);
  return { text, marks };
}

export function DayNotesEditor({ label, text, marks, onChange }: {
  label: string; text: string; marks?: DayNoteMark[];
  onChange: (text: string, marks: DayNoteMark[]) => void;
}) {
  const editor = useRef<HTMLDivElement>(null);
  const selection = useRef<Range | null>(null);
  const lastContent = useRef("");
  useLayoutEffect(() => {
    const signature = JSON.stringify([text, marks ?? []]);
    if (!editor.current || lastContent.current === signature) return;
    // Only rebuild for an external change, including the initial load from storage.
    editor.current.replaceChildren(...noteParts(text, marks).map(({ value, bold, italic }) => {
      let node: Node = document.createTextNode(value);
      for (const tag of [italic && "em", bold && "strong"]) {
        if (!tag) continue;
        const wrapper = document.createElement(tag);
        wrapper.appendChild(node);
        node = wrapper;
      }
      return node;
    }));
    lastContent.current = signature;
    selection.current = null;
  }, [text, marks]);
  const [format, setFormat] = useState({ bold: false, italic: false });
  useEffect(() => {
    function syncSelection() {
      const current = window.getSelection();
      if (!current?.rangeCount || !editor.current?.contains(current.getRangeAt(0).commonAncestorContainer)) return;
      selection.current = current.getRangeAt(0).cloneRange();
      setFormat({ bold: document.queryCommandState("bold"), italic: document.queryCommandState("italic") });
    }
    document.addEventListener("selectionchange", syncSelection);
    return () => document.removeEventListener("selectionchange", syncSelection);
  }, []);
  function persist() {
    if (!editor.current) return;
    const next = readEditor(editor.current);
    lastContent.current = JSON.stringify([next.text, next.marks]);
    onChange(next.text, next.marks);
  }
  function toggle(style: Emphasis) {
    const active = window.getSelection();
    const liveRange = active?.rangeCount ? active.getRangeAt(0) : undefined;
    const range = liveRange && editor.current?.contains(liveRange.commonAncestorContainer) ? liveRange.cloneRange() : selection.current;
    editor.current?.focus();
    const current = window.getSelection();
    if (current && range && editor.current?.contains(range.commonAncestorContainer)) {
      current.removeAllRanges();
      current.addRange(range);
    }
    document.execCommand(style);
    setFormat({ bold: document.queryCommandState("bold"), italic: document.queryCommandState("italic") });
  }
  return <div className="shared-notes-editor is-inline">
    <div ref={editor} contentEditable suppressContentEditableWarning role="textbox" aria-multiline="true" aria-label={label} aria-placeholder="Add notes" data-empty={!text}
      onInput={persist} onDrop={(event) => event.preventDefault()}
      onPaste={(event) => { event.preventDefault(); document.execCommand("insertText", false, event.clipboardData.getData("text/plain")); }}>
    </div>
    <div className="composer-tools chat-format-tools" role="group" aria-label="Note formatting">
      <EmphasisButtons {...format} preserveSelection onToggle={toggle} />
    </div>
  </div>;
}
