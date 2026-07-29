"use client";

import Link from "next/link";
import {
  useEffect,
  useRef,
  useState,
  type DragEvent,
  type ReactNode,
} from "react";
import { Button } from "../../../Brisk DS/src/app/components/Button";
import { Input } from "../../../Brisk DS/src/app/components/Input";
import { DsIcon, type DsIconName } from "@/components/video-review/DsIcon";
import {
  getBrandFromFiles,
  getBrandFromSources,
} from "@/lib/brand-profile-adapter";
import type {
  BrandColour,
  BrandFont,
  BrandLogo,
  BrandProfile,
  BrandRelationship,
  SubBrand,
} from "@/data/brand-kits";
import { createManualBrandProfile } from "@/data/brand-kits";
import type {
  BrandProfileSection,
  SetupMode,
  SetupSource,
} from "./BrandKitContext";

export function BrandTile({
  action,
  autoDetected = false,
  children,
  className = "",
  id,
  title,
}: {
  action?: ReactNode;
  autoDetected?: boolean;
  children: ReactNode;
  className?: string;
  id?: string;
  title: string;
}) {
  return (
    <article className={`brand-tile ${className}`} id={id}>
      <header className="brand-tile-header">
        <div>
          <h2 className="headings-2xs-bold">{title}</h2>
          {autoDetected ? (
            <span className="brand-auto-tag label-xs-semibold">Auto-detected · edit to override</span>
          ) : null}
        </div>
        {action ? <div className="brand-tile-action">{action}</div> : null}
      </header>
      <div className="brand-tile-body">{children}</div>
    </article>
  );
}

export function HeroTile({
  action,
  autoDetected,
  children,
  isClientView = false,
}: {
  action?: ReactNode;
  autoDetected?: boolean;
  children: ReactNode;
  isClientView?: boolean;
}) {
  return (
    <BrandTile
      action={action}
      autoDetected={autoDetected}
      className={`brand-hero-tile ${isClientView ? "is-client-view" : ""}`}
      title="Brand Kit"
    >
      {children}
    </BrandTile>
  );
}

export function TileActionButton({
  icon,
  label,
  onClick,
}: {
  icon: DsIconName;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      className="brand-icon-button"
      type="button"
      aria-label={label}
      data-tooltip={label}
      onClick={onClick}
    >
      <DsIcon name={icon} size={16} />
    </button>
  );
}

