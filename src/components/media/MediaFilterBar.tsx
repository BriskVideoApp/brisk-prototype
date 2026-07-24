import { DsIcon } from "@/components/video-review/DsIcon";
import type { MediaAsset } from "@/data/media";

export type MediaTypeFilter = "all" | MediaAsset["kind"];
export type MediaViewMode = "card" | "list";
export type MediaSort = "newest" | "oldest" | "name" | "size" | "duration";

type MediaFilterBarProps = {
  typeFilter: MediaTypeFilter;
  viewMode: MediaViewMode;
  sort: MediaSort;
  query: string;
  onTypeFilterChange: (value: MediaTypeFilter) => void;
  onViewModeChange: (value: MediaViewMode) => void;
  onSortChange: (value: MediaSort) => void;
  onQueryChange: (value: string) => void;
};

const typeOptions: { label: string; value: MediaTypeFilter }[] = [
  { label: "All", value: "all" },
  { label: "Video", value: "video" },
  { label: "Audio", value: "audio" },
  { label: "Image", value: "image" },
  { label: "Document", value: "document" },
  { label: "Others", value: "other" },
];

export function MediaFilterBar(props: MediaFilterBarProps) {
  return (
    <div className="media-filter-bar">
      <div className="media-type-chips" aria-label="Filter media by type">
        {typeOptions.map((option) => (
          <button
            className={`media-type-chip label-xs-semibold ${props.typeFilter === option.value ? "is-active" : ""}`}
            type="button"
            key={option.value}
            aria-pressed={props.typeFilter === option.value}
            onClick={() => props.onTypeFilterChange(option.value)}
          >
            {option.label}
          </button>
        ))}
      </div>
      <div className="media-filter-controls">
        <div className="media-view-toggle" aria-label="Media view">
          <button
            type="button"
            className={props.viewMode === "card" ? "is-active" : ""}
            aria-label="Card view"
            aria-pressed={props.viewMode === "card"}
            data-tooltip="Card view"
            onClick={() => props.onViewModeChange("card")}
          >
            <DsIcon name="grid-four" size={16} />
          </button>
          <button
            type="button"
            className={props.viewMode === "list" ? "is-active" : ""}
            aria-label="List view"
            aria-pressed={props.viewMode === "list"}
            data-tooltip="List view"
            onClick={() => props.onViewModeChange("list")}
          >
            <DsIcon name="columns" size={16} />
          </button>
        </div>
        <label className="media-select-shell label-s">
          <span className="sr-only">Sort media</span>
          <select value={props.sort} onChange={(event) => props.onSortChange(event.target.value as MediaSort)}>
            <option value="newest">Newest first</option>
            <option value="oldest">Oldest first</option>
            <option value="name">Name</option>
            <option value="size">Size</option>
            <option value="duration">Duration</option>
          </select>
          <DsIcon name="caret-down" size={16} />
        </label>
        <label className="media-search-shell">
          <DsIcon name="search" size={16} />
          <input
            className="label-s"
            type="search"
            value={props.query}
            placeholder="Search filenames"
            onChange={(event) => props.onQueryChange(event.target.value)}
          />
        </label>
      </div>
    </div>
  );
}
