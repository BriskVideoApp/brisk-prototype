"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Button } from "../../../Brisk DS/src/app/components/Button";
import type { Project } from "@/components/active-videos/types";
import { DsIcon } from "@/components/video-review/DsIcon";
import {
  readDocumentExportPayload,
  type DocumentExportPayload,
  type ScriptExportPayload,
  type StoryboardExportPayload,
  type TranscriptExportPayload,
} from "@/lib/document-export";

const scriptRowsPerPage = 6;
const transcriptLinesPerPage = 11;

export function DocumentExportPreview({
  clipId,
  initialPayload,
  project,
}: {
  clipId?: string;
  initialPayload: DocumentExportPayload;
  project: Project;
}) {
  const [payload, setPayload] = useState(initialPayload);

  useEffect(() => {
    const storedPayload = readDocumentExportPayload(initialPayload.kind, project.id);

    if (storedPayload) {
      setPayload(storedPayload);
    }
  }, [initialPayload.kind, project.id]);

  const printablePayload = useMemo(() => {
    if (payload.kind !== "transcript" || !clipId) {
      return payload;
    }

    const selectedClip = payload.clips.find((clip) => clip.id === clipId);
    return selectedClip ? { ...payload, clips: [selectedClip] } : payload;
  }, [clipId, payload]);
  const documentName = getDocumentName(printablePayload);
  const isAvDocument = printablePayload.kind === "script" || printablePayload.kind === "storyboard";
  const returnHref = printablePayload.kind === "storyboard"
    ? `/projects/${project.id}/stages/storyboard`
    : printablePayload.kind === "script"
      ? `/projects/${project.id}/script`
      : `/projects/${project.id}/script?subtab=transcripts`;
  const returnLabel = printablePayload.kind === "storyboard"
    ? "Storyboard"
    : printablePayload.kind === "script" ? "Script" : "Transcripts";

  useEffect(() => {
    document.title = documentName;
  }, [documentName]);

  return (
    <main className="document-export-shell">
      <header className="document-export-toolbar">
        <a className="document-export-back label-s-semibold" href={returnHref}>
          <DsIcon name="arrow-left" size={16} />
          Back to {returnLabel}
        </a>
        <div>
          <span className="label-xs-semibold">PDF preview</span>
          <strong className="label-m-semibold">{documentName}</strong>
        </div>
      </header>

      <div className="document-export-layout">
        <section className="document-export-canvas" aria-label={`${documentName} page preview`}>
          {isAvDocument
            ? <ScriptDocument payload={printablePayload} />
            : <TranscriptDocument payload={printablePayload} />}
        </section>

        <aside className="document-export-rail" aria-label="PDF details">
          <div className="document-export-rail-heading">
            <span className="document-export-icon" aria-hidden="true">
              <DsIcon name="file-text" size={20} />
            </span>
            <div>
              <span className="label-xs-semibold">Ready to save</span>
              <h1 className="headings-2xs-bold">{documentName}</h1>
            </div>
          </div>

          <dl className="document-export-metadata">
            <div><dt>Studio</dt><dd>{printablePayload.studioName}</dd></div>
            <div><dt>Project</dt><dd>{printablePayload.projectName}</dd></div>
            <div><dt>Format</dt><dd>A4 portrait</dd></div>
          </dl>

          <section className="document-export-included" aria-labelledby="document-export-included-title">
            <h2 className="label-s-semibold" id="document-export-included-title">Included in this PDF</h2>
            <ul>
              {getIncludedItems(printablePayload).map((item) => (
                <li className="label-s" key={item}>
                  <DsIcon name="check" size={14} />
                  {item}
                </li>
              ))}
            </ul>
          </section>

          <div className="document-export-save-note">
            <DsIcon name="info" size={16} />
            <p className="paragraph-s">Choose <strong>Save as PDF</strong> in the browser print window.</p>
          </div>

          <div className="document-export-rail-actions">
            <Button size="M" variant="primary" onClick={() => window.print()}>
              <DsIcon name="download-simple" size={16} />
              Download PDF
            </Button>
            <a className="document-export-cancel label-s-semibold" href={returnHref}>Cancel</a>
          </div>
        </aside>
      </div>
    </main>
  );
}

function ScriptDocument({ payload }: { payload: ScriptExportPayload | StoryboardExportPayload }) {
  const pageRows = chunk(payload.rows, scriptRowsPerPage);
  const pages = pageRows.length ? pageRows : [[]];
  const totalWords = payload.rows.reduce((total, row) => total + countWords(row.words), 0);
  const totalDuration = payload.rows.reduce((total, row) => total + row.durationSeconds, 0);

  return pages.map((rows, pageIndex) => (
    <DocumentPaper
      footer={`${totalWords} words · ${formatDuration(totalDuration)}`}
      pageIndex={pageIndex}
      pageTotal={pages.length}
      key={`${payload.kind}-page-${pageIndex + 1}`}
    >
      <DocumentHeader
        createdAt={payload.createdAt}
        documentTitle={payload.documentTitle}
        projectName={payload.projectName}
        studioName={payload.studioName}
        eyebrow={`${payload.clientName} · ${payload.kind === "storyboard" ? "Storyboard" : "Script"} · ${payload.versionLabel}`}
      />
      <div className="document-script-table" role="table" aria-label="AV script">
        <div className="document-script-row document-script-head" role="row">
          <span role="columnheader">Row</span>
          <span role="columnheader">Words</span>
          <span role="columnheader">Visuals</span>
          <span role="columnheader">Media</span>
          <span role="columnheader">Duration</span>
        </div>
        {rows.map((row) => {
          const rowIndex = payload.rows.findIndex((candidate) => candidate.id === row.id);

          return (
            <div className="document-script-row" role="row" key={row.id}>
              <strong role="cell">{String(rowIndex + 1).padStart(2, "0")}</strong>
              <p role="cell">{row.words || "-"}</p>
              <p role="cell">{row.visuals || "-"}</p>
              <div className="document-script-media" role="cell">
                {row.media.length
                  ? row.media.map((item) => <span key={item.id}>{item.label}</span>)
                  : <span>-</span>}
              </div>
              <span role="cell">{formatDuration(row.durationSeconds)}</span>
            </div>
          );
        })}
      </div>
    </DocumentPaper>
  ));
}

