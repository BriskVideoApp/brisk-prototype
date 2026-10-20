"use client";

import { EditingDialog } from "../../../Brisk DS/src/app/components/EditingDialog";

import { ConfirmationDialog } from "../../../Brisk DS/src/app/components/ConfirmationDialog";

import { useRef, useState, type ReactNode } from "react";
import { Button } from "../../../Brisk DS/src/app/components/Button";
import { IconButton } from "../../../Brisk DS/src/app/components/IconButton";
import { BriskSelect } from "../../../Brisk DS/src/app/components/Select";
import type { BrandFont } from "@/data/brand-kits";
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
  return (
    <div className="brand-action-menu-anchor" onClick={(event) => event.stopPropagation()}>
      <BriskSelect
        mode="action"
        ariaLabel={label}
        value=""
        clearable={false}
        placeholder={label}
        options={items.map((item, index) => ({
          value: String(index),
          label: item.label,
          tone: item.destructive ? "danger" : "default",
          dividerAbove: item.destructive && index > 0,
        }))}
        onChange={(value) => items[Number(value)]?.onSelect()}
        actionTrigger={(props) => <IconButton {...props} aria-label={label} tooltipAlign="end"><DsIcon name="dots-three" size={16} /></IconButton>}
      />
    </div>
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

export function DeleteConfirmation({ confirmName, label, onCancel, onConfirm }: { confirmName?: string; label: string; onCancel: () => void; onConfirm: () => void }) {
  const [name, setName] = useState("");
  return <ConfirmationDialog title={`Delete ${label}?`} description="This won't be recoverable." tone="danger" confirmLabel="Delete" confirmDisabled={Boolean(confirmName && name.trim() !== confirmName)} expanded={Boolean(confirmName)} onCancel={onCancel} onConfirm={onConfirm}>
    {confirmName ? <label><span className="label-s-semibold">Type {confirmName} to confirm</span><input value={name} data-confirmation-autofocus autoFocus onChange={(event) => setName(event.target.value)} /></label> : null}
  </ConfirmationDialog>;
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
    <EditingDialog title={<>Rename asset</>} description={<>Use a name your whole team will recognise.</>} size="standard" onCancel={onCancel} actions={<> <Button size="S" variant="secondary" onClick={onCancel}>Cancel</Button>  <Button size="S" variant="primary"

              type="button"
              disabled={!name.trim()}
              onClick={() => onSave(name.trim())}
            >
              Save
            </Button> </>}> <label className="brand-delete-confirm-name">
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
          </label>  </EditingDialog>
  );
}

const standardFontRoles = [
  "heading",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "body",
  "caption",
  "label",
  "mono",
] as const;

function getFontRoleLabel(role: string) {
  if (/^h[1-6]$/u.test(role)) return role.toUpperCase();
  return role.replace(/\b\w/g, (character) => character.toUpperCase());
}

export function FontRoleMatrixDialog({
  fonts,
  onCancel,
  onSave,
}: {
  fonts: BrandFont[];
  onCancel: () => void;
  onSave: (fonts: BrandFont[]) => void;
}) {
  const matrixRoles = [
    ...standardFontRoles,
    ...fonts.map((font) => font.role).filter((role) => !standardFontRoles.includes(role as typeof standardFontRoles[number])),
  ];
  const [draftFonts, setDraftFonts] = useState<BrandFont[]>(() => matrixRoles.map((role) => {
    const font = fonts.find((candidate) => candidate.role === role);
    return font ?? { role, family: "", source: "google" };
  }));

  const updateFamily = (role: string, family: string) => {
    setDraftFonts((current) => current.map((font) => font.role === role ? { ...font, family } : font));
  };

  return (
    <EditingDialog title={<>Font roles</>} description={<>Set every type role together. Leave a font blank to remove it from this Brand Kit.</>} size="wide" onCancel={onCancel} actions={<> <Button size="S" variant="secondary" onClick={onCancel}>Cancel</Button>  <Button size="S" variant="primary"

              type="button"
              onClick={() => onSave(draftFonts.filter((font) => font.family.trim()).map((font) => ({ ...font, family: font.family.trim() })))}
            >
              Save font roles
            </Button> </>}> <div className="brand-font-matrix-frame">
            <table className="brand-font-matrix">
              <thead>
                <tr>
                  <th scope="col">Type</th>
                  <th scope="col">Font family</th>
                </tr>
              </thead>
              <tbody>
                {draftFonts.map((font) => (
                  <tr key={font.role}>
                    <th className="label-s-semibold" scope="row">{getFontRoleLabel(font.role)}</th>
                    <td>
                      <input
                        aria-label={`${getFontRoleLabel(font.role)} font family`}
                        className="brand-inline-input paragraph-s"
                        placeholder="Not set"
                        value={font.family}
                        onChange={(event) => updateFamily(font.role, event.target.value)}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>  </EditingDialog>
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
