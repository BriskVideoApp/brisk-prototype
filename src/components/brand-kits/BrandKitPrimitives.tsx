"use client";

import Image from "next/image";
import Link from "next/link";
import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
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
import {
  ActionMenu,
  UploadProgress,
  type BrandMenuItem,
} from "./AssetManagement";

export function BrandTile({
  action,
  children,
  className = "",
  disabled = false,
  dropOverlayLabel,
  id,
  onDropFiles,
  progress,
  title,
}: {
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  disabled?: boolean;
  dropOverlayLabel?: string;
  id?: string;
  onDropFiles?: (files: File[]) => void;
  progress?: number;
  title: string;
}) {
  const [isDragging, setIsDragging] = useState(false);

  return (
    <div
      aria-disabled={disabled || undefined}
      className={`brand-tile-slot ${className} ${disabled ? "is-disabled" : ""}`}
      inert={disabled || undefined}
    >
      <article
        className={`brand-tile ${className} ${isDragging ? "is-dragging" : ""}`}
        id={id}
        onDragEnter={onDropFiles ? (event) => {
          event.preventDefault();
          setIsDragging(true);
        } : undefined}
        onDragOver={onDropFiles ? (event) => event.preventDefault() : undefined}
        onDragLeave={onDropFiles ? (event) => {
          if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setIsDragging(false);
        } : undefined}
        onDrop={onDropFiles ? (event) => {
          event.preventDefault();
          setIsDragging(false);
          const files = Array.from(event.dataTransfer.files);
          if (files.length > 0) onDropFiles(files);
        } : undefined}
      >
        {isDragging && dropOverlayLabel ? (
          <div className="brand-tile-drop-overlay" aria-hidden="true">
            <DsIcon name="upload-simple" size={32} />
            <span className="headings-xs-bold">{dropOverlayLabel}</span>
          </div>
        ) : null}
        <header className="brand-tile-header">
          <div>
            <h2 className="headings-2xs-bold">{title}</h2>
          </div>
          {!disabled && action ? (
            <div className="brand-tile-action">{action}</div>
          ) : null}
        </header>
        {typeof progress === "number" ? <UploadProgress label={title} value={progress} /> : null}
        <div className="brand-tile-body">{children}</div>
      </article>
    </div>
  );
}

