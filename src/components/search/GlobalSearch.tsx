"use client";
import { Button } from "../../../Brisk DS/src/app/components/Button";
import { DsIcon } from "@/components/video-review/DsIcon";
import { useGlobalSearch } from "./SearchContext";

export function GlobalSearch() {
  const { open, activeQuery } = useGlobalSearch();
  return <Button size="S" variant="ghost" type="button" onClick={open}
    className="app-global-search-button" aria-label={activeQuery ? `Search, current filter: ${activeQuery}` : "Search"}
    title={activeQuery ? `Search: ${activeQuery} (⌘K / Ctrl+K)` : "Search (⌘K / Ctrl+K)"}>
    <DsIcon name="search" size={20} /><span className="global-search-trigger-label">{activeQuery ? `Search: ${activeQuery}` : "Search"}</span>
  </Button>;
}
