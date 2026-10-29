"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState, type Dispatch, type ReactNode, type SetStateAction } from "react";
import { usePathname } from "next/navigation";
import { usePrototypeState } from "@/components/prototype-state/PrototypeStateContext";
import { usePrototypeViewer } from "@/components/prototype-state/usePrototypeViewer";
import { useMediaLibrary } from "@/components/media/MediaLibraryContext";
import { useProjectTiming } from "@/components/project-timing/ProjectTimingContext";
import { usePeople } from "@/components/people/PeopleDataContext";
import { useClients } from "@/components/clients/ClientDataContext";
import { canViewClientBrandKit } from "@/data/prototype-access";
import { useCostsData } from "@/components/costs/CostsDataContext";
import { hasStudioAdministrationAccess, prototypeStudioPersonId } from "@/data/people";
import { buildSearchEntries, type SearchEntry } from "./search-data";
import { SearchDialog } from "./SearchDialog";

export type PageSearchSource = {
  label: string;
  entries?: SearchEntry[];
  allEntries?: SearchEntry[];
  replaceSource?: string;
  query?: string;
  setQuery?: Dispatch<SetStateAction<string>>;
};
type SourceReader = () => PageSearchSource;
type SearchContextValue = {
  open: () => void;
  register: (token: symbol, path: string, read: SourceReader) => () => void;
  isOpen: boolean;
  activeQuery: string;
  notifySource: () => void;
};
const SearchContext = createContext<SearchContextValue | null>(null);

export function SearchProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { state } = usePrototypeState();
  const viewer = usePrototypeViewer();
  const { assetViews } = useMediaLibrary();
  const { messages } = useProjectTiming();
  const { people } = usePeople();
  const { clients } = useClients();
  const { invoices } = useCostsData();
  const sources = useRef(new Map<symbol, { path: string; read: SourceReader }>());
  const [isOpen, setIsOpen] = useState(false);
  const [openedAs, setOpenedAs] = useState("");
  const identity = `${viewer?.workspaceId}:${viewer?.id}:${viewer?.role}`;
  const [, refresh] = useState(0);
  const notifySource = useCallback(() => refresh((version) => version + 1), []);
  const [query, setQuery] = useState("");
  const [everywhere, setEverywhere] = useState(false);
  const [entries, setEntries] = useState<SearchEntry[]>([]);
  const [page, setPage] = useState<PageSearchSource>({ label: "This page" });
  const currentSource = useCallback(() => [...sources.current.values()].filter((source) => source.path === pathname).at(-1)?.read(), [pathname]);
  const register = useCallback((token: symbol, path: string, read: SourceReader) => {
    sources.current.set(token, { path, read });
    return () => { sources.current.delete(token); };
  }, []);
  const open = useCallback(() => {
    const active = currentSource();
    const indexed = buildSearchEntries(state, viewer, assetViews, messages);
    if (viewer?.role === "Studio Staff") {
      for (const client of clients) indexed.push({ id: `client:${client.id}`, source: "clients", kind: "Clients", title: client.name,
        text: `${client.name} ${client.website}`, meta: "Client", href: `/clients/${client.id}` });
      if (hasStudioAdministrationAccess(people.find((person) => person.id === prototypeStudioPersonId) ?? null)) {
        for (const person of people) indexed.push({ id: `person:${person.id}`, source: "people", kind: "People", title: person.name,
          text: `${person.name} ${person.email}`, meta: "People", href: `/people/${person.id}` });
      }
    }
    for (const client of state.clients.filter((candidate) => candidate.workspaceId === viewer?.workspaceId && canViewClientBrandKit(viewer, candidate.id, state))) {
      indexed.push({ id: `brand:${client.id}`, source: "brand-kits", kind: "Brand Kits", title: client.name,
        text: `${client.name} ${client.website}`, meta: "Brand Kit", href: `/brand-kits/${client.id}` });
    }
    if (viewer?.role === "Studio Staff" && hasStudioAdministrationAccess(people.find((person) => person.id === prototypeStudioPersonId) ?? null)) {
      for (const invoice of invoices.filter((candidate) => candidate.state !== "Paid")) {
        const project = state.projects.find((candidate) => candidate.id === invoice.projectId && candidate.workspaceId === viewer.workspaceId);
        if (!project) continue;
        indexed.push({ id: `invoice:${invoice.id}`, source: "expenses", kind: "Expenses", title: invoice.contractorName,
          text: `${project.name} ${project.clientName} ${invoice.contractorName} ${invoice.fileNames.join(" ")}`,
          meta: `${project.name} · ${invoice.state}`, projectId: project.id, href: `/outstanding-invoices?searchInvoice=${encodeURIComponent(invoice.id)}` });
      }
    }
    const registrations = [...sources.current.values()].filter((source) => source.path === pathname).map((source) => source.read());
    const replaced = new Set(registrations.map((source) => source.replaceSource).filter(Boolean));
    const merged = new Map(indexed.filter((entry) => !replaced.has(entry.source)).map((entry) => [entry.id, entry]));
    registrations.flatMap((source) => source.allEntries ?? source.entries ?? []).forEach((entry) => merged.set(entry.id, entry));
    setEntries([...merged.values()]);
    setPage(active ?? { label: pageLabel(pathname), entries: currentPageText(pathname) });
    setQuery(active?.query ?? "");
    setEverywhere(false);
    setOpenedAs(identity);
    setIsOpen(true);
  }, [assetViews, clients, currentSource, identity, invoices, messages, pathname, people, state, viewer]);
  useEffect(() => { setIsOpen(false); setQuery(""); }, [pathname, viewer?.id, viewer?.role]);
  useEffect(() => {
    const shortcut = (event: KeyboardEvent) => {
      if (!(event.metaKey || event.ctrlKey) || event.key.toLowerCase() !== "k" || event.shiftKey) return;
      event.preventDefault(); event.stopImmediatePropagation(); open();
    };
    window.addEventListener("keydown", shortcut, true);
    return () => window.removeEventListener("keydown", shortcut, true);
  }, [open]);
  const updateQuery = (value: string) => {
    setQuery(value);
    if (!everywhere) page.setQuery?.(value);
  };
  const changeScope = (value: boolean) => {
    setEverywhere(value);
    if (!value) page.setQuery?.(query);
  };
  const scoped = page.entries ?? scopeEntries(entries, pathname);
  const value = { open, register, notifySource, isOpen: isOpen && openedAs === identity, activeQuery: currentSource()?.query ?? "" };
  return <SearchContext.Provider value={value}>
    {children}
    {isOpen && openedAs === identity ? <SearchDialog pageLabel={page.label} query={query} everywhere={everywhere}
      entries={everywhere ? entries : scoped} onQueryChange={updateQuery} onScopeChange={changeScope} onClose={() => setIsOpen(false)}
      hasListFilter={Boolean(page.setQuery)} /> : null}
  </SearchContext.Provider>;
}