export function HeroTile({
  action,
  children,
  dropOverlayLabel,
  isClientView = false,
  onDropFiles,
  progress,
  title = "Brand Kit",
}: {
  action?: ReactNode;
  children: ReactNode;
  dropOverlayLabel?: string;
  isClientView?: boolean;
  onDropFiles?: (files: File[]) => void;
  progress?: number;
  title?: string;
}) {
  return (
    <BrandTile
      action={action}
      className={`brand-hero-tile ${isClientView ? "is-client-view" : ""}`}
      dropOverlayLabel={dropOverlayLabel}
      onDropFiles={onDropFiles}
      progress={progress}
      title={title}
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

const emptyTileIllustrations = {
  colours: "/brisk-visuals/brand-kit-colours-empty-state-purple-shadow.png",
  fonts: "/brisk-visuals/brand-kit-fonts-empty-state-purple-shadow.png",
  guidelines: "/brisk-visuals/brand-kit-guidelines-empty-state-purple-shadow.png",
  imagery: "/brisk-visuals/brand-kit-imagery-empty-state-purple-shadow.png",
  logos: "/brisk-visuals/brand-kit-logos-empty-state-purple-shadow.png",
  motion: "/brisk-visuals/brand-kit-empty-state-purple-shadow.png",
  "sub-brands": "/brisk-visuals/brand-kit-sub-brands-empty-state-purple-shadow.png",
  voice: "/brisk-visuals/brand-kit-voice-empty-state-purple-shadow.png",
} as const;

type EmptyTileVisual = "default" | keyof typeof emptyTileIllustrations;

export function EmptyTile({
  action,
  copy,
  icon,
  note,
  secondaryAction,
  title,
  visual = "default",
}: {
  action?:
    | { label: string; onClick: () => void; onFiles?: never; accept?: never; multiple?: never }
    | { label: string; onFiles: (files: File[]) => void; accept: string; multiple?: boolean; onClick?: never };
  copy: string;
  icon: DsIconName;
  note?: string;
  secondaryAction?: { label: string; onClick: () => void };
  title?: string;
  visual?: EmptyTileVisual;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const isUploadAction = Boolean(action && "onFiles" in action);
  const illustrationSrc = visual === "default" ? null : emptyTileIllustrations[visual];

  const handleFiles = (files: FileList | null) => {
    if (!action || typeof action.onFiles !== "function" || !files?.length) return;
    action.onFiles(Array.from(files));
    if (inputRef.current) inputRef.current.value = "";
  };

  return (
    <div className="brand-empty-tile">
      <span className={`brand-empty-visual is-${visual}`} aria-hidden="true">
        {illustrationSrc ? (
          <Image
            alt=""
            className={`brand-empty-illustration is-${visual}`}
            height={512}
            src={illustrationSrc}
            width={512}
          />
        ) : null}
        {visual === "default" ? <DsIcon name={icon} size={32} /> : null}
      </span>
      {title ? <strong className="label-m-semibold">{title}</strong> : null}
      <p className="paragraph-s">{copy}</p>
      {action ? (
        <Button
          size="S"
          onClick={() => {
            if (isUploadAction) {
              inputRef.current?.click();
            } else if (typeof action.onClick === "function") {
              action.onClick();
            }
          }}
        >
          {action.label}
        </Button>
      ) : null}
      {secondaryAction ? (
        <button
          className="brand-text-button brand-empty-secondary-action label-s-semibold"
          type="button"
          onClick={secondaryAction.onClick}
        >
          {secondaryAction.label}
        </button>
      ) : null}
      {note ? <p className="brand-empty-note paragraph-s">{note}</p> : null}
      {action && isUploadAction ? (
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
  editorOpen,
  editable,
  onChange,
  onCopy,
  onDelete,
  onEditorClose,
  onEditorOpen,
  onSetPrimary,
}: {
  colour: BrandColour;
  editorOpen?: boolean;
  editable: boolean;
  onChange: (nextColour: BrandColour) => void;
  onCopy: (hex: string) => void;
  onDelete?: () => void;
  onEditorClose?: () => void;
  onEditorOpen?: () => void;
  onSetPrimary?: () => void;
}) {
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [hexDraft, setHexDraft] = useState(colour.hex.toUpperCase());
  const pickerAnchorRef = useRef<HTMLDivElement>(null);
  const pickerColour = normalisePickerColour(colour.hex);
  const hsv = hexToHsv(pickerColour);
  const pickerIsVisible = editable && (editorOpen ?? isPickerOpen);
  const swatchForeground = getColourForeground(colour.hex);
  const colourMenuItems: BrandMenuItem[] = [
    {
      label: "Edit",
      icon: "pencil-simple-ds",
      onSelect: () => {
        setIsPickerOpen(true);
        onEditorOpen?.();
      },
    },
    {
      label: "Copy HEX",
      icon: "copy",
      onSelect: () => onCopy(colour.hex),
    },
  ];

  if (onSetPrimary) {
    colourMenuItems.push({
      label: "Set as primary",
      icon: "bookmark",
      onSelect: onSetPrimary,
    });
  }

  if (onDelete) {
    colourMenuItems.push({
      label: "Delete",
      destructive: true,
      onSelect: onDelete,
    });
  }

  useEffect(() => {
    setHexDraft(colour.hex.toUpperCase());
  }, [colour.hex]);

  useEffect(() => {
    if (!pickerIsVisible) return;
    const closeOutside = (event: PointerEvent) => {
      if (pickerAnchorRef.current?.contains(event.target as Node)) return;
      setIsPickerOpen(false);
      onEditorClose?.();
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setIsPickerOpen(false);
      onEditorClose?.();
    };
    document.addEventListener("pointerdown", closeOutside);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOutside);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [onEditorClose, pickerIsVisible]);

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
      <div
        className="colour-picker-anchor"
        ref={pickerAnchorRef}
        style={{ "--colour-swatch-foreground": swatchForeground } as CSSProperties}
      >
        <button
          className="colour-swatch-copy"
          type="button"
          aria-label={`Copy ${colour.name ?? colour.hex} ${colour.hex}`}
          onClick={() => onCopy(colour.hex)}
        >
          <span className="colour-swatch-colour" style={{ backgroundColor: colour.hex }} />
          <span className="colour-swatch-hex label-xs-semibold">{colour.hex}</span>
        </button>
        {editable ? (
          <span className="colour-swatch-hover-actions">
            <ActionMenu
              items={colourMenuItems}
              label={`Actions for ${colour.name ?? colour.hex}`}
            />
          </span>
        ) : null}
        {pickerIsVisible ? (
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
              <Button size="S" variant="secondary" onClick={() => {
                setIsPickerOpen(false);
                onEditorClose?.();
              }}>Done</Button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

export function FontPreview({
  actions,
  font,
}: {
  actions?: ReactNode;
  font: BrandFont;
}) {
  const normalisedRole = font.role.toLowerCase();
  const sample = normalisedRole === "heading"
    ? "Clear ideas, beautifully told"
    : normalisedRole === "mono"
      ? "Aa Bb Cc 0123456789"
      : "The quick brown fox…";

  return (
    <div className="font-preview">
      <span className="font-preview-role label-xs-semibold">{capitalise(font.role)}</span>
      <div className="font-preview-control-row">
        <strong className="font-preview-family" style={{ fontFamily: font.family }}>
          {font.family}
        </strong>
        {actions}
      </div>
      <span
        className={`font-preview-sample ${normalisedRole === "heading" ? "headings-xs-bold" : "paragraph-s"}`}
        style={{ fontFamily: font.family }}
      >
        {sample}
      </span>
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
  href,
  subBrand,
}: {
  customerSlug: string;
  href?: string;
  subBrand: Pick<SubBrand, "lastUpdated" | "logoUrl" | "name" | "relationship" | "slug">;
}) {
  return (
    <Link
      className="sub-brand-card"
      href={href ?? `/brand-kits/${customerSlug}/${subBrand.slug}${subBrand.relationship === "master" ? "?relationship=master" : ""}`}
    >
      <span className="sub-brand-logo">
        {subBrand.logoUrl ? (
          <img src={subBrand.logoUrl} alt="" />
        ) : (
          <span className="brand-logo-initials label-xs-semibold">{getBrandInitials(subBrand.name)}</span>
        )}
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

function getBrandInitials(name: string) {
  return name
    .split(/\s+/u)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word.charAt(0).toUpperCase())
    .join("");
}

export type DetectedUpload = {
  file: File;
  kind: "Logo" | "Guidelines" | "Font" | "Image" | "Video" | "Archive" | "File";
};

export function UploadZone({
  files,
  onFilesChange,
  showFileList = true,
  uploadKind = "all",
}: {
  files: DetectedUpload[];
  onFilesChange: (files: DetectedUpload[]) => void;
  showFileList?: boolean;
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
            : "Upload whatever you have: brand guidelines, logos, fonts, imagery, videos and source files."}
        </p>
        <Button size="S" variant="secondary" onClick={() => inputRef.current?.click()}>
          {uploadKind === "guidelines" ? "Browse" : "Browse files"}
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
      {showFileList && files.length > 0 ? (
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
  initialFiles = [],
  brandRelationship,
  isCustomerView = false,
  onClose,
  onComplete,
  onProcessingStart,
}: {
  customerName: string;
  initialMode?: SetupMode;
  initialFiles?: File[];
  brandRelationship?: BrandRelationship;
  isCustomerView?: boolean;
  onClose: () => void;
  onComplete: (profile: BrandProfile, source: SetupSource, name?: string) => void;
  onProcessingStart?: () => void;
}) {
  const [mode, setMode] = useState<SetupMode>(initialMode);
  const [website, setWebsite] = useState("");
  const [subBrandName, setSubBrandName] = useState("");
  const [files, setFiles] = useState<DetectedUpload[]>(() =>
    initialFiles.map((file) => ({ file, kind: detectFileKind(file) })),
  );
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async () => {
    if (isLoading || (mode === "quick" && !website.trim() && files.length === 0) || (mode === "deep" && files.length === 0)) {
      return;
    }

    setIsLoading(true);
    onProcessingStart?.();
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
              {brandRelationship ? "Add a brand" : "Build Brand Kit"}
            </h2>
            {brandRelationship ? (
              <p className="paragraph-s">
                {mode === "quick"
                  ? `Start with ${isCustomerView ? "your" : "their"} website, brand guidelines, or both.`
                  : "Build the kit from the files you already have."}
              </p>
            ) : null}
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
          ) : mode === "quick" && !brandRelationship ? (
            <div className="brand-setup-form">
              <UploadZone files={files} onFilesChange={setFiles} />
              <Input
                label={isCustomerView ? "Or add your website" : "Or add their website"}
                value={website}
                onChange={(event) => setWebsite(event.target.value)}
                placeholder={isCustomerView ? "yourcompany.com" : "theircompany.com"}
                size="M"
              />
              <Button onClick={handleSubmit}>Build Brand Kit</Button>
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

function getColourForeground(value: string) {
  const hex = normalisePickerColour(value);
  const red = Number.parseInt(hex.slice(1, 3), 16);
  const green = Number.parseInt(hex.slice(3, 5), 16);
  const blue = Number.parseInt(hex.slice(5, 7), 16);
  const perceivedLightness = ((red * 299) + (green * 587) + (blue * 114)) / 1000;
  return perceivedLightness > 154
    ? "var(--brisk-text-primary)"
    : "var(--brisk-text-white)";
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
  if (/\.zip$/u.test(name)) {
    return "Archive";
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