export function EmptyTile({
  action,
  copy,
  icon,
  title,
}: {
  action:
    | { label: string; onClick: () => void; onFiles?: never; accept?: never; multiple?: never }
    | { label: string; onFiles: (files: File[]) => void; accept: string; multiple?: boolean; onClick?: never };
  copy: string;
  icon: DsIconName;
  title?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const isUploadAction = "onFiles" in action;

  const handleFiles = (files: FileList | null) => {
    if (typeof action.onFiles !== "function" || !files?.length) return;
    action.onFiles(Array.from(files));
    if (inputRef.current) inputRef.current.value = "";
  };

  return (
    <div className="brand-empty-tile">
      <span className="brand-empty-icon" aria-hidden="true">
        <DsIcon name={icon} size={24} />
      </span>
      {title ? <strong className="label-m-semibold">{title}</strong> : null}
      <p className="paragraph-s">{copy}</p>
      <Button
        size="S"
        onClick={() => {
          if (isUploadAction) {
            inputRef.current?.click();
          } else {
            action.onClick();
          }
        }}
      >
        {action.label}
      </Button>
      {isUploadAction ? (
        <input
          ref={inputRef}
          className="sr-only"
          type="file"
          accept={action.accept}
          multiple={action.multiple ?? true}
          onChange={(event) => handleFiles(event.target.files)}
        />
      ) : null}
    </div>
  );
}

export function TileUploadButton({
  accept,
  label,
  multiple = true,
  onFiles,
}: {
  accept: string;
  label: string;
  multiple?: boolean;
  onFiles: (files: File[]) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFiles = (files: FileList | null) => {
    if (!files?.length) return;
    onFiles(Array.from(files));
    if (inputRef.current) inputRef.current.value = "";
  };

  return (
    <>
      <button
        className="brand-icon-button"
        type="button"
        aria-label={label}
        data-tooltip={label}
        onClick={() => inputRef.current?.click()}
      >
        <DsIcon name="upload-simple" size={16} />
      </button>
      <input
        ref={inputRef}
        className="sr-only"
        type="file"
        accept={accept}
        multiple={multiple}
        onChange={(event) => handleFiles(event.target.files)}
      />
    </>
  );
}

export function ColourSwatch({
  colour,
  editable,
  onChange,
  onCopy,
}: {
  colour: BrandColour;
  editable: boolean;
  onChange: (nextColour: BrandColour) => void;
  onCopy: (hex: string) => void;
}) {
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [hexDraft, setHexDraft] = useState(colour.hex.toUpperCase());
  const pickerColour = normalisePickerColour(colour.hex);
  const hsv = hexToHsv(pickerColour);

  useEffect(() => {
    setHexDraft(colour.hex.toUpperCase());
  }, [colour.hex]);

  const applyHex = (hex: string) => {
    const nextHex = hex.toUpperCase();
    setHexDraft(nextHex);
    if (/^#[0-9A-F]{6}$/u.test(nextHex)) {
      onChange({ ...colour, hex: nextHex });
    }
  };

  const updateSaturationAndValue = (
    event: React.PointerEvent<HTMLButtonElement>,
  ) => {
    const bounds = event.currentTarget.getBoundingClientRect();
    const saturation = clamp((event.clientX - bounds.left) / bounds.width);
    const value = clamp(1 - ((event.clientY - bounds.top) / bounds.height));
    applyHex(hsvToHex(hsv.hue, saturation, value));
  };

  return (
    <div className="colour-swatch">
      <div className="colour-picker-anchor">
        {editable ? (
          <button
            className="colour-swatch-copy"
            type="button"
            aria-label={`Edit ${colour.name ?? colour.role} colour`}
            aria-expanded={isPickerOpen}
            onClick={() => setIsPickerOpen(true)}
          >
            <span className="colour-swatch-colour" style={{ backgroundColor: colour.hex }} />
            <span className="colour-swatch-copy-icon"><DsIcon name="pencil-simple-ds" size={14} /></span>
          </button>
        ) : (
          <button
            className="colour-swatch-copy"
            type="button"
            aria-label={`Copy ${colour.name ?? colour.hex} ${colour.hex}`}
            onClick={() => onCopy(colour.hex)}
          >
            <span className="colour-swatch-colour" style={{ backgroundColor: colour.hex }} />
            <span className="colour-swatch-copy-icon"><DsIcon name="copy" size={14} /></span>
          </button>
        )}
        {editable && isPickerOpen ? (
          <div className="brisk-colour-picker" role="dialog" aria-label={`Edit ${colour.name ?? colour.role} colour`}>
            <label className="brisk-colour-picker-hex">
              <span className="label-xs-semibold">Hex</span>
              <input
                autoFocus
                className="brand-inline-input label-s-semibold"
                aria-label="Hex colour"
                value={hexDraft}
                onChange={(event) => applyHex(event.target.value.startsWith("#")
                  ? event.target.value
                  : `#${event.target.value}`)}
                onFocus={(event) => event.currentTarget.select()}
                onBlur={() => setHexDraft(colour.hex.toUpperCase())}
              />
            </label>
            <button
              className="brisk-colour-field"
              type="button"
              aria-label="Choose colour saturation and brightness"
              style={{ backgroundColor: `hsl(${hsv.hue} 100% 50%)` }}
              onPointerDown={(event) => {
                event.currentTarget.setPointerCapture(event.pointerId);
                updateSaturationAndValue(event);
              }}
              onPointerMove={(event) => {
                if (event.currentTarget.hasPointerCapture(event.pointerId)) {
                  updateSaturationAndValue(event);
                }
              }}
            >
              <span
                className="brisk-colour-field-marker"
                style={{ left: `${hsv.saturation * 100}%`, top: `${(1 - hsv.value) * 100}%` }}
              />
            </button>
            <label className="brisk-colour-hue">
              <span className="label-xs-semibold">Hue</span>
              <input
                type="range"
                min="0"
                max="359"
                value={Math.round(hsv.hue)}
                aria-label="Colour hue"
                onChange={(event) => applyHex(hsvToHex(
                  Number(event.target.value),
                  hsv.saturation,
                  hsv.value,
                ))}
              />
            </label>
            <div className="brisk-colour-picker-footer">
              <span className="brisk-colour-preview" style={{ backgroundColor: pickerColour }} />
              <span className="label-s-semibold">{pickerColour}</span>
              <Button size="S" variant="secondary" onClick={() => setIsPickerOpen(false)}>Done</Button>
            </div>
          </div>
        ) : null}
      </div>
      <div className="colour-swatch-meta">
        <span className="label-xs-semibold">{colour.name ?? colour.role}</span>
        {editable ? (
          <input
            className="brand-inline-input label-xs"
            aria-label={`${colour.name ?? colour.role} hex colour`}
            value={colour.hex}
            onChange={(event) => onChange({ ...colour, hex: event.target.value.toUpperCase() })}
          />
        ) : (
          <button className="colour-swatch-hex label-xs" type="button" onClick={() => onCopy(colour.hex)}>
            {colour.hex}
          </button>
        )}
      </div>
    </div>
  );
}

const fontSourceLabels: Record<BrandFont["source"], string> = {
  google: "Google Fonts",
  adobe: "Adobe Fonts",
  custom: "Custom upload",
};

export function FontPreview({
  editable,
  font,
  onChange,
  onRemove,
  onUpload,
}: {
  editable: boolean;
  font: BrandFont;
  onChange: (font: BrandFont) => void;
  onRemove: () => void;
  onUpload: (file: File) => void;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="font-preview">
      <span className="font-preview-aa" style={{ fontFamily: font.family }}>Aa</span>
      <div className="font-preview-meta">
        <div className="font-preview-heading">
          {editable ? (
            <select
              className="font-preview-select label-xs-semibold"
              aria-label={`${font.family || "Font"} role`}
              value={font.role}
              onChange={(event) => onChange({
                ...font,
                role: event.target.value as BrandFont["role"],
              })}
            >
              <option value="heading">Heading</option>
              <option value="body">Body</option>
              <option value="mono">Mono</option>
            </select>
          ) : (
            <span className="label-xs-semibold">{capitalise(font.role)}</span>
          )}
          {editable ? (
            <span className="font-preview-actions">
              <button
                className="font-preview-action"
                type="button"
                aria-label={`Replace ${font.family || font.role} font`}
                data-tooltip="Replace font"
                onClick={() => fileInputRef.current?.click()}
              >
                <DsIcon name="upload-simple" size={14} />
              </button>
              <button
                className="font-preview-action"
                type="button"
                aria-label={`Remove ${font.family || font.role} font`}
                data-tooltip="Remove font"
                onClick={onRemove}
              >
                <DsIcon name="trash-simple" size={14} />
              </button>
              <input
                ref={fileInputRef}
                className="sr-only"
                type="file"
                accept=".otf,.ttf,.woff,.woff2"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) onUpload(file);
                  event.target.value = "";
                }}
              />
            </span>
          ) : null}
        </div>
        {editable ? (
          <input
            className="brand-inline-input label-s-semibold"
            aria-label={`${font.role} font family`}
            value={font.family}
            placeholder="Choose or enter a font"
            onChange={(event) => onChange({ ...font, family: event.target.value })}
          />
        ) : (
          <strong className="label-s-semibold">{font.family}</strong>
        )}
        {editable ? (
          <select
            className="font-preview-select font-preview-source label-xs"
            aria-label={`${font.family || font.role} source`}
            value={font.source}
            onChange={(event) => onChange({
              ...font,
              source: event.target.value as BrandFont["source"],
            })}
          >
            {Object.entries(fontSourceLabels).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        ) : (
          <span className="label-xs">{fontSourceLabels[font.source]}</span>
        )}
      </div>
    </div>
  );
}

