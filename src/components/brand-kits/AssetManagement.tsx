"use client";

import { Fragment, useEffect, useRef, useState, type ReactNode } from "react";
import { Button } from "../../../Brisk DS/src/app/components/Button";
import { DsIcon, type DsIconName } from "@/components/video-review/DsIcon";

export type BrandMenuItem = {
  label: string;
  icon?: DsIconName;
  onSelect: () => void;
  destructive?: boolean;
};

export function ActionMenu({
  items,
  label = "More actions",
}: {
  items: BrandMenuItem[];
  label?: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const anchorRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    const closeOutside = (event: PointerEvent) => {
      if (!anchorRef.current?.contains(event.target as Node)) setIsOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsOpen(false);
    };
    document.addEventListener("pointerdown", closeOutside);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOutside);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [isOpen]);

  return (
    <span className="brand-action-menu-anchor" ref={anchorRef}>
      <button
        className="brand-compact-action"
        type="button"
        aria-label={label}
        aria-expanded={isOpen}
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          setIsOpen((current) => !current);
        }}
      >
        <DsIcon name="dots-three" size={16} />
      </button>
      {isOpen ? (
        <span className="brand-action-menu" role="menu">
          {items.map((item, index) => (
            <Fragment key={item.label}>
              {item.destructive && index > 0 ? <span className="brand-action-menu-divider" role="separator" /> : null}
              <button
                className={`label-s ${item.destructive ? "is-destructive" : ""}`}
                type="button"
                role="menuitem"
                onClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  setIsOpen(false);
                  item.onSelect();
                }}
              >
                {item.icon ? <DsIcon name={item.icon} size={15} /> : null}
                {item.label}
              </button>
            </Fragment>
          ))}
        </span>
      ) : null}
    </span>
  );
}

export function TileHeaderActions({
  accept,
  addIcon = "plus",
  addLabel,
  menuItems,
  multiple = true,
  onAdd,
  onFiles,
}: {
  accept?: string;
  addIcon?: DsIconName;
  addLabel: string;
  menuItems?: BrandMenuItem[];
  multiple?: boolean;
  onAdd?: () => void;
  onFiles?: (files: File[]) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="brand-tile-actions">
      <button
        className="brand-icon-button"
        type="button"
        aria-label={addLabel}
        data-tooltip={addLabel}
        onClick={() => {
          if (onFiles) inputRef.current?.click();
          else onAdd?.();
        }}
      >
        <DsIcon name={addIcon} size={16} />
      </button>
      {onFiles ? (
        <input
          ref={inputRef}
          className="sr-only"
          type="file"
          accept={accept}
          multiple={multiple}
          onChange={(event) => {
            const files = Array.from(event.target.files ?? []);
            if (files.length > 0) onFiles(files);
            event.target.value = "";
          }}
        />
      ) : null}
      {menuItems?.length ? (
        <ActionMenu items={menuItems} label="Tile actions" />
      ) : null}
    </div>
  );
}

export function AssetActions({
  checked,
  menuItems,
  onDownload,
  onToggle,
  selectionItems,
}: {
  checked?: boolean;
  menuItems: BrandMenuItem[];
  onDownload?: () => void;
  onToggle?: () => void;
  selectionItems?: BrandMenuItem[];
}) {
  const isSelectionMenu = Boolean(checked && selectionItems?.length);

  return (
    <>
      {onToggle ? (
        <label className="brand-asset-checkbox" onClick={(event) => event.stopPropagation()}>
          <input
            type="checkbox"
            checked={checked}
            aria-label={checked ? "Deselect asset" : "Select asset"}
            onChange={onToggle}
          />
        </label>
      ) : null}
      <span className="brand-asset-actions">
        {onDownload && !isSelectionMenu ? (
          <button
            className="brand-compact-action"
            type="button"
            aria-label="Download"
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              onDownload();
            }}
          >
            <DsIcon name="download-simple" size={15} />
          </button>
        ) : null}
        <ActionMenu items={isSelectionMenu ? selectionItems ?? menuItems : menuItems} />
      </span>
    </>
  );
}

