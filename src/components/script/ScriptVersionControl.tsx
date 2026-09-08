"use client";

import { DsIcon } from "@/components/video-review/DsIcon";

export type ScriptVersionControlItem = {
  id: string;
  shortLabel: string;
  displayName: string;
  metaLabel: string;
  isCurrent: boolean;
  isSelected: boolean;
};

export function ScriptVersionControl({
  currentShortLabel,
  isOpen,
  isPreviewing = false,
  items,
  onCreateVersion,
  onDuplicateCurrentVersion,
  onOpenChange,
  onRenameCurrentVersion,
  onSelectVersion,
}: {
  currentShortLabel: string;
  isOpen: boolean;
  isPreviewing?: boolean;
  items: ScriptVersionControlItem[];
  onCreateVersion: () => void;
  onDuplicateCurrentVersion: () => void;
  onOpenChange: (isOpen: boolean) => void;
  onRenameCurrentVersion: () => void;
  onSelectVersion: (versionId: string) => void;
}) {
  const runAction = (action: () => void) => {
    action();
    onOpenChange(false);
  };

  return (
    <div className="script-version-control">
      <div className="script-version-panel-wrap">
        <button
          className={`script-current-version-button label-xs-semibold ${isPreviewing ? "previewing" : ""}`}
          type="button"
          aria-label="Open versions"
          aria-expanded={isOpen}
          onClick={() => onOpenChange(!isOpen)}
        >
          <span>{currentShortLabel}</span>
          <DsIcon name="caret-down" size={14} />
        </button>
        {isOpen ? (
          <aside className={`script-versions-panel ${isPreviewing ? "has-preview" : ""}`} aria-label="Versions">
            <div className="script-versions-panel-content">
              <section className="script-versions-section" aria-label="Saved versions">
                <h3 className="label-xs-semibold">Versions</h3>
                <div className="script-version-list">
                  {items.map((item) => {
                    const rowCopy = (
                      <span className="script-version-row-copy">
                        <strong className="label-xs-semibold" title={`${item.shortLabel} · ${item.displayName}`}>
                          <span>{item.shortLabel}</span>
                          <span aria-hidden="true">·</span>
                          <span className="script-version-row-display-name label-xs">{item.displayName}</span>
                        </strong>
                        <span className="script-version-row-meta label-xs">{item.metaLabel}</span>
                      </span>
                    );

                    return (
                      <article
                        className={`script-version-row ${item.isCurrent ? "current" : ""} ${item.isSelected ? "selected" : ""}`}
                        aria-current={item.isCurrent ? "true" : undefined}
                        key={item.id}
                      >
                        <div className="script-version-row-main">
                          {!item.isCurrent || isPreviewing ? (
                            <button
                              className="script-version-row-body"
                              type="button"
                              onClick={() => runAction(() => onSelectVersion(item.id))}
                            >
                              {rowCopy}
                            </button>
                          ) : (
                            <span className="script-version-row-body">{rowCopy}</span>
                          )}
                        </div>
                      </article>
                    );
                  })}
                </div>
                <div className="script-versions-panel-actions">
                  <button className="label-xs-semibold" type="button" onClick={() => runAction(onCreateVersion)}>
                    <DsIcon name="plus" size={12} />
                    <span>New blank version</span>
                  </button>
                  <button className="label-xs-semibold" type="button" onClick={() => runAction(onDuplicateCurrentVersion)}>
                    <DsIcon name="copy" size={12} />
                    <span>Duplicate current version</span>
                  </button>
                  <button className="label-xs-semibold" type="button" onClick={() => runAction(onRenameCurrentVersion)}>
                    <DsIcon name="pencil-simple" size={12} />
                    <span>Rename version</span>
                  </button>
                </div>
              </section>
            </div>
          </aside>
        ) : null}
      </div>
      {isPreviewing ? (
        <span className="script-version-read-only label-xs">
          <DsIcon name="lock" size={12} />
          <span>Read only</span>
        </span>
      ) : null}
    </div>
  );
}
