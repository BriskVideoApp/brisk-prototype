import { useEffect, useMemo, useState, type MouseEvent } from "react";
import { DsIcon, type DsIconName } from "@/components/video-review/DsIcon";
import type { MediaCloudFile, MediaCloudProvider } from "@/data/media";
import { formatMediaBytes, formatMediaDuration } from "@/lib/media";

type MediaCloudPickerProps = {
  provider: MediaCloudProvider | null;
  files: MediaCloudFile[];
  folderName: string;
  onClose: () => void;
  onImport: (files: MediaCloudFile[]) => void;
};

export function MediaCloudPicker({ provider, files, folderName, onClose, onImport }: MediaCloudPickerProps) {
  const [query, setQuery] = useState("");
  const [sourceFolder, setSourceFolder] = useState("__all__");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const providerFiles = useMemo(() => files.filter((file) => file.provider === provider), [files, provider]);
  const sourceFolders = useMemo(() => [...new Set(providerFiles.map((file) => file.sourcePath))].toSorted(), [providerFiles]);
  const visibleFiles = useMemo(() => {
    const normalisedQuery = query.trim().toLowerCase();
    return providerFiles
      .filter((file) => sourceFolder === "__all__" || file.sourcePath === sourceFolder)
      .filter((file) => !normalisedQuery || `${file.name} ${file.sourcePath}`.toLowerCase().includes(normalisedQuery));
  }, [providerFiles, query, sourceFolder]);
  const selectedFiles = providerFiles.filter((file) => selectedIds.has(file.id));
  const allVisibleSelected = visibleFiles.length > 0 && visibleFiles.every((file) => selectedIds.has(file.id));
  const someVisibleSelected = visibleFiles.some((file) => selectedIds.has(file.id)) && !allVisibleSelected;
  const providerName = getProviderName(provider);

  useEffect(() => {
    setQuery("");
    setSourceFolder("__all__");
    setSelectedIds(new Set());
  }, [provider]);

  useEffect(() => {
    if (!provider) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose, provider]);

  if (!provider) return null;

  const toggleFile = (fileId: string, checked: boolean) => {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (checked) next.add(fileId);
      else next.delete(fileId);
      return next;
    });
  };

  const toggleVisibleFiles = () => {
    setSelectedIds((current) => {
      const next = new Set(current);
      visibleFiles.forEach((file) => {
        if (allVisibleSelected) next.delete(file.id);
        else next.add(file.id);
      });
      return next;
    });
  };

  const handleBackdropClick = (event: MouseEvent<HTMLDivElement>) => {
    if (event.target === event.currentTarget) onClose();
  };

  return (
    <div className="media-modal-backdrop" role="presentation" onMouseDown={handleBackdropClick}>
      <section className="media-cloud-picker" role="dialog" aria-modal="true" aria-labelledby="media-cloud-picker-title">
        <header className="media-cloud-picker-header">
          <div>
            <span className="label-xs-semibold">Add from connected storage</span>
            <h2 id="media-cloud-picker-title">{providerName}</h2>
          </div>
          <button className="media-icon-button" type="button" aria-label={`Close ${providerName}`} onClick={onClose}>
            <DsIcon name="x-close-cross" size={16} />
          </button>
        </header>

        <div className="media-cloud-picker-context">
          <div>
            <span className="label-xs">Signed in as</span>
            <strong className="label-s-semibold">tom@briskstudios.com</strong>
          </div>
          <div>
            <span className="label-xs">Import to</span>
            <strong className="label-s-semibold"><DsIcon name="folder" size={14} />{folderName}</strong>
          </div>
        </div>

        <div className="media-cloud-picker-tools">
          <label className="media-cloud-folder-filter">
            <span className="sr-only">Source folder</span>
            <DsIcon name="folder-open" size={16} />
            <select value={sourceFolder} onChange={(event) => setSourceFolder(event.target.value)}>
              <option value="__all__">All folders</option>
              {sourceFolders.map((folder) => <option value={folder} key={folder}>{folder}</option>)}
            </select>
            <DsIcon name="caret-down" size={14} />
          </label>
          <label className="media-search-shell">
            <DsIcon name="search" size={16} />
            <input
              autoFocus
              type="search"
              value={query}
              placeholder={`Search ${providerName}`}
              onChange={(event) => setQuery(event.target.value)}
            />
          </label>
          <div className="media-cloud-select-all">
            <MediaCloudCheckbox
              label="Select all"
              checked={allVisibleSelected}
              indeterminate={someVisibleSelected}
              onChange={toggleVisibleFiles}
            />
            <span className="label-xs">{visibleFiles.length} files</span>
          </div>
        </div>

        <div className="media-cloud-file-list" role="list" aria-label={`${providerName} files`}>
          {visibleFiles.length > 0 ? visibleFiles.map((file) => (
            <div className={`media-cloud-file-row ${selectedIds.has(file.id) ? "is-selected" : ""}`} role="listitem" key={file.id}>
              <div className={`media-cloud-file-preview is-${file.kind}`} style={file.thumbnailUrl ? { backgroundImage: `url(${file.thumbnailUrl})` } : undefined}>
                {!file.thumbnailUrl ? <DsIcon name={getFileIcon(file.kind)} size={20} /> : null}
              </div>
              <div className="media-cloud-file-choice">
                <MediaCloudCheckbox label={file.name} checked={selectedIds.has(file.id)} onChange={(checked) => toggleFile(file.id, checked)} />
                <span className="label-xs">{file.sourcePath}</span>
              </div>
              <div className="media-cloud-file-meta label-xs">
                <span>{formatMediaBytes(file.sizeBytes)}{file.durationSeconds ? ` · ${formatMediaDuration(file.durationSeconds)}` : ""}</span>
                <span>{file.modifiedLabel}</span>
              </div>
            </div>
          )) : (
            <div className="media-cloud-picker-empty">
              <DsIcon name="search" size={24} />
              <strong className="label-s-semibold">No matching files</strong>
              <span className="label-xs">Try another filename or folder.</span>
            </div>
          )}
        </div>

        <footer className="media-cloud-picker-footer">
          <p className="label-xs">
            Originals stay in {providerName}. Brisk stores a stable provider reference and prepares a separate playback asset.
          </p>
          <div>
            <button className="media-secondary-button label-s-semibold" type="button" onClick={onClose}>Cancel</button>
            <button
              className="media-primary-button label-s-semibold"
              type="button"
              disabled={selectedFiles.length === 0}
              onClick={() => onImport(selectedFiles)}
            >
              <DsIcon name="plus" size={16} />
              Add {selectedFiles.length > 0 ? selectedFiles.length : ""} {selectedFiles.length === 1 ? "file" : "files"} to Brisk
            </button>
          </div>
        </footer>
      </section>
    </div>
  );
}

function getProviderName(provider: MediaCloudProvider | null) {
  return provider === "dropbox" ? "Dropbox" : "Google Drive";
}

function getFileIcon(kind: MediaCloudFile["kind"]): DsIconName {
  if (kind === "video") return "file-video";
  if (kind === "audio") return "file-audio";
  if (kind === "image") return "image-square";
  return "file-text";
}

function MediaCloudCheckbox({
  label,
  checked,
  indeterminate = false,
  onChange,
}: {
  label: string;
  checked: boolean;
  indeterminate?: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <button
      className="media-cloud-checkbox"
      type="button"
      role="checkbox"
      aria-checked={indeterminate ? "mixed" : checked}
      onClick={() => onChange(!checked)}
    >
      <span className={`media-cloud-checkbox-box ${checked || indeterminate ? "is-checked" : ""}`}>
        {indeterminate ? <span className="media-cloud-checkbox-mixed" /> : checked ? <DsIcon name="check" size={14} /> : null}
      </span>
      <span className="label-s">{label}</span>
    </button>
  );
}