export function DeleteConfirmation({
  confirmName,
  label,
  onCancel,
  onConfirm,
}: {
  confirmName?: string;
  label: string;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const [name, setName] = useState("");
  const canConfirm = !confirmName || name.trim() === confirmName;

  return (
    <div className="brand-modal-backdrop" role="presentation">
      <section className="brand-modal brand-delete-modal" role="dialog" aria-modal="true" aria-labelledby="brand-delete-title">
        <header className="brand-modal-header">
          <div>
            <h2 className="headings-xs-bold" id="brand-delete-title">Delete {label}?</h2>
            <p className="paragraph-s">This won&apos;t be recoverable.</p>
          </div>
          <button className="brand-modal-close" type="button" aria-label="Close" onClick={onCancel}>
            <DsIcon name="x-close-cross" size={18} />
          </button>
        </header>
        <div className="brand-modal-body brand-delete-body">
          {confirmName ? (
            <label className="brand-delete-confirm-name">
              <span className="label-s-semibold">Type {confirmName} to confirm</span>
              <input
                className="brand-inline-input paragraph-m"
                value={name}
                autoFocus
                onChange={(event) => setName(event.target.value)}
              />
            </label>
          ) : null}
          <div className="brand-delete-actions">
            <Button size="S" variant="secondary" onClick={onCancel}>Cancel</Button>
            <button
              className="brand-destructive-button label-s-semibold"
              type="button"
              disabled={!canConfirm}
              onClick={onConfirm}
            >
              Delete
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}

export function RenameAssetDialog({
  initialName,
  onCancel,
  onSave,
}: {
  initialName: string;
  onCancel: () => void;
  onSave: (name: string) => void;
}) {
  const [name, setName] = useState(initialName);

  return (
    <div className="brand-modal-backdrop" role="presentation">
      <section className="brand-modal brand-rename-modal" role="dialog" aria-modal="true" aria-labelledby="brand-rename-title">
        <header className="brand-modal-header">
          <div>
            <h2 className="headings-xs-bold" id="brand-rename-title">Rename asset</h2>
            <p className="paragraph-s">Use a name your whole team will recognise.</p>
          </div>
          <button className="brand-modal-close" type="button" aria-label="Close" onClick={onCancel}>
            <DsIcon name="x-close-cross" size={18} />
          </button>
        </header>
        <div className="brand-modal-body brand-delete-body">
          <label className="brand-delete-confirm-name">
            <span className="label-s-semibold">Name</span>
            <input
              className="brand-inline-input paragraph-m"
              value={name}
              autoFocus
              onFocus={(event) => event.currentTarget.select()}
              onChange={(event) => setName(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && name.trim()) onSave(name.trim());
              }}
            />
          </label>
          <div className="brand-delete-actions">
            <Button size="S" variant="secondary" onClick={onCancel}>Cancel</Button>
            <button
              className="brand-save-button label-s-semibold"
              type="button"
              disabled={!name.trim()}
              onClick={() => onSave(name.trim())}
            >
              Save
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}

export function AddFontDialog({
  onAdd,
  onCancel,
  onUpload,
}: {
  onAdd: (family: string, role: string) => void;
  onCancel: () => void;
  onUpload: (file: File, role: string) => void;
}) {
  const [query, setQuery] = useState("");
  const [role, setRole] = useState("body");
  const [customRole, setCustomRole] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const selectedRole = role === "custom" ? customRole.trim() : role;
  const searchedFamily = query.trim();

  return (
    <div className="brand-modal-backdrop" role="presentation">
      <section className="brand-modal brand-font-modal" role="dialog" aria-modal="true" aria-labelledby="brand-font-title">
        <header className="brand-modal-header">
          <div>
            <h2 className="headings-xs-bold" id="brand-font-title">Add font</h2>
            <p className="paragraph-s">Choose a Google Font or upload a font file.</p>
          </div>
          <button className="brand-modal-close" type="button" aria-label="Close" onClick={onCancel}>
            <DsIcon name="x-close-cross" size={18} />
          </button>
        </header>
        <div className="brand-modal-body brand-font-body">
          <label className="brand-delete-confirm-name">
            <span className="label-s-semibold">Font type</span>
            <select
              className="brand-font-role-select paragraph-m"
              value={role}
              onChange={(event) => setRole(event.target.value)}
            >
              <option value="heading">Heading</option>
              <option value="h1">H1</option>
              <option value="h2">H2</option>
              <option value="h3">H3</option>
              <option value="h4">H4</option>
              <option value="h5">H5</option>
              <option value="h6">H6</option>
              <option value="body">Body</option>
              <option value="caption">Caption</option>
              <option value="label">Label</option>
              <option value="mono">Mono</option>
              <option value="custom">Custom…</option>
            </select>
          </label>
          {role === "custom" ? (
            <label className="brand-delete-confirm-name">
              <span className="label-s-semibold">Custom type</span>
              <input
                className="brand-inline-input paragraph-m"
                value={customRole}
                placeholder="e.g. Display"
                onChange={(event) => setCustomRole(event.target.value)}
              />
            </label>
          ) : null}
          <label className="brand-delete-confirm-name">
            <span className="label-s-semibold">Search Google Fonts</span>
            <span className="brand-font-search">
              <DsIcon name="search" size={16} />
              <input
                className="paragraph-m"
                type="search"
                value={query}
                placeholder="Search fonts..."
                onChange={(event) => setQuery(event.target.value)}
              />
            </span>
          </label>
          <div className="brand-font-results">
            {searchedFamily ? (
              <button
                type="button"
                disabled={!selectedRole}
                onClick={() => onAdd(searchedFamily, selectedRole)}
              >
                <strong className="brand-font-result-name" style={{ fontFamily: searchedFamily }}>
                  Add {searchedFamily}
                </strong>
                <DsIcon name="plus" size={16} />
              </button>
            ) : null}
          </div>
          <button
            className="brand-secondary-button label-s-semibold"
            type="button"
            disabled={!selectedRole}
            onClick={() => fileInputRef.current?.click()}
          >
            Upload font file
          </button>
          <input
            ref={fileInputRef}
            className="sr-only"
            type="file"
            accept=".otf,.ttf,.woff,.woff2"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file && selectedRole) onUpload(file, selectedRole);
              event.target.value = "";
            }}
          />
        </div>
      </section>
    </div>
  );
}

export function UploadProgress({ label, value }: { label: string; value: number }) {
  return (
    <div className="brand-upload-progress" role="status" aria-label={`${label} ${value}% uploaded`}>
      <span className="label-xs-semibold">Uploading to {label}</span>
      <span className="label-xs">{value}%</span>
      <span className="brand-upload-track"><span style={{ width: `${value}%` }} /></span>
    </div>
  );
}

export function ManagedAsset({ children, selected = false }: { children: ReactNode; selected?: boolean }) {
  return <div className={`brand-managed-asset ${selected ? "is-selected" : ""}`}>{children}</div>;
}