export function LogoVariant({
  logo,
  onOpen,
}: {
  logo: BrandLogo;
  onOpen: (logo: BrandLogo) => void;
}) {
  return (
    <button
      className={`logo-variant is-${logo.variant}`}
      type="button"
      onClick={() => onOpen(logo)}
    >
      <span className="logo-variant-image">
        <img src={logo.url} alt="" />
      </span>
      <span className="label-xs-semibold">{logo.label}</span>
      <span className="label-xs">{logo.format.toUpperCase()}</span>
    </button>
  );
}

export function SubBrandCard({
  customerSlug,
  subBrand,
}: {
  customerSlug: string;
  subBrand: SubBrand;
}) {
  return (
    <Link
      className="sub-brand-card"
      href={`/brand-kits/${customerSlug}/${subBrand.slug}${subBrand.relationship === "master" ? "?relationship=master" : ""}`}
    >
      <span className="sub-brand-logo">
        <img src={subBrand.logoUrl} alt="" />
      </span>
      <span>
        <strong className="label-s-semibold">{subBrand.name}</strong>
        <small className="label-xs">
          {subBrand.relationship === "master" ? "Master brand" : "Sub-brand"} · {subBrand.lastUpdated}
        </small>
      </span>
      <DsIcon name="caret-right" size={16} />
    </Link>
  );
}