export function useGlobalSearch() {
  const context = useContext(SearchContext);
  if (!context) throw new Error("Search requires SearchProvider");
  return context;
}

/** Keeps a live reader, including unsaved content, without persisting any search state. */
export function useSearchSource(source: PageSearchSource) {
  const { register, notifySource } = useGlobalSearch();
  const path = usePathname();
  const token = useRef(Symbol("page-search"));
  const latest = useRef(source);
  latest.current = source;
  useEffect(() => register(token.current, path, () => latest.current), [path, register]);
  useEffect(() => notifySource(), [notifySource, source.label, source.query]);
}

export function usePageSearch(label: string, getEntries?: () => SearchEntry[]): [string, Dispatch<SetStateAction<string>>] {
  const [query, setQuery] = useState("");
  useSearchSource({ label, query, setQuery, get entries() { return getEntries?.(); } });
  return [query, setQuery];
}

function pageLabel(path: string) {
  if (path === "/active-videos") return "Videos";
  if (path === "/media") return "Media Library";
  if (path === "/people") return "People";
  if (path === "/clients") return "Clients";
  if (path === "/chat") return "Chat";
  if (path.includes("brief")) return "This Brief";
  if (path.includes("script")) return "This Script";
  return "This page";
}
function scopeEntries(entries: SearchEntry[], path: string) {
  const projectId = path.match(/^\/projects\/([^/]+)/u)?.[1];
  const kind = path.includes("brief") ? "Briefs" : path.includes("script") ? "Scripts" : path.includes("media") ? "Media"
    : path === "/active-videos" ? "Videos" : path === "/chat" ? "Chat" : path === "/people" ? "People" : path === "/clients" ? "Clients" : path === "/brand-kits" ? "Brand Kits" : path === "/outstanding-invoices" ? "Expenses" : null;
  return entries.filter((entry) => kind ? entry.kind === kind && (!projectId || entry.projectId === projectId) : entry.href.split("?")[0] === path);
}

export function currentPageText(path: string): SearchEntry[] {
  return Array.from(document.querySelectorAll<HTMLElement>("main h2, main h3, main p, main td, main [role='row']"))
    .filter((element) => element.checkVisibility() && element.innerText.trim())
    .map((element, index) => ({ id: `page:${path}:${index}`, source: `page:${path}`, kind: "Pages" as const,
      title: element.innerText.trim().split("\n")[0].slice(0, 90), text: element.innerText.trim(), meta: "This page", href: path,
      onSelect: () => { element.scrollIntoView({ block: "center" }); element.classList.add("search-match-target");
        window.setTimeout(() => element.classList.remove("search-match-target"), 3000); },
    }));
}