function TranscriptDocument({ payload }: { payload: TranscriptExportPayload }) {
  const pageGroups = payload.clips.flatMap((clip) => {
    const lineGroups = chunk(clip.paragraphs, transcriptLinesPerPage);
    return (lineGroups.length ? lineGroups : [[]]).map((paragraphs) => ({ clip, paragraphs }));
  });

  return pageGroups.map(({ clip, paragraphs }, pageIndex) => (
    <DocumentPaper
      footer={`${clip.language} · ${clip.paragraphs.length} transcript lines`}
      pageIndex={pageIndex}
      pageTotal={pageGroups.length}
      key={`${clip.id}-page-${pageIndex + 1}`}
    >
      <DocumentHeader
        createdAt={clip.createdAt}
        documentTitle={clip.title}
        projectName={payload.projectName}
        studioName={payload.studioName}
        eyebrow={`${payload.clientName} · Transcript`}
      />
      <div className="document-transcript-lines">
        {paragraphs.map((paragraph) => (
          <article className={paragraph.highlighted ? "is-highlighted" : ""} key={paragraph.id}>
            <div className="document-transcript-meta">
              <strong>{paragraph.speakerName}</strong>
              <span>{formatTimecode(paragraph.startTimeSeconds)} - {formatTimecode(paragraph.endTimeSeconds)}</span>
            </div>
            <p>{paragraph.text}</p>
          </article>
        ))}
      </div>
    </DocumentPaper>
  ));
}

function DocumentPaper({
  children,
  footer,
  pageIndex,
  pageTotal,
}: {
  children: ReactNode;
  footer: string;
  pageIndex: number;
  pageTotal: number;
}) {
  return (
    <article className="document-export-paper">
      <div className="document-export-page-frame">
        <div className="document-export-page-body">{children}</div>
        <footer className="document-export-page-footer">
          <span>{footer}</span>
          <span>{pageIndex + 1} of {pageTotal}</span>
        </footer>
      </div>
    </article>
  );
}

function DocumentHeader({
  createdAt,
  documentTitle,
  eyebrow,
  projectName,
  studioName,
}: {
  createdAt: string;
  documentTitle: string;
  eyebrow: string;
  projectName: string;
  studioName: string;
}) {
  return (
    <header className="document-export-page-header">
      <div className="document-export-studio">
        <span className="document-export-studio-mark" aria-hidden="true">{getInitials(studioName)}</span>
        <div><strong>{studioName}</strong><span>Production document</span></div>
      </div>
      <div className="document-export-title-block">
        <span>{eyebrow}</span>
        <h2>{projectName}</h2>
        <p>{documentTitle}</p>
      </div>
      <dl>
        <div><dt>Created</dt><dd>{formatDocumentDate(createdAt)}</dd></div>
      </dl>
    </header>
  );
}

function getDocumentName(payload: DocumentExportPayload) {
  if (payload.kind === "script" || payload.kind === "storyboard") {
    return `${payload.projectName} - ${payload.documentTitle}`;
  }

  return payload.clips.length === 1
    ? `${payload.projectName} - ${payload.clips[0].title} Transcript`
    : `${payload.projectName} - Transcripts`;
}

function getIncludedItems(payload: DocumentExportPayload) {
  if (payload.kind === "script" || payload.kind === "storyboard") {
    return payload.kind === "storyboard"
      ? ["Words and visual direction", "Storyboard images", "Frame duration and totals", "Created date and version"]
      : ["Words and visuals", "Media references", "Row duration and totals", "Created date and version"];
  }

  return [
    `${payload.clips.length} ${payload.clips.length === 1 ? "transcript" : "transcripts"}`,
    "Speaker names and timecodes",
    "Highlighted transcript lines",
    "Created date and language",
  ];
}

function chunk<T>(items: T[], size: number) {
  const groups: T[][] = [];

  for (let index = 0; index < items.length; index += size) {
    groups.push(items.slice(index, index + size));
  }

  return groups;
}

function countWords(value: string) {
  return value.trim() ? value.trim().split(/\s+/u).length : 0;
}

function formatDuration(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.max(0, seconds % 60);
  return `${minutes.toString().padStart(2, "0")}:${remainingSeconds.toString().padStart(2, "0")}`;
}

function formatTimecode(seconds: number) {
  return formatDuration(Math.floor(seconds));
}

function formatDocumentDate(value: string) {
  const normalisedValue = /^\d{1,2}\s[A-Za-z]{3}$/u.test(value.trim()) ? `${value} 2026` : value;
  const date = new Date(normalisedValue);

  return Number.isNaN(date.getTime())
    ? value
    : new Intl.DateTimeFormat("en-AU", { day: "numeric", month: "long", year: "numeric" }).format(date);
}

function getInitials(value: string) {
  return value
    .split(/\s+/u)
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toLocaleUpperCase("en-AU");
}