export type DetectedUpload = {
  file: File;
  kind: "Logo" | "Guidelines" | "Font" | "Image" | "Video" | "File";
};

export function UploadZone({
  files,
  onFilesChange,
  uploadKind = "all",
}: {
  files: DetectedUpload[];
  onFilesChange: (files: DetectedUpload[]) => void;
  uploadKind?: "all" | "guidelines";
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const addFiles = (nextFiles: File[]) => {
    const acceptedFiles = uploadKind === "guidelines"
      ? nextFiles.filter((file) => /\.pdf$/iu.test(file.name))
      : nextFiles;
    const uploads = acceptedFiles.map((file) => ({ file, kind: detectFileKind(file) }));
    const existingFiles = uploadKind === "guidelines" ? [] : files;
    onFilesChange([
      ...existingFiles,
      ...uploads.filter((upload) =>
        !existingFiles.some((existing) =>
          existing.file.name === upload.file.name && existing.file.size === upload.file.size,
        ),
      ),
    ]);
  };

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(false);
    addFiles(Array.from(event.dataTransfer.files));
  };

  return (
    <div className="upload-zone-wrap">
      <div
        className={`upload-zone ${uploadKind === "guidelines" ? "is-compact" : ""} ${isDragging ? "is-dragging" : ""}`}
        onDragEnter={(event) => {
          event.preventDefault();
          setIsDragging(true);
        }}
        onDragOver={(event) => event.preventDefault()}
        onDragLeave={(event) => {
          if (event.currentTarget === event.target) {
            setIsDragging(false);
          }
        }}
        onDrop={handleDrop}
      >
        <span className="upload-zone-icon">
          <DsIcon name={uploadKind === "guidelines" ? "file-text" : "upload-simple"} size={24} />
        </span>
        <strong className="label-m-semibold">
          {uploadKind === "guidelines" ? "Upload brand guidelines" : "Drop folders or files here"}
        </strong>
        <p className="paragraph-s">
          {uploadKind === "guidelines"
            ? "Drop a PDF here, or browse to choose one."
            : "ZIPs, folders, PDFs, fonts, images and videos are supported."}
        </p>
        <Button size="S" variant="secondary" onClick={() => inputRef.current?.click()}>
          Browse
        </Button>
        <input
          ref={inputRef}
          className="sr-only"
          type="file"
          multiple={uploadKind === "all"}
          accept={uploadKind === "guidelines"
            ? ".pdf,application/pdf"
            : ".zip,.pdf,.svg,.png,.jpg,.jpeg,.webp,.otf,.ttf,.woff,.woff2,.mp4,.mov,.m4v,.webm,.aep,.mogrt"}
          onChange={(event) => {
            addFiles(Array.from(event.target.files ?? []));
            event.target.value = "";
          }}
        />
      </div>
      {files.length > 0 ? (
        <div className="upload-file-list" aria-label="Detected files">
          {files.map((upload) => (
            <div className="upload-file-row" key={`${upload.file.name}-${upload.file.size}`}>
              <span className="upload-file-kind label-xs-semibold">{upload.kind}</span>
              <span className="label-s">{upload.file.name}</span>
              <span className="label-xs">{formatFileSize(upload.file.size)}</span>
              <button
                type="button"
                aria-label={`Remove ${upload.file.name}`}
                onClick={() =>
                  onFilesChange(files.filter((candidate) => candidate !== upload))
                }
              >
                <DsIcon name="x-close-cross" size={14} />
              </button>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export function SetupModal({
  customerName,
  initialMode = "quick",
  brandRelationship,
  isCustomerView = false,
  onClose,
  onComplete,
}: {
  customerName: string;
  initialMode?: SetupMode;
  brandRelationship?: BrandRelationship;
  isCustomerView?: boolean;
  onClose: () => void;
  onComplete: (profile: BrandProfile, source: SetupSource, name?: string) => void;
}) {
  const [mode, setMode] = useState<SetupMode>(initialMode);
  const [website, setWebsite] = useState("");
  const [subBrandName, setSubBrandName] = useState("");
  const [files, setFiles] = useState<DetectedUpload[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async () => {
    if (isLoading || (mode === "quick" && !website.trim() && files.length === 0) || (mode === "deep" && files.length === 0)) {
      return;
    }

    setIsLoading(true);
    const profile = mode === "quick"
      ? await getBrandFromSources(website, files.map((upload) => upload.file))
      : await getBrandFromFiles(files.map((upload) => upload.file));
    const detectedName = subBrandName.trim()
      || getNameFromWebsite(website)
      || (brandRelationship === "master" ? `${customerName} brand` : `${customerName} sub-brand`);
    onComplete(profile, mode, brandRelationship ? detectedName : undefined);
  };

  const handleManualSetup = () => {
    const detectedName = subBrandName.trim()
      || getNameFromWebsite(website)
      || (brandRelationship === "master" ? `${customerName} brand` : `${customerName} sub-brand`);
    onComplete(
      createManualBrandProfile(),
      "manual",
      brandRelationship ? detectedName : undefined,
    );
  };

  return (
    <div className="brand-modal-backdrop" role="presentation" onMouseDown={onClose}>
      <section
        className="brand-modal setup-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="setup-modal-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header className="brand-modal-header">
          <div>
            <h2 className="headings-xs-bold" id="setup-modal-title">
              {brandRelationship ? "Add a brand" : `Set up ${customerName}'s Brand Kit`}
            </h2>
            <p className="paragraph-s">
              {mode === "quick"
                ? `Start with ${isCustomerView ? "your" : "their"} website, brand guidelines, or both.`
                : "Build the kit from the files you already have."}
            </p>
          </div>
          <button className="brand-modal-close" type="button" aria-label="Close" onClick={onClose}>
            <DsIcon name="x-close-cross" size={18} />
          </button>
        </header>

        <div className="brand-modal-body">
          {isLoading ? (
            <div className="brand-setup-loading" role="status">
              <span className="brand-loading-mark"><DsIcon name="sparkle" size={24} /></span>
              <strong className="label-m-semibold">
                Reading {isCustomerView ? "your" : "their"} brand…
              </strong>
              <p className="paragraph-s">Finding logos, colours, fonts and brand cues.</p>
            </div>
          ) : mode === "quick" ? (
            <div className="brand-setup-form">
              {brandRelationship ? (
                <Input
                  label="Brand name"
                  value={subBrandName}
                  onChange={(event) => setSubBrandName(event.target.value)}
                  placeholder={brandRelationship === "master" ? "Loom Studios" : "Loom Enterprise"}
                  size="M"
                />
              ) : null}
              <Input
                label={isCustomerView ? "Your website" : "Customer's website"}
                value={website}
                onChange={(event) => setWebsite(event.target.value)}
                placeholder={isCustomerView ? "yourcompany.com" : "theircompany.com"}
                size="M"
              />
              <UploadZone files={files} onFilesChange={setFiles} uploadKind="guidelines" />
              <Button onClick={handleSubmit}>Build Brand Kit</Button>
              <button className="brand-setup-alt label-s-semibold" type="button" onClick={handleManualSetup}>
                Set up manually
              </button>
            </div>
          ) : (
            <div className="brand-setup-form">
              {brandRelationship ? (
                <Input
                  label="Brand name"
                  value={subBrandName}
                  onChange={(event) => setSubBrandName(event.target.value)}
                  placeholder={brandRelationship === "master" ? "Loom Studios" : "Loom Enterprise"}
                  size="M"
                />
              ) : null}
              <UploadZone files={files} onFilesChange={setFiles} />
              <Button onClick={handleSubmit}>Set up Brand Kit</Button>
              <button
                className="brand-setup-alt label-s-semibold"
                type="button"
                onClick={() => {
                  setFiles([]);
                  setMode("quick");
                }}
              >
                Use {isCustomerView ? "your" : "their"} website or brand guidelines instead
              </button>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

function normalisePickerColour(value: string) {
  return /^#[0-9a-f]{6}$/iu.test(value) ? value : "#FFFFFF";
}

function clamp(value: number) {
  return Math.min(1, Math.max(0, value));
}

function hexToHsv(hex: string) {
  const red = Number.parseInt(hex.slice(1, 3), 16) / 255;
  const green = Number.parseInt(hex.slice(3, 5), 16) / 255;
  const blue = Number.parseInt(hex.slice(5, 7), 16) / 255;
  const maximum = Math.max(red, green, blue);
  const minimum = Math.min(red, green, blue);
  const delta = maximum - minimum;
  let hue = 0;

  if (delta !== 0) {
    if (maximum === red) hue = 60 * (((green - blue) / delta) % 6);
    if (maximum === green) hue = 60 * (((blue - red) / delta) + 2);
    if (maximum === blue) hue = 60 * (((red - green) / delta) + 4);
  }

  if (hue < 0) hue += 360;

  return {
    hue,
    saturation: maximum === 0 ? 0 : delta / maximum,
    value: maximum,
  };
}

function hsvToHex(hue: number, saturation: number, value: number) {
  const chroma = value * saturation;
  const hueSegment = hue / 60;
  const secondary = chroma * (1 - Math.abs((hueSegment % 2) - 1));
  const offset = value - chroma;
  let red = 0;
  let green = 0;
  let blue = 0;

  if (hueSegment < 1) [red, green, blue] = [chroma, secondary, 0];
  else if (hueSegment < 2) [red, green, blue] = [secondary, chroma, 0];
  else if (hueSegment < 3) [red, green, blue] = [0, chroma, secondary];
  else if (hueSegment < 4) [red, green, blue] = [0, secondary, chroma];
  else if (hueSegment < 5) [red, green, blue] = [secondary, 0, chroma];
  else [red, green, blue] = [chroma, 0, secondary];

  const toHex = (channel: number) => Math.round((channel + offset) * 255)
    .toString(16)
    .padStart(2, "0")
    .toUpperCase();

  return `#${toHex(red)}${toHex(green)}${toHex(blue)}`;
}

export function AutoDetectedAction({
  section,
}: {
  section: BrandProfileSection;
}) {
  return <span className="sr-only">Edit auto-detected {section}</span>;
}

function detectFileKind(file: File): DetectedUpload["kind"] {
  const name = file.name.toLowerCase();

  if (/\.(svg|eps|ai)$/u.test(name) || /logo/u.test(name)) {
    return "Logo";
  }
  if (/\.pdf$/u.test(name) || /guideline|brandbook/u.test(name)) {
    return "Guidelines";
  }
  if (/\.(otf|ttf|woff2?)$/u.test(name)) {
    return "Font";
  }
  if (/\.(png|jpe?g|webp|gif)$/u.test(name)) {
    return "Image";
  }
  if (/\.(mp4|mov|m4v|webm)$/u.test(name)) {
    return "Video";
  }
  return "File";
}

function getNameFromWebsite(website: string) {
  const cleaned = website
    .trim()
    .replace(/^https?:\/\//iu, "")
    .replace(/^www\./iu, "")
    .split(/[./]/u)[0] ?? "";
  return cleaned ? capitalise(cleaned.replace(/[-_]/gu, " ")) : "";
}

function formatFileSize(bytes: number) {
  if (bytes < 1024 * 1024) {
    return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  }
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function capitalise(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}
