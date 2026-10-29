"use client";

import { useMemo, useRef, useState, type KeyboardEvent } from "react";
import Link from "next/link";
import { EditingDialog } from "../../../Brisk DS/src/app/components/EditingDialog";
import { Input } from "../../../Brisk DS/src/app/components/Input";
import { Button } from "../../../Brisk DS/src/app/components/Button";
import { BriskSelect } from "@/components/form/BriskSelect";
import { DsIcon } from "@/components/video-review/DsIcon";
import { searchEntries, type SearchEntry, type SearchKind } from "./search-data";

export function SearchDialog({ pageLabel, query, everywhere, entries, onQueryChange, onScopeChange, onClose, hasListFilter }: {
  pageLabel: string; query: string; everywhere: boolean; entries: SearchEntry[];
  onQueryChange: (query: string) => void; onScopeChange: (everywhere: boolean) => void; onClose: () => void; hasListFilter: boolean;
}) {
  const [kind, setKind] = useState<SearchKind | "All">("All");
  const [active, setActive] = useState(0);
  const links = useRef(new Map<number, HTMLAnchorElement>());
  const input = useRef<HTMLInputElement>(null);
  const matches = useMemo(() => searchEntries(entries, query, everywhere).filter((entry) => !everywhere || kind === "All" || entry.kind === kind), [entries, everywhere, kind, query]);
  const results = matches.slice(0, 60);
  const selectedIndex = Math.min(active, Math.max(0, results.length - 1));
  const move = (event: KeyboardEvent, fromInput = false) => {
    if (event.key === "Escape") { event.preventDefault(); event.stopPropagation(); onClose(); return; }
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      const next = fromInput ? (event.key === "ArrowDown" ? 0 : results.length - 1)
        : (selectedIndex + (event.key === "ArrowDown" ? 1 : -1) + results.length) % results.length;
      if (results.length) { setActive(next); links.current.get(next)?.focus(); }
    }
    if (fromInput && event.key === "Enter") { event.preventDefault(); links.current.get(selectedIndex)?.click(); }
  };
  return <EditingDialog title="Search" size="wide" onCancel={onClose} actions={<>
    {hasListFilter && !everywhere && query.trim() ? <Button variant="ghost" size="S" onClick={() => { onQueryChange(""); input.current?.focus(); }}>Clear search</Button> : null}
    <Button variant="secondary" size="S" onClick={onClose}>Close</Button>
  </>}>
    <div className="global-search-content">
      <div className="global-search-query">
        <Input ref={input} data-dialog-autofocus type="search" aria-label="Search" placeholder={everywhere ? "Search everywhere…" : `Search ${pageLabel.toLocaleLowerCase("en-AU")}…`}
          value={query} onChange={(event) => { onQueryChange(event.target.value); setActive(0); }} onKeyDown={(event) => move(event, true)}
          iconStart={<DsIcon name="search" size={20} />} />
        <BriskSelect ariaLabel="Search scope" placeholder="Search scope" clearable={false} searchable={false} value={everywhere ? "everywhere" : "page"}
          options={[{ value: "page", label: pageLabel }, { value: "everywhere", label: "Everywhere" }]}
          onChange={(value) => { onScopeChange(value === "everywhere"); setKind("All"); setActive(0); }} />
      </div>
      <div className="global-search-refine">
        <p role="status" aria-live="polite" className="global-search-status label-xs">
          {query.trim() ? `${matches.length} ${matches.length === 1 ? "result" : "results"}${hasListFilter && !everywhere ? " · Page list filtered" : ""}` : `Search ${pageLabel.startsWith("This ") ? `this ${pageLabel.slice(5)}` : pageLabel}, or choose Everywhere.`}
        </p>
        {everywhere ? <div className="global-search-type-select"><BriskSelect<SearchKind | "All"> ariaLabel="Content type" placeholder="All content" clearable={false} searchable={false} value={kind}
          options={[{ value: "All", label: "All content" }, ...(["Videos", "Chat", "Briefs", "Scripts", "Media", "People", "Clients", "Brand Kits", "Expenses", "Pages"] as const)
            .filter((type) => entries.some((entry) => entry.kind === type)).map((type) => ({ value: type, label: type }))]}
          onChange={(value) => { setKind(value || "All"); setActive(0); }} /></div> : null}
      </div>
      <div className="global-search-results" aria-label="Search results">
        {results.map((entry, index) => <Link key={entry.id} href={entry.href} ref={(node) => { if (node) links.current.set(index, node); else links.current.delete(index); }}
          className="global-search-result" onKeyDown={(event) => move(event)} onFocus={() => setActive(index)}
          onClick={(event) => { if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
            if (entry.onSelect) { event.preventDefault(); onClose(); entry.onSelect(); } else onClose(); }}>
          <span className="global-search-result-meta label-xs">{entry.kind} · {entry.meta}</span>
          <strong className="label-m-semibold"><Match text={entry.title} query={query} /></strong>
          {["Chat", "Briefs", "Scripts", "Pages"].includes(entry.kind) ? <span className="global-search-snippet paragraph-s"><Match text={excerpt(entry.text, query)} query={query} /></span> : null}
        </Link>)}
        {query.trim() && !matches.length ? <div className="global-search-empty paragraph-m">
          <p>No results in {everywhere ? "Everywhere" : pageLabel}.</p>
          {!everywhere ? <Button variant="ghost" size="S" onClick={() => { onScopeChange(true); input.current?.focus(); }}>Search Everywhere</Button> : <p className="paragraph-s">Try a different word or content type.</p>}
        </div> : null}
        {matches.length > results.length ? <p className="paragraph-s">Showing the first {results.length} matches. Refine your search to narrow the results.</p> : null}
      </div>
    </div>
  </EditingDialog>;
}
function excerpt(text: string, query: string) {
  const cleaned = text.replace(/<[^>]*>/gu, " ").replace(/\s+/gu, " ").trim();
  const at = cleaned.toLocaleLowerCase("en-AU").indexOf(query.trim().split(/\s+/u)[0]?.toLocaleLowerCase("en-AU") ?? "");
  const start = Math.max(0, at - 50);
  return `${start ? "…" : ""}${cleaned.slice(start, start + 220)}${cleaned.length > start + 220 ? "…" : ""}`;
}
function Match({ text, query }: { text: string; query: string }) {
  const terms = query.trim().split(/\s+/u).filter(Boolean).map((term) => term.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&"));
  if (!terms.length) return <>{text}</>;
  return <>{text.split(new RegExp(`(${terms.join("|")})`, "giu")).map((part, index) =>
    terms.some((term) => new RegExp(`^${term}$`, "iu").test(part)) ? <mark key={index}>{part}</mark> : part)}</>;
}
