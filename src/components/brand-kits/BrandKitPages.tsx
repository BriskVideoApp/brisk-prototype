"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState, type CSSProperties } from "react";
import { useRouter } from "next/navigation";
import { Button } from "../../../Brisk DS/src/app/components/Button";
import { WorkspaceSidebar } from "@/components/navigation/WorkspaceSidebar";
import {
  prototypeCustomerSlug,
  usePrototypeRole,
} from "@/components/navigation/PrototypeRoleContext";
import { DsIcon } from "@/components/video-review/DsIcon";
import {
  brandKitCustomers,
  createManualBrandProfile,
  makeGuidelineFiles,
  mockAudioAsset,
  type BrandColour,
  type BrandGuidelineFile,
  type BrandImagery,
  type BrandKitCustomer,
  type BrandLogo,
  type BrandProfile,
  type BrandRelationship,
  type EditorFile,
  type EditorFileVersion,
  type SubBrand,
} from "@/data/brand-kits";
import { getBrandFromSources } from "@/lib/brand-profile-adapter";
import {
  BrandKitProvider,
  useBrandKit,
  type SetupMode,
  type SetupSource,
} from "./BrandKitContext";
import {
  BrandTile,
  ColourSwatch,
  EmptyTile,
  FontPreview,
  HeroTile,
  LogoVariant,
  SetupModal,
  SubBrandCard,
} from "./BrandKitPrimitives";
import {
  ActionMenu,
  AddFontDialog,
  AssetActions,
  DeleteConfirmation,
  ManagedAsset,
  RenameAssetDialog,
  TileHeaderActions,
  type BrandMenuItem,
} from "./AssetManagement";

type SetupModalState =
  | { kind: "customer"; mode: SetupMode }
  | { kind: "new-brand"; mode: SetupMode; relationship: BrandRelationship }
  | null;

type TargetedUploadKind =
  | "motion"
  | "logos"
  | "fonts"
  | "photo"
  | "broll"
  | "illustration"
  | "audio"
  | "guidelines";

type SelectedAssetKind = "logo" | "imagery" | "font" | "sub-brand" | "editor-file";

type SelectedAsset = {
  id: string;
  kind: SelectedAssetKind;
  label: string;
};

type PendingDelete = {
  label: string;
  confirmName?: string;
  remove: () => void;
  restore: () => void;
};

type BrandToast = {
  message: string;
  actionLabel?: string;
  onAction?: () => void;
};

type RenameRequest = {
  initialName: string;
  save: (name: string) => void;
};

type BrandKitSetupStage = "empty" | "manual" | "reading" | "sorting" | "building" | "complete";

const uploadAccept: Record<TargetedUploadKind, string> = {
  motion: ".aep,.mogrt,.zip,.otf,.ttf,.mp4,.mov,.m4v,.webm",
  logos: ".svg,.png",
  fonts: ".otf,.ttf,.woff,.woff2,.zip",
  photo: ".png,.jpg,.jpeg,.webp",
  broll: ".mp4,.mov,.m4v,.webm",
  illustration: ".svg,.png,.jpg,.jpeg,.webp",
  audio: ".mp3,.wav,.m4a,.aac,.ogg",
  guidelines: ".pdf,application/pdf",
};

const imageryUploadLabels: Record<BrandImagery["kind"], string> = {
  photo: "Upload photos",
  broll: "Upload footage",
  illustration: "Upload icons and graphics",
  audio: "Upload audio",
};

const imageryEmptyCopy: Record<BrandImagery["kind"], string> = {
  photo: "No photo assets yet.",
  broll: "No footage assets yet.",
  illustration: "No icons or graphics yet.",
  audio: "No audio assets yet.",
};

function detectTargetedUploadKind(file: File, fallback: TargetedUploadKind): TargetedUploadKind {
  const name = file.name.toLowerCase();
  if (/\.(otf|ttf|woff2?)$/u.test(name)) return "fonts";
  if (/\.pdf$/u.test(name) || /guideline|brandbook/u.test(name)) return "guidelines";
  if (/\.(aep|mogrt|zip)$/u.test(name)) return "motion";
  if (/\.(aac|m4a|mp3|ogg|wav)$/u.test(name)) return "audio";
  if (/\.(mp4|mov|m4v|webm)$/u.test(name)) return fallback === "motion" ? "motion" : "broll";
  if (/logo/u.test(name) || (/\.svg$/u.test(name) && fallback !== "illustration")) return "logos";
  if (/illustration|graphic|artwork/u.test(name)) return "illustration";
  if (/\.(png|jpe?g|webp|gif|svg)$/u.test(name)) {
    if (fallback === "logos") return "logos";
    return fallback === "illustration" ? "illustration" : "photo";
  }
  return fallback;
}

function targetedUploadTileLabel(kind: TargetedUploadKind) {
  if (["photo", "broll", "illustration", "audio"].includes(kind)) return "Visual Assets";
  if (kind === "logos") return "Logos";
  if (kind === "fonts") return "Fonts";
  if (kind === "guidelines") return "Brand Guidelines";
  return "Brand Kit";
}

function formatUploadedFileSize(bytes: number) {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function InlineSetupFilePreview({ file }: { file: File }) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const lowerName = file.name.toLowerCase();
  const isImage = file.type.startsWith("image/") || /\.(gif|jpe?g|png|svg|webp)$/u.test(lowerName);

  useEffect(() => {
    if (!isImage) return;
    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [file, isImage]);

  if (previewUrl) {
    return <Image alt="" className="brand-hero-file-thumbnail" height={24} src={previewUrl} unoptimized width={24} />;
  }

  const iconName = file.type.startsWith("video/") || /\.(m4v|mov|mp4|webm)$/u.test(lowerName)
    ? "file-video"
    : file.type.startsWith("audio/") || /\.(aac|m4a|mp3|wav)$/u.test(lowerName)
      ? "file-audio"
      : isImage
        ? "image-square"
        : /\.(otf|ttf|woff2?)$/u.test(lowerName)
          ? "text-aa"
          : "file-text";

  return (
    <span className="brand-hero-file-icon">
      <DsIcon name={iconName} size={16} />
    </span>
  );
}

function getWebsiteHref(website: string) {
  const trimmedWebsite = website.trim();
  return /^https?:\/\//iu.test(trimmedWebsite)
    ? trimmedWebsite
    : `https://${trimmedWebsite}`;
}

function getGuidelineFiles(profile: BrandProfile | null, titleName: string): BrandGuidelineFile[] {
  if (profile?.guidelines.files?.length) return profile.guidelines.files;
  if (!profile?.guidelines.pdfUrl) {
    if (!profile?.guidelines.aiSummary) return [];
    const prefix = titleName.toLowerCase().replace(/[^a-z0-9]+/gu, "-").replace(/^-|-$/gu, "");
    return makeGuidelineFiles(prefix || "brand", titleName);
  }

  return [{
    id: "legacy-brand-guidelines",
    name: `${titleName}-brand-guidelines.pdf`,
    size: "2.4 MB",
    url: profile.guidelines.pdfUrl,
  }];
}

function getProfileColour(profile: BrandProfile | null, role: BrandProfile["colours"][number]["role"]) {
  const matches = profile?.colours.filter((colour) => colour.role === role) ?? [];
  if (role !== "secondary" || matches.length < 2) return matches[0]?.hex;

  return [...matches].sort((left, right) => getHexLightness(left.hex) - getHexLightness(right.hex))[0]?.hex;
}

function getHexLightness(hex: string) {
  const normalised = hex.replace("#", "");
  if (!/^[0-9a-f]{6}$/iu.test(normalised)) return 255;
  const red = Number.parseInt(normalised.slice(0, 2), 16);
  const green = Number.parseInt(normalised.slice(2, 4), 16);
  const blue = Number.parseInt(normalised.slice(4, 6), 16);
  return ((red * 299) + (green * 587) + (blue * 114)) / 1000;
}

function parseHexColour(hex: string) {
  const normalised = hex.replace("#", "");
  if (!/^[0-9a-f]{6}$/iu.test(normalised)) return null;
  return [
    Number.parseInt(normalised.slice(0, 2), 16),
    Number.parseInt(normalised.slice(2, 4), 16),
    Number.parseInt(normalised.slice(4, 6), 16),
  ] as const;
}

function mixHexColour(foreground: string, background: string, foregroundWeight: number) {
  const foregroundChannels = parseHexColour(foreground);
  const backgroundChannels = parseHexColour(background);
  if (!foregroundChannels || !backgroundChannels) return null;
  const channels = foregroundChannels.map((channel, index) => Math.round(
    channel * foregroundWeight + backgroundChannels[index] * (1 - foregroundWeight),
  ));
  return `#${channels.map((channel) => channel.toString(16).padStart(2, "0")).join("")}`;
}

function relativeLuminance(hex: string) {
  const channels = parseHexColour(hex);
  if (!channels) return null;
  const linear = channels.map((channel) => {
    const value = channel / 255;
    return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  });
  return linear[0] * 0.2126 + linear[1] * 0.7152 + linear[2] * 0.0722;
}

function hasAaContrast(foreground: string, background: string) {
  const foregroundLuminance = relativeLuminance(foreground);
  const backgroundLuminance = relativeLuminance(background);
  if (foregroundLuminance === null || backgroundLuminance === null) return false;
  const lighter = Math.max(foregroundLuminance, backgroundLuminance);
  const darker = Math.min(foregroundLuminance, backgroundLuminance);
  return (lighter + 0.05) / (darker + 0.05) >= 4.5;
}

function getFontRoleColour(profile: BrandProfile | null) {
  const primary = getProfileColour(profile, "primary");
  if (!primary) return null;
  const derived = mixHexColour(primary, "#000000", 0.68);
  const tileBackground = mixHexColour(
    getProfileColour(profile, "secondary") ?? "#FFFFFF",
    "#FFFFFF",
    0.14,
  );
  return derived && tileBackground && hasAaContrast(derived, tileBackground) ? derived : null;
}

function profileHasMotionPackage(profile: BrandProfile | null) {
  return Boolean(profile?.logos.length && profile.imagery.length);
}

function profileHasColours(profile: BrandProfile | null) {
  return Boolean(profile?.colours.some((colour) => colour.hex.toUpperCase() !== "#FFFFFF"));
}

function profileHasFonts(profile: BrandProfile | null) {
  return Boolean(profile?.fonts.some((font) => font.family.trim().length > 0));
}

function profileHasVoice(profile: BrandProfile | null) {
  return Boolean(profile && (profile.voice.summary.trim() || profile.voice.tags.length));
}

function profileHasBrandContent(profile: BrandProfile | null) {
  return Boolean(profile && (
    profile.logos.length
    || profileHasColours(profile)
    || profileHasFonts(profile)
    || profile.imagery.length
    || profileHasVoice(profile)
    || profile.guidelines.pdfUrl
    || profile.guidelines.aiSummary
  ));
}

function BrandKitSetupProgress({ stage }: { stage: Extract<BrandKitSetupStage, "reading" | "sorting" | "building"> }) {
  const steps = [
    { id: "reading", label: "Reading brand files" },
    { id: "sorting", label: "Sorting assets" },
    { id: "building", label: "Building Brand Kit" },
  ] as const;
  const currentIndex = steps.findIndex((step) => step.id === stage);

  return (
    <div className="brand-kit-setup-progress" role="status" aria-live="polite">
      <Image
        alt=""
        className="brand-empty-illustration is-motion"
        height={512}
        src="/brisk-visuals/brand-kit-empty-state-purple-shadow.png"
        width={512}
      />
      <ol>
        {steps.map((step, index) => (
          <li
            className={`${index < currentIndex ? "is-complete" : ""}${index === currentIndex ? " is-active" : ""}`.trim()}
            key={step.id}
            aria-current={index === currentIndex ? "step" : undefined}
          >
            <span aria-hidden="true" />
            {step.label}
          </li>
        ))}
      </ol>
    </div>
  );
}

function getBrandTintVariables(profile: BrandProfile | null) {
  const primary = getProfileColour(profile, "primary");
  const fontRoleColour = getFontRoleColour(profile);

  return {
    "--brand-tint-primary": primary ?? "var(--brisk-white)",
    "--brand-tint-secondary": getProfileColour(profile, "secondary") ?? "var(--brisk-white)",
    "--brand-tint-accent": getProfileColour(profile, "accent") ?? "var(--brisk-white)",
    ...(fontRoleColour ? { "--brand-font-role-colour": fontRoleColour } : {}),
  } as CSSProperties;
}

export function BrandKitsLandingPage() {
  const router = useRouter();
  const { hasLoadedRole, selectedRole } = usePrototypeRole();
  const [query, setQuery] = useState("");
  const isStudioView = hasLoadedRole && selectedRole !== "Customer";
  const filteredCustomers = brandKitCustomers.filter((customer) =>
    `${customer.name} ${customer.website}`.toLowerCase().includes(query.trim().toLowerCase()),
  );

  useEffect(() => {
    if (hasLoadedRole && selectedRole === "Customer") {
      router.replace(`/brand-kits/${prototypeCustomerSlug}`);
    }
  }, [hasLoadedRole, router, selectedRole]);

  if (!isStudioView) {
    return <BrandKitPermissionTransition />;
  }

  return (
    <main className="brand-kits-shell">
      <WorkspaceSidebar activeItem="brandKits" />
      <div className="brand-kits-main">
        <header className="brand-kits-page-header">
          <div className="brand-kits-title">
            <h1>Brand Kits</h1>
            <p className="paragraph-s">One kit per customer.</p>
          </div>
          <label className="brand-kits-search" htmlFor="brand-kits-search">
            <DsIcon name="search" size={16} />
            <span className="sr-only">Search Brand Kits</span>
            <input
              id="brand-kits-search"
              type="search"
              value={query}
              placeholder="Search customers..."
              onChange={(event) => setQuery(event.target.value)}
            />
          </label>
        </header>
        <section className="brand-kits-page-content" aria-label="Customer Brand Kits">
          <CustomerGrid customers={filteredCustomers} />
        </section>
      </div>
    </main>
  );
}

export function CustomerGrid({ customers }: { customers: BrandKitCustomer[] }) {
  return (
    <div className="customer-grid">
      {customers.map((customer) => {
        const primaryColour = getProfileColour(customer.profile, "primary");
        const headingFont = customer.profile?.fonts.find((font) => font.role === "heading");

        return (
          <Link
            className="customer-brand-card"
            href={`/brand-kits/${customer.slug}`}
            key={customer.slug}
            style={getBrandTintVariables(customer.profile)}
          >
            <div className="customer-brand-mini-bento" aria-hidden="true">
              <div className="customer-brand-card-mark">
                <img src={customer.logoUrl} alt="" />
              </div>
              <span
                className="customer-brand-mini-colour"
                style={{ background: primaryColour ?? "var(--brisk-item-tertiary)" }}
              />
              <span className="customer-brand-mini-font">
                <strong style={{ fontFamily: headingFont?.family }}>{headingFont ? "Aa" : "+"}</strong>
                <small className="label-xs-semibold">{headingFont?.family ?? "Set up"}</small>
              </span>
            </div>
            <div className="customer-brand-card-copy">
              <span>
                <strong className="headings-2xs-bold">{customer.name}</strong>
                <small className="label-xs">{customer.website}</small>
              </span>
              <span className={`brand-kit-status label-xs-semibold ${customer.profile ? "is-ready" : "is-empty"}`}>
                {customer.profile ? "Brand Kit ready" : "Set up needed"}
              </span>
            </div>
            <footer>
              <span className="label-xs">Last updated</span>
              <strong className="label-xs-semibold">{customer.lastUpdated}</strong>
              <DsIcon name="caret-right" size={16} />
            </footer>
          </Link>
        );
      })}
    </div>
  );
}

export function BrandKitPage({
  customer,
  isGuest = false,
  subBrand,
}: {
  customer: BrandKitCustomer;
  isGuest?: boolean;
  subBrand?: SubBrand;
}) {
  return (
    <BrandKitProvider
      customer={customer}
      initialProfile={subBrand?.profile}
      initialSubBrands={subBrand && !customer.subBrands.some((candidate) => candidate.slug === subBrand.slug)
        ? [...customer.subBrands, subBrand]
        : customer.subBrands}
      isGuest={isGuest}
    >
      <BrandKitSurface subBrand={subBrand} />
    </BrandKitProvider>
  );
}

function BrandKitSurface({ subBrand }: { subBrand?: SubBrand }) {
  const {
    addBrand,
    banner,
    canEdit,
    completeSetup,
    customer,
    hasLoadedRole,
    isGuest,
    profile,
    role,
    subBrands,
    updateSection,
    updateSubBrands,
  } = useBrandKit();
  const router = useRouter();
  const [setupModal, setSetupModal] = useState<SetupModalState>(null);
  const [setupInitialFiles, setSetupInitialFiles] = useState<File[]>([]);
  const [inlineSetupFiles, setInlineSetupFiles] = useState<File[]>([]);
  const [inlineSetupWebsite, setInlineSetupWebsite] = useState("");
  const [inlineSetupWebsiteDraft, setInlineSetupWebsiteDraft] = useState("");
  const [inlineSetupWebsiteAdded, setInlineSetupWebsiteAdded] = useState(false);
  const [editingInlineSetupWebsite, setEditingInlineSetupWebsite] = useState(false);
  const [showInlineSetupWebsite, setShowInlineSetupWebsite] = useState(false);
  const [selectedLogo, setSelectedLogo] = useState<BrandLogo | null>(null);
  const [selectedImagery, setSelectedImagery] = useState<BrandImagery | null>(null);
  const [imageryFilter, setImageryFilter] = useState<BrandImagery["kind"]>("photo");
  const [editingColourIndex, setEditingColourIndex] = useState<number | null>(null);
  const [fontModalOpen, setFontModalOpen] = useState(false);
  const [voiceModalOpen, setVoiceModalOpen] = useState(false);
  const [isAddingTone, setIsAddingTone] = useState(false);
  const [toneDraft, setToneDraft] = useState("");
  const [selectedGuidelineId, setSelectedGuidelineId] = useState<string | null>(null);
  const [guidelineModalOpen, setGuidelineModalOpen] = useState(false);
  const [selectedVersionId, setSelectedVersionId] = useState<EditorFileVersion["id"]>("v3");
  const [showAllSubBrands, setShowAllSubBrands] = useState(false);
  const [visibleBanner, setVisibleBanner] = useState<string | null>(null);
  const [toast, setToast] = useState<BrandToast | null>(null);
  const [selectedAssets, setSelectedAssets] = useState<SelectedAsset[]>([]);
  const [pendingDelete, setPendingDelete] = useState<PendingDelete | null>(null);
  const [renameRequest, setRenameRequest] = useState<RenameRequest | null>(null);
  const [uploadProgress, setUploadProgress] = useState<{ kind: TargetedUploadKind; value: number } | null>(null);
  const [hasMotionPackage, setHasMotionPackage] = useState(() => profileHasMotionPackage(profile));
  const [setupStage, setSetupStage] = useState<BrandKitSetupStage>(() =>
    profileHasBrandContent(profile) ? "complete" : "empty",
  );
  const [editorVersions, setEditorVersions] = useState<EditorFileVersion[]>(() =>
    customer.editorFileVersions.map((version) => ({ ...version, files: [...version.files] })),
  );
  const toastTimerRef = useRef<number | null>(null);
  const setupStageTimersRef = useRef<number[]>([]);
  const inlineSetupFileInputRef = useRef<HTMLInputElement>(null);
  const [currentRelationship, setCurrentRelationship] = useState<BrandRelationship>(
    subBrand?.relationship ?? "master",
  );
  const titleName = subBrand?.name ?? customer.name;
  const guidelineFiles = getGuidelineFiles(profile, titleName);
  const selectedGuideline = guidelineFiles.find((file) => file.id === selectedGuidelineId)
    ?? guidelineFiles[0];
  const activeVersion =
    editorVersions.find((version) => version.id === selectedVersionId)
    ?? editorVersions[0];
  const visibleSubBrands = showAllSubBrands ? subBrands : subBrands.slice(0, 3);
  const brandColours = profile?.colours ?? [];
  const filteredImagery = profile?.imagery.filter((image) => image.kind === imageryFilter) ?? [];
  const visibleImagery = imageryFilter === "audio" && filteredImagery.length === 0
    ? [mockAudioAsset]
    : filteredImagery;
  const canViewCustomer = isGuest || role !== "client" || customer.slug === prototypeCustomerSlug;
  const canManageBrands = !isGuest && (canEdit || role === "client");
  const canManageMotion = canEdit && role !== "client";
  const hasMasterBrand = Boolean(customer.profile)
    || (!subBrand && Boolean(profile))
    || subBrand?.relationship === "master"
    || subBrands.some((brand) => brand.relationship === "master");
  const newBrandRelationship: BrandRelationship = hasMasterBrand ? "sub-brand" : "master";

  useEffect(() => {
    if (hasLoadedRole && !canViewCustomer) {
      router.replace(`/brand-kits/${prototypeCustomerSlug}`);
    }
  }, [canViewCustomer, hasLoadedRole, router]);

  useEffect(() => {
    if (subBrand) setCurrentRelationship(subBrand.relationship);
  }, [subBrand]);

  useEffect(() => {
    if (!banner) {
      setVisibleBanner(null);
      return;
    }

    const bannerSeenKey = `brisk-brand-kit-success-seen:${customer.slug}:${subBrand?.slug ?? "master"}`;
    if (window.localStorage.getItem(bannerSeenKey)) {
      setVisibleBanner(null);
      return;
    }

    setVisibleBanner(banner);
    window.localStorage.setItem(bannerSeenKey, "true");
  }, [banner, customer.slug, subBrand?.slug]);

  useEffect(() => () => {
    if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
    setupStageTimersRef.current.forEach((timer) => window.clearTimeout(timer));
  }, []);

  const isSetupProcessing = setupStage === "reading"
    || setupStage === "sorting"
    || setupStage === "building";
  const tilesEnabled = setupStage === "manual" || setupStage === "complete";

  const beginAutomatedSetup = () => {
    setupStageTimersRef.current.forEach((timer) => window.clearTimeout(timer));
    setSetupStage("reading");
    setupStageTimersRef.current = [
      window.setTimeout(() => setSetupStage("sorting"), 800),
      window.setTimeout(() => setSetupStage("building"), 1600),
    ];
  };

  const addInlineSetupFiles = (files: File[]) => {
    if (files.length === 0) return;
    setInlineSetupFiles((current) => [...current, ...files]);
  };

  const buildInlineBrandKit = async () => {
    if (inlineSetupFiles.length === 0 && !inlineSetupWebsite.trim()) return;

    beginAutomatedSetup();
    const nextProfile = await getBrandFromSources(inlineSetupWebsite, inlineSetupFiles);
    const source: SetupSource = inlineSetupFiles.length > 0 ? "deep" : "quick";
    completeSetup(nextProfile, source);
    setHasMotionPackage(profileHasMotionPackage(nextProfile));
    setupStageTimersRef.current.forEach((timer) => window.clearTimeout(timer));
    setupStageTimersRef.current = [];
    setSetupStage("complete");
    setInlineSetupFiles([]);
    setInlineSetupWebsite("");
    setInlineSetupWebsiteDraft("");
    setInlineSetupWebsiteAdded(false);
    setEditingInlineSetupWebsite(false);
    setShowInlineSetupWebsite(false);
    notify("Brand Kit ready to edit");
  };

  const notify = (message: string, actionLabel?: string, onAction?: () => void) => {
    if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
    setToast({ message, actionLabel, onAction });
    toastTimerRef.current = window.setTimeout(() => setToast(null), 2200);
  };

  const notifyUndo = (label: string, restore: () => void) => {
    if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
    setToast({
      message: `${label} deleted.`,
      actionLabel: "Undo",
      onAction: () => {
        if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
        restore();
        setToast(null);
      },
    });
    toastTimerRef.current = window.setTimeout(() => setToast(null), 10000);
  };

  const isSelected = (id: string) => selectedAssets.some((asset) => asset.id === id);
  const toggleSelected = (asset: SelectedAsset) => {
    setSelectedAssets((current) => current.some((candidate) => candidate.id === asset.id)
      ? current.filter((candidate) => candidate.id !== asset.id)
      : [...current, asset]);
  };

  const requestDelete = (request: PendingDelete) => setPendingDelete(request);

  const chooseFile = (accept: string, onFile: (file: File) => void) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = accept;
    input.onchange = () => {
      const file = input.files?.[0];
      if (file) onFile(file);
    };
    input.click();
  };

  const openNewBrandSetup = () => {
    const baseName = `${customer.name} Sub Brand`;
    const currentMatch = subBrand?.slug.match(
      new RegExp(`^${customer.slug}-sub-brand(?:-(\\d+))?$`, "u"),
    );
    let suffix = currentMatch ? Number(currentMatch[1] ?? 1) + 1 : 1;
    let nextName = suffix === 1 ? baseName : `${baseName} ${suffix}`;
    const existingNames = new Set(subBrands.map((brand) => brand.name.toLowerCase()));

    while (existingNames.has(nextName.toLowerCase())) {
      suffix += 1;
      nextName = `${baseName} ${suffix}`;
    }

    const nextBrand = addBrand(
      nextName,
      createManualBrandProfile(),
      newBrandRelationship,
    );
    const query = new URLSearchParams({ setup: "manual" });
    if (newBrandRelationship === "master") query.set("relationship", "master");
    router.push(`/brand-kits/${customer.slug}/${nextBrand.slug}?${query.toString()}`);
  };

  const copyText = async (value: string, message: string) => {
    try {
      await navigator.clipboard.writeText(value);
    } catch {
      const textArea = document.createElement("textarea");
      textArea.value = value;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand("copy");
      textArea.remove();
    }
    notify(message);
  };

  const beginAddingTone = () => {
    setToneDraft("");
    setIsAddingTone(true);
  };

  const saveTone = () => {
    const tone = toneDraft.trim();
    if (!tone || !profile) return;
    const existingTags = profile.voice.tags.filter((tag) => tag !== "New tone");
    const tags = existingTags.some((tag) => tag.toLowerCase() === tone.toLowerCase())
      ? existingTags
      : [...existingTags, tone];
    updateSection("voice", { ...profile.voice, tags });
    setToneDraft("");
    setIsAddingTone(false);
  };

  const completeModalSetup = (
    nextProfile: BrandProfile,
    source: SetupSource,
    subBrandName?: string,
  ) => {
    if (setupModal?.kind === "new-brand") {
      const nextBrand = addBrand(
        subBrandName ?? `${customer.name} brand`,
        nextProfile,
        setupModal.relationship,
      );
      setShowAllSubBrands(true);
      notify(`${nextBrand.name} added`);

      if (role === "client" || source === "manual") {
        const query = new URLSearchParams();
        if (setupModal.relationship === "master") query.set("relationship", "master");
        if (source === "manual") query.set("setup", "manual");
        const queryString = query.size > 0 ? `?${query.toString()}` : "";
        router.push(`/brand-kits/${customer.slug}/${nextBrand.slug}${queryString}`);
      }
    } else {
      completeSetup(nextProfile, source);
      setHasMotionPackage(profileHasMotionPackage(nextProfile));
      setupStageTimersRef.current.forEach((timer) => window.clearTimeout(timer));
      setupStageTimersRef.current = [];
      setSetupStage(source === "manual" ? "manual" : "complete");
      notify("Brand Kit ready to edit");
    }
    setSetupInitialFiles([]);
    setSetupModal(null);
  };

  const handleTargetedUpload = (kind: TargetedUploadKind, files: File[]) => {
    if (files.length === 0) return;

    setUploadProgress({ kind, value: 24 });
    window.setTimeout(() => setUploadProgress({ kind, value: 72 }), 180);
    window.setTimeout(() => setUploadProgress({ kind, value: 100 }), 420);
    window.setTimeout(() => setUploadProgress(null), 760);

    if (kind === "motion") {
      setHasMotionPackage(true);
      notify("Uploaded to Brand Kit.");
      return;
    }

    if (kind === "logos") {
      updateSection("logos", [...(profile?.logos ?? []), ...files.map((file, index) => ({
        id: `uploaded-logo-${Date.now()}-${index}`,
        label: file.name.replace(/\.[^.]+$/u, ""),
        variant: (["light", "dark", "mono"] as const)[index % 3],
        format: /\.svg$/iu.test(file.name) ? "svg" as const : "png" as const,
        url: URL.createObjectURL(file),
        layout: index === 2 ? "mark" as const : "horizontal" as const,
      }))]);
      notify("Uploaded to Logos.");
      return;
    }

    if (kind === "fonts") {
      const roles = ["heading", "body", "mono"] as const;
      const existingFonts = profile?.fonts ?? [];
      updateSection("fonts", roles.map((role, index) => {
        const file = files[index];
        return file
          ? {
              role,
              family: file.name.replace(/\.[^.]+$/u, ""),
              source: "custom" as const,
            }
          : existingFonts.find((font) => font.role === role) ?? {
              role,
              family: "",
              source: "custom" as const,
            };
      }));
      notify("Uploaded to Fonts.");
      return;
    }

    if (kind === "guidelines") {
      const uploadedGuidelines = files.map((file, index) => ({
        id: `uploaded-guidelines-${Date.now()}-${index}`,
        name: file.name,
        size: formatUploadedFileSize(file.size),
        url: URL.createObjectURL(file),
      }));
      const nextGuidelines = [...guidelineFiles, ...uploadedGuidelines];
      updateSection("guidelines", {
        ...profile?.guidelines,
        files: nextGuidelines,
        pdfUrl: nextGuidelines[0]?.url,
        aiSummary: profile?.guidelines.aiSummary
          ?? "Key brand guidance extracted from the uploaded PDFs.",
      });
      setSelectedGuidelineId(uploadedGuidelines[0]?.id ?? null);
      notify(`${files.length} ${files.length === 1 ? "file" : "files"} uploaded to Brand Guidelines.`);
      return;
    }

    const existingImagery = profile?.imagery.filter((image) => image.kind !== kind) ?? [];
    const uploadedImagery: BrandImagery[] = files.map((file, index) => ({
      id: `uploaded-${kind}-${Date.now()}-${index}`,
      label: kind === "audio" ? file.name : file.name.replace(/\.[^.]+$/u, ""),
      url: kind === "broll" ? customer.motionPreview.posterUrl : URL.createObjectURL(file),
      kind,
      format: kind === "audio" ? file.name.split(".").pop()?.toUpperCase() : undefined,
    }));
    updateSection("imagery", [...existingImagery, ...uploadedImagery]);
    notify("Uploaded to Visual Assets.");
  };

  const handleTileUpload = (target: TargetedUploadKind, files: File[]) => {
    const grouped = new Map<TargetedUploadKind, File[]>();
    files.forEach((file) => {
      const detected = detectTargetedUploadKind(file, target);
      grouped.set(detected, [...(grouped.get(detected) ?? []), file]);
    });
    grouped.forEach((groupFiles, detected) => {
      handleTargetedUpload(detected, groupFiles);
      if (detected !== target) {
        notify(`Moved ${groupFiles.length} ${groupFiles.length === 1 ? "file" : "files"} to ${targetedUploadTileLabel(detected)}.`);
      }
    });
  };

  const toggleBrandRelationship = () => {
    if (!subBrand) return;

    const nextRelationship: BrandRelationship = currentRelationship === "master"
      ? "sub-brand"
      : "master";
    setCurrentRelationship(nextRelationship);
    router.replace(
      `/brand-kits/${customer.slug}/${subBrand.slug}?relationship=${nextRelationship}`,
    );
    notify(nextRelationship === "master"
      ? `${subBrand.name} is now the master brand. The previous master is now a sub-brand.`
      : `${subBrand.name} is now a sub-brand.`);
  };

  const clearTile = (
    tileName: string,
    clear: () => void,
    restore: () => void,
  ) => requestDelete({
    label: tileName,
    confirmName: customer.name,
    remove: clear,
    restore,
  });

  const removeAllMenuItem = (
    label: string,
    tileName: string,
    clear: () => void,
    restore: () => void,
  ): BrandMenuItem => ({
    label,
    icon: "trash-simple",
    destructive: true,
    onSelect: () => clearTile(tileName, clear, restore),
  });

  const downloadAllMenuItem = (tileName: string): BrandMenuItem => ({
    label: "Download all",
    icon: "download-simple",
    onSelect: () => notify(`${tileName} download started`),
  });

  const reorderMenuItem = (tileName: string): BrandMenuItem => ({
    label: "Reorder",
    icon: "dots-six-vertical",
    onSelect: () => notify(`${tileName} ready to reorder`),
  });

  const removeSelectedAssets = () => {
    if (!profile || selectedAssets.length === 0) return;
    const selectedIds = new Set(selectedAssets.map((asset) => asset.id));
    const previousProfile = profile;
    const previousSubBrands = subBrands;
    const previousVersions = editorVersions;
    requestDelete({
      label: `${selectedAssets.length} selected assets`,
      remove: () => {
        updateSection("logos", profile.logos.filter((logo) => !selectedIds.has(logo.id)));
        updateSection("imagery", profile.imagery.filter((image) => !selectedIds.has(image.id)));
        updateSection("fonts", profile.fonts.filter((font) => !selectedIds.has(`font-${font.role}`)));
        updateSubBrands(subBrands.filter((brand) => !selectedIds.has(`brand-${brand.slug}`)));
        setEditorVersions((versions) => versions.map((version) => ({
          ...version,
          files: version.files.filter((file) => !selectedIds.has(file.id)),
        })));
        setSelectedAssets([]);
      },
      restore: () => {
        updateSection("logos", previousProfile.logos);
        updateSection("imagery", previousProfile.imagery);
        updateSection("fonts", previousProfile.fonts);
        updateSubBrands(previousSubBrands);
        setEditorVersions(previousVersions);
      },
    });
  };

  const selectedAssetMenuItems = (): BrandMenuItem[] => [
    {
      label: "Download",
      icon: "download-simple",
      onSelect: () => notify(`${selectedAssets.length} assets download started`),
    },
    {
      label: "Move to sub-brand",
      icon: "folder-open",
      onSelect: () => {
        notify(`${selectedAssets.length} assets ready to move to a sub-brand`);
        setSelectedAssets([]);
      },
    },
    {
      label: "Delete",
      icon: "trash-simple",
      destructive: true,
      onSelect: removeSelectedAssets,
    },
    {
      label: "Cancel selection",
      icon: "x-close-cross",
      onSelect: () => setSelectedAssets([]),
    },
  ];

  const surface = (
    <div className={`brand-kit-main ${isGuest ? "is-guest" : ""}`}>
      <header className={`brand-kit-page-header ${isGuest ? "guest-header" : ""}`}>
        <div className="brand-kit-heading">
          {isGuest ? (
            <div className="brand-guest-logo">
              <img src={customer.logoUrl} alt={`${customer.name} logo`} />
            </div>
          ) : subBrand ? (
            <nav className="brand-breadcrumbs label-xs-semibold" aria-label="Breadcrumb">
              <Link href={role === "client" ? `/brand-kits/${prototypeCustomerSlug}` : "/brand-kits"}>Brand Kit</Link>
              <DsIcon name="caret-right" size={14} />
              <Link href={`/brand-kits/${customer.slug}`}>{customer.name}</Link>
              <DsIcon name="caret-right" size={14} />
              <span>{subBrand.name}</span>
            </nav>
          ) : role !== "client" ? (
            <Link className="brand-kit-back label-xs-semibold" href="/brand-kits">
              <DsIcon name="arrow-left" size={14} />
              All Brand Kits
            </Link>
          ) : null}
          <div>
            <h1>{subBrand ? titleName : `${titleName} Brand Kit`}</h1>
            <p className="paragraph-s">
              {subBrand
                ? currentRelationship === "master" ? "Master brand" : `Sub-brand of ${customer.name}`
                : "Master brand"}
            </p>
          </div>
        </div>
        <div className="brand-kit-header-actions">
          {!isGuest && subBrand && canManageBrands ? (
            <button
              className="brand-secondary-button label-s-semibold"
              type="button"
              onClick={toggleBrandRelationship}
            >
              <DsIcon name="bookmark" size={16} />
              {currentRelationship === "master" ? "Make sub-brand" : "Make master brand"}
            </button>
          ) : null}
          {!isGuest && role === "client" ? (
            <button
              className="brand-secondary-button label-s-semibold"
              type="button"
              onClick={openNewBrandSetup}
            >
              <DsIcon name="plus" size={16} />
              Add sub-brand
            </button>
          ) : null}
        </div>
      </header>

      <div className="brand-kit-content">
        {visibleBanner ? (
          <section className="brand-kit-banner" aria-label="Brand Kit setup status">
            <DsIcon name="sparkle" size={20} />
            <p className="paragraph-s">{visibleBanner}</p>
            <button
              className="brand-compact-action"
              type="button"
              aria-label="Dismiss setup status"
              onClick={() => setVisibleBanner(null)}
            >
              <DsIcon name="x-close-cross" size={16} />
            </button>
          </section>
        ) : null}

        <section
          className={`brand-tile-grid ${!tilesEnabled ? "has-setup-heading" : ""}`.trim()}
          aria-label={`${titleName} brand assets`}
          style={getBrandTintVariables(profile)}
        >
          <HeroTile
            dropOverlayLabel={!hasMotionPackage ? "Drop files here" : undefined}
            isClientView={role === "client"}
            onDropFiles={hasMotionPackage && canManageMotion
              ? (files) => handleTileUpload("motion", files)
              : !hasMotionPackage && canEdit && !isSetupProcessing
                ? addInlineSetupFiles
                : undefined}
            progress={hasMotionPackage && uploadProgress?.kind === "motion" ? uploadProgress.value : undefined}
            title="Brand Kit"
          >
            {isSetupProcessing ? (
              <BrandKitSetupProgress stage={setupStage} />
            ) : hasMotionPackage ? (
              <div className="brand-kit-video-layout">
                <MotionPreview
                  canManage={canManageMotion}
                  customer={customer}
                  titleName={titleName}
                  onDelete={() => requestDelete({
                    label: `${titleName} motion preview`,
                    remove: () => setHasMotionPackage(false),
                    restore: () => setHasMotionPackage(true),
                  })}
                  onDownload={() => notify("Brand Kit video download started")}
                  onManageVersions={() => notify("Version management opened")}
                  onReplace={() => chooseFile(".mp4,.mov,.m4v,.webm", (file) => handleTileUpload("motion", [file]))}
                />
                <aside className="brand-kit-video-details">
                  <span className="brand-active-badge label-xs-semibold">
                    <span />
                    Active
                  </span>
                  {role !== "client" ? (
                    <EditorFiles
                      activeVersion={activeVersion}
                      versions={editorVersions}
                      onSelectVersion={setSelectedVersionId}
                      onDownload={notify}
                      selectedAssets={selectedAssets}
                      onToggleSelected={toggleSelected}
                      selectionItems={selectedAssetMenuItems()}
                      onDelete={(file) => {
                        const previousVersions = editorVersions;
                        requestDelete({
                          label: file.name,
                          remove: () => setEditorVersions((versions) => versions.map((version) => ({
                            ...version,
                            files: version.files.filter((candidate) => candidate.id !== file.id),
                          }))),
                          restore: () => setEditorVersions(previousVersions),
                        });
                      }}
                      onReplace={(file) => chooseFile(".mogrt,.aep,.zip,.otf,.ttf", (replacement) => {
                        setEditorVersions((versions) => versions.map((version) => ({
                          ...version,
                          files: version.files.map((candidate) => candidate.id === file.id
                            ? { ...candidate, name: replacement.name, size: formatUploadedFileSize(replacement.size) }
                            : candidate),
                        })));
                        notify(`${file.name} replaced`);
                      })}
                    />
                  ) : (
                    <div className="brand-video-current-version">
                      <span className="label-xs">Current version</span>
                      <strong className="label-m-semibold">{activeVersion.label}</strong>
                    </div>
                  )}
                </aside>
              </div>
            ) : (
              <div className="brand-empty-tile brand-hero-setup">
                <span className="brand-empty-visual is-motion" aria-hidden="true">
                  <Image
                    alt=""
                    className="brand-empty-illustration is-motion"
                    height={512}
                    src="/brisk-visuals/brand-kit-empty-state-purple-shadow.png"
                    width={512}
                  />
                </span>
                <div className="brand-hero-setup-content">
                  <strong className="label-m-semibold">Build your Brand Kit</strong>
                  <p className="paragraph-s">
                    Add whatever you have: brand guidelines, logos, fonts, imagery and source files. Or add your website. Brisk will analyse your brand and create your brand kit.
                  </p>

                  {inlineSetupFiles.length > 0 || inlineSetupWebsiteAdded ? (
                    <div className="brand-hero-setup-ready">
                      <strong className="label-m-semibold">Sources added</strong>
                      {inlineSetupFiles.length > 0 ? (
                        <>
                          <div className="brand-hero-source-heading">
                            <span className="brand-hero-source-label">
                              <DsIcon name="folder" size={16} />
                              <strong className="label-s-semibold">
                                {inlineSetupFiles.length} {inlineSetupFiles.length === 1 ? "file" : "files"}
                              </strong>
                            </span>
                            <Button
                              size="S"
                              variant="secondary"
                              onClick={() => inlineSetupFileInputRef.current?.click()}
                            >
                              ＋ Add brand files
                            </Button>
                          </div>
                          <ul className="brand-hero-file-list" aria-label="Added brand files">
                            {inlineSetupFiles.map((file, index) => (
                              <li key={`${file.name}-${file.lastModified}-${index}`}>
                                <span className="brand-hero-file-main">
                                  <InlineSetupFilePreview file={file} />
                                  <span className="label-s-semibold" title={file.name}>{file.name}</span>
                                </span>
                                <span className="label-xs">{formatUploadedFileSize(file.size)}</span>
                              </li>
                            ))}
                          </ul>
                        </>
                      ) : null}
                      {inlineSetupWebsiteAdded ? (
                        <div className="brand-hero-added-website-row">
                          {editingInlineSetupWebsite ? (
                            <form
                              className="brand-hero-website-edit"
                              onSubmit={(event) => {
                                event.preventDefault();
                                if (!inlineSetupWebsiteDraft.trim()) return;
                                setInlineSetupWebsite(inlineSetupWebsiteDraft.trim());
                                setEditingInlineSetupWebsite(false);
                              }}
                            >
                              <input
                                aria-label="Website address"
                                autoFocus
                                className="brand-inline-input paragraph-s"
                                inputMode="url"
                                placeholder="yourcompany.com"
                                type="text"
                                value={inlineSetupWebsiteDraft}
                                onChange={(event) => setInlineSetupWebsiteDraft(event.target.value)}
                                onKeyDown={(event) => {
                                  if (event.key !== "Escape") return;
                                  setInlineSetupWebsiteDraft(inlineSetupWebsite);
                                  setEditingInlineSetupWebsite(false);
                                }}
                              />
                              <button
                                className="brand-hero-website-edit-action is-save label-xs-semibold"
                                disabled={!inlineSetupWebsiteDraft.trim()}
                                type="submit"
                              >
                                Save
                              </button>
                              <button
                                className="brand-hero-website-edit-action label-xs-semibold"
                                type="button"
                                onClick={() => {
                                  setInlineSetupWebsiteDraft(inlineSetupWebsite);
                                  setEditingInlineSetupWebsite(false);
                                }}
                              >
                                Cancel
                              </button>
                            </form>
                          ) : (
                            <>
                              <span className="brand-hero-added-website">
                                <DsIcon name="globe" size={16} />
                                <a
                                  className="label-s-semibold"
                                  href={getWebsiteHref(inlineSetupWebsite)}
                                  rel="noreferrer"
                                  target="_blank"
                                >
                                  {inlineSetupWebsite.trim()}
                                </a>
                              </span>
                              <button
                                className="brand-hero-source-add label-xs-semibold"
                                type="button"
                                onClick={() => {
                                  setInlineSetupWebsiteDraft(inlineSetupWebsite);
                                  setEditingInlineSetupWebsite(true);
                                }}
                              >
                                Change
                              </button>
                            </>
                          )}
                        </div>
                      ) : null}
                      {inlineSetupFiles.length === 0 ? (
                        <Button
                          size="S"
                          variant="secondary"
                          onClick={() => inlineSetupFileInputRef.current?.click()}
                        >
                          ＋ Add brand files
                        </Button>
                      ) : null}
                      <Button
                        className="brand-hero-build-button"
                        size="S"
                        onClick={() => void buildInlineBrandKit()}
                      >
                        Build Brand Kit
                      </Button>
                    </div>
                  ) : (
                    <div className="brand-hero-setup-intake">
                      <Button size="S" onClick={() => inlineSetupFileInputRef.current?.click()}>
                        Add brand files
                      </Button>
                    </div>
                  )}

                  {!inlineSetupWebsiteAdded ? (
                    <div className="brand-hero-website-intake">
                      {showInlineSetupWebsite ? (
                        <div className="brand-hero-website-field">
                          <span className="label-s-semibold">Website</span>
                          <div className="brand-hero-website-composer">
                            <input
                              aria-label="Your website"
                              autoFocus
                              className="brand-inline-input paragraph-s"
                              inputMode="url"
                              placeholder="yourcompany.com"
                              type="text"
                              value={inlineSetupWebsite}
                              onChange={(event) => {
                                setInlineSetupWebsite(event.target.value);
                                setInlineSetupWebsiteAdded(false);
                              }}
                              onKeyDown={(event) => {
                                if (event.key !== "Enter") return;
                                event.preventDefault();
                                if (inlineSetupWebsite.trim()) setInlineSetupWebsiteAdded(true);
                              }}
                            />
                            <button
                              aria-label="Add website"
                              className="brand-hero-website-add-button label-xs-semibold"
                              disabled={!inlineSetupWebsite.trim()}
                              type="button"
                              onClick={() => setInlineSetupWebsiteAdded(true)}
                            >
                              Add
                            </button>
                          </div>
                        </div>
                      ) : (
                        <button
                          className="brand-text-button label-s-semibold brand-hero-website-link"
                          type="button"
                          onClick={() => setShowInlineSetupWebsite(true)}
                        >
                          Add your website
                        </button>
                      )}
                    </div>
                  ) : null}

                  <input
                    ref={inlineSetupFileInputRef}
                    className="sr-only"
                    multiple
                    type="file"
                    onChange={(event) => {
                      addInlineSetupFiles(Array.from(event.target.files ?? []));
                      event.currentTarget.value = "";
                    }}
                  />
                </div>
              </div>
            )}
          </HeroTile>

          {!tilesEnabled ? (
            <div className="brand-kit-includes-header">
              <span className="brand-manual-setup-prompt paragraph-s">
                Prefer to add everything yourself?
              </span>
              <Button
                size="S"
                variant="secondary"
                onClick={() => setSetupStage("manual")}
              >
                Set up manually
              </Button>
            </div>
          ) : null}

          <BrandTile
            action={canEdit && Boolean(profile?.logos.length) ? (
              <TileHeaderActions
                accept={uploadAccept.logos}
                addLabel="Upload logos"
                menuItems={[
                  downloadAllMenuItem("Logos"),
                  reorderMenuItem("Logos"),
                  removeAllMenuItem(
                    "Remove all logos",
                    "Logos",
                    () => updateSection("logos", []),
                    () => updateSection("logos", profile?.logos ?? []),
                  ),
                ]}
                onFiles={(files) => handleTileUpload("logos", files)}
              />
            ) : undefined}
            className="brand-logos-tile"
            disabled={!tilesEnabled}
            onDropFiles={canEdit ? (files) => handleTileUpload("logos", files) : undefined}
            progress={uploadProgress?.kind === "logos" ? uploadProgress.value : undefined}
            title="Logos"
          >
            {profile?.logos.length ? (
              <div className="logo-variant-grid">
                {profile.logos.map((logo) => (
                  <ManagedAsset key={logo.id}>
                    <LogoVariant logo={logo} onOpen={setSelectedLogo} />
                    {canEdit ? (
                      <AssetActions
                        onDownload={() => notify(`${logo.label} download started`)}
                        menuItems={[
                          {
                            label: "Rename",
                            icon: "pencil-simple-ds",
                            onSelect: () => setRenameRequest({
                              initialName: logo.label,
                              save: (name) => updateSection("logos", profile.logos.map((candidate) => candidate.id === logo.id ? { ...candidate, label: name } : candidate)),
                            }),
                          },
                          {
                            label: "Replace",
                            icon: "arrows-clockwise",
                            onSelect: () => chooseFile(uploadAccept.logos, (file) => {
                              updateSection("logos", profile.logos.map((candidate) => candidate.id === logo.id ? {
                                ...candidate,
                                format: /\.svg$/iu.test(file.name) ? "svg" as const : "png" as const,
                                url: URL.createObjectURL(file),
                              } : candidate));
                              notify(`${logo.label} replaced`);
                            }),
                          },
                          { label: "Set as primary", icon: "bookmark", onSelect: () => notify(`${logo.label} set as primary`) },
                          { label: "Copy link", icon: "link", onSelect: () => void copyText(logo.url, "Link copied") },
                          {
                            label: "Delete",
                            icon: "trash-simple",
                            destructive: true,
                            onSelect: () => {
                              const previousLogos = profile.logos;
                              requestDelete({
                                label: logo.label,
                                remove: () => updateSection("logos", previousLogos.filter((candidate) => candidate.id !== logo.id)),
                                restore: () => updateSection("logos", previousLogos),
                              });
                            },
                          },
                        ]}
                      />
                    ) : null}
                  </ManagedAsset>
                ))}
              </div>
            ) : (
              <EmptyTile
                action={{
                  label: "Upload logos",
                  accept: uploadAccept.logos,
                  onFiles: (files) => handleTargetedUpload("logos", files),
                }}
                copy="No logos yet. Drag files here or click + to upload."
                icon="image-square"
                visual="logos"
              />
            )}
          </BrandTile>

          <BrandTile
            action={canEdit && profileHasColours(profile) ? (
              <div className="brand-tile-actions">
                <Button
                  size="S"
                  variant="secondary"
                  onClick={() => {
                    const nextColourIndex = brandColours.length;
                    updateSection("colours", [
                      ...brandColours,
                      { name: "New colour", hex: "#FFFFFF", role: "accent" },
                    ]);
                    setEditingColourIndex(nextColourIndex);
                  }}
                >
                  + Add colour
                </Button>
                <ActionMenu items={[
                  {
                    label: "Copy all HEX codes",
                    icon: "copy",
                    onSelect: () => void copyText(brandColours.map((colour) => colour.hex).join(", "), "All HEX codes copied"),
                  },
                  reorderMenuItem("Colours"),
                  removeAllMenuItem(
                    "Remove all colours",
                    "Colours",
                    () => updateSection("colours", []),
                    () => updateSection("colours", brandColours),
                  ),
                ]} label="Colour actions" />
              </div>
            ) : undefined}
            className="brand-colours-tile"
            disabled={!tilesEnabled}
            title="Colours"
          >
            {profileHasColours(profile) || editingColourIndex !== null ? (
              <div className="colour-swatch-grid">
                {brandColours.map((colour, index) => (
                  <ColourSwatch
                    colour={colour}
                    editable={canEdit}
                    editorOpen={editingColourIndex === index}
                    key={`${colour.name ?? colour.role}-${index}`}
                    onEditorClose={() => setEditingColourIndex(null)}
                    onEditorOpen={() => setEditingColourIndex(index)}
                    onSetPrimary={canEdit ? () => updateSection(
                      "colours",
                      brandColours.map((candidate, candidateIndex): BrandColour => ({
                        ...candidate,
                        role: candidateIndex === index
                          ? "primary"
                          : candidate.role === "primary" ? "secondary" : candidate.role,
                      })),
                    ) : undefined}
                    onChange={(nextColour) => {
                      const nextColours = [...brandColours];
                      nextColours[index] = nextColour;
                      updateSection("colours", nextColours);
                    }}
                    onCopy={(hex) => void copyText(hex, `Copied ${hex}`)}
                    onDelete={canEdit ? () => {
                      const previousColours = brandColours;
                      updateSection("colours", previousColours.filter((_, candidateIndex) => candidateIndex !== index));
                      notifyUndo(
                        colour.name ?? colour.hex,
                        () => updateSection("colours", previousColours),
                      );
                    } : undefined}
                  />
                ))}
              </div>
            ) : (
              <EmptyTile
                action={{
                  label: "+ Add colour",
                  onClick: () => {
                    updateSection("colours", [{ name: "Primary", hex: "#FFFFFF", role: "primary" }]);
                    setEditingColourIndex(0);
                  },
                }}
                copy="We couldn't find your colours. Add them here."
                icon="plus"
                visual="colours"
              />
            )}
          </BrandTile>

          <BrandTile
            action={canEdit && profileHasFonts(profile) ? (
              <TileHeaderActions
                addLabel="Add font"
                menuItems={[
                  downloadAllMenuItem("Fonts"),
                  {
                    label: "Manage font roles",
                    icon: "settings",
                    onSelect: () => setFontModalOpen(true),
                  },
                  removeAllMenuItem(
                    "Remove all fonts",
                    "Fonts",
                    () => updateSection("fonts", []),
                    () => updateSection("fonts", profile?.fonts ?? []),
                  ),
                ]}
                onAdd={() => setFontModalOpen(true)}
              />
            ) : undefined}
            className="brand-fonts-tile"
            disabled={!tilesEnabled}
            onDropFiles={canEdit ? (files) => handleTileUpload("fonts", files) : undefined}
            progress={uploadProgress?.kind === "fonts" ? uploadProgress.value : undefined}
            title="Fonts"
          >
            {profileHasFonts(profile) ? (
              <div className="font-preview-list">
                {profile?.fonts.map((font, index) => font.family.trim() ? (
                  <ManagedAsset key={`${font.role}-${index}`}>
                    <FontPreview
                      actions={canEdit ? (
                        <AssetActions
                          onDownload={() => notify(`${font.family} download started`)}
                          menuItems={[
                            {
                              label: "Replace",
                              icon: "arrows-clockwise",
                              onSelect: () => chooseFile(uploadAccept.fonts, (file) => {
                                const nextFonts = [...profile.fonts];
                                nextFonts[index] = { ...font, family: file.name.replace(/\.[^.]+$/u, ""), source: "custom" };
                                updateSection("fonts", nextFonts);
                                notify(`${font.family} replaced`);
                              }),
                            },
                            {
                              label: "Delete",
                              icon: "trash-simple",
                              destructive: true,
                              onSelect: () => {
                                const previousFonts = profile.fonts;
                                requestDelete({
                                  label: font.family,
                                  remove: () => updateSection("fonts", previousFonts.filter((_, candidateIndex) => candidateIndex !== index)),
                                  restore: () => updateSection("fonts", previousFonts),
                                });
                              },
                            },
                          ]}
                        />
                      ) : undefined}
                      font={font}
                    />
                  </ManagedAsset>
                ) : null)}
              </div>
            ) : (
              <EmptyTile
                action={{
                  label: "Add font",
                  onClick: () => setFontModalOpen(true),
                }}
                copy="No fonts yet. Click + to choose or upload your first font."
                icon="file-text"
                visual="fonts"
              />
            )}
          </BrandTile>

          <BrandTile
            action={canEdit && Boolean(profile?.imagery.some((image) => image.kind === imageryFilter)) ? (
              <TileHeaderActions
                accept={uploadAccept[imageryFilter]}
                addLabel={imageryUploadLabels[imageryFilter]}
                menuItems={[
                  downloadAllMenuItem("Visual Assets"),
                  reorderMenuItem("Visual Assets"),
                  removeAllMenuItem(
                    "Remove all visual assets",
                    "Visual Assets",
                    () => updateSection("imagery", []),
                    () => updateSection("imagery", profile?.imagery ?? []),
                  ),
                ]}
                onFiles={(files) => handleTileUpload(imageryFilter, files)}
              />
            ) : undefined}
            className="brand-imagery-tile"
            disabled={!tilesEnabled}
            onDropFiles={canEdit ? (files) => handleTileUpload(imageryFilter, files) : undefined}
            progress={uploadProgress && ["photo", "broll", "illustration", "audio"].includes(uploadProgress.kind)
              ? uploadProgress.value
              : undefined}
            title="Visual Assets"
          >
            <>
              <div className="imagery-filter" role="group" aria-label="Visual asset type">
                {([
                  ["photo", "Photos"],
                  ["broll", "Footage"],
                  ["illustration", "Icons and graphics"],
                  ["audio", "Audio"],
                ] as const).map(([value, label]) => (
                  <button
                    className={`label-xs-semibold ${imageryFilter === value ? "active" : ""}`}
                    type="button"
                    key={value}
                    onClick={() => setImageryFilter(value)}
                  >
                    {label}
                  </button>
                ))}
              </div>
              {profile?.imagery.length ? (
                <div className="brand-imagery-grid">
                  {visibleImagery.map((image) => (
                      <ManagedAsset key={image.id}>
                        {image.kind === "audio" ? (
                          <button
                            className="brand-imagery-asset is-audio"
                            type="button"
                            onClick={() => notify(`${image.label} selected`)}
                          >
                            <DsIcon name="file-audio" size={24} />
                            <span className="brand-audio-asset-copy">
                              <strong className="label-s-semibold">{image.label}</strong>
                              <small className="label-xs">
                                {[image.format ?? "Audio", image.duration].filter(Boolean).join(" · ")}
                              </small>
                            </span>
                          </button>
                        ) : (
                          <button className="brand-imagery-asset" type="button" onClick={() => setSelectedImagery(image)}>
                            <img src={image.url} alt={image.label} />
                            {image.kind === "broll" ? <DsIcon name="play" size={16} /> : null}
                          </button>
                        )}
                        {canEdit ? (
                          <AssetActions
                            onDownload={() => notify(`${image.label} download started`)}
                            menuItems={[
                              {
                                label: "Rename",
                                icon: "pencil-simple-ds",
                                onSelect: () => setRenameRequest({
                                  initialName: image.label,
                                  save: (name) => updateSection("imagery", profile.imagery.map((candidate) => candidate.id === image.id ? { ...candidate, label: name } : candidate)),
                                }),
                              },
                              {
                                label: "Replace",
                                icon: "arrows-clockwise",
                                onSelect: () => chooseFile(uploadAccept[image.kind], (file) => {
                                  updateSection("imagery", profile.imagery.map((candidate) => candidate.id === image.id ? {
                                    ...candidate,
                                    label: file.name.replace(/\.[^.]+$/u, ""),
                                    url: image.kind === "broll" ? customer.motionPreview.posterUrl : URL.createObjectURL(file),
                                  } : candidate));
                                  notify(`${image.label} replaced`);
                                }),
                              },
                              { label: "Copy link", icon: "link", onSelect: () => void copyText(image.url, "Link copied") },
                              {
                                label: "Delete",
                                icon: "trash-simple",
                                destructive: true,
                                onSelect: () => {
                                  const previousImagery = profile.imagery;
                                  requestDelete({
                                    label: image.label,
                                    remove: () => updateSection("imagery", previousImagery.filter((candidate) => candidate.id !== image.id)),
                                    restore: () => updateSection("imagery", previousImagery),
                                  });
                                },
                              },
                            ]}
                          />
                        ) : null}
                      </ManagedAsset>
                    ))}
                  {visibleImagery.length === 0 ? (
                    <p className="brand-imagery-empty paragraph-s">{imageryEmptyCopy[imageryFilter]}</p>
                  ) : null}
                </div>
              ) : (
                <EmptyTile
                  action={{
                    label: imageryUploadLabels[imageryFilter],
                    accept: uploadAccept[imageryFilter],
                    onFiles: (files) => handleTargetedUpload(imageryFilter, files),
                  }}
                  copy={imageryEmptyCopy[imageryFilter]}
                  icon={imageryFilter === "audio" ? "file-audio" : "image-square"}
                  visual="imagery"
                />
              )}
            </>
          </BrandTile>

          <BrandTile
            action={canEdit && profileHasVoice(profile) ? (
              <TileHeaderActions
                addLabel="Add tone"
                menuItems={[
                  {
                    label: "Edit voice & tone",
                    icon: "pencil-simple-ds",
                    onSelect: () => setVoiceModalOpen(true),
                  },
                  {
                    label: "Copy text",
                    icon: "copy",
                    onSelect: () => void copyText(profile?.voice.summary ?? "", "Voice & Tone copied"),
                  },
                  removeAllMenuItem(
                    "Clear voice & tone",
                    "Voice & Tone",
                    () => updateSection("voice", { summary: "", tags: [] }),
                    () => updateSection("voice", profile?.voice ?? { summary: "", tags: [] }),
                  ),
                ]}
                onAdd={beginAddingTone}
              />
            ) : undefined}
            className="brand-voice-tile voice-tone-tile"
            disabled={!tilesEnabled}
            title="Voice & Tone"
          >
            {profileHasVoice(profile) && profile ? (
              <>
                <p className="voice-summary paragraph-s">{profile.voice.summary}</p>
                <div className="tone-tag-list">
                  {profile.voice.tags.map((tag) => (
                    <span className="tone-tag label-xs-semibold" key={tag}>{tag}</span>
                  ))}
                  {canEdit && isAddingTone ? (
                    <form
                      className="tone-tag-composer"
                      onSubmit={(event) => {
                        event.preventDefault();
                        saveTone();
                      }}
                    >
                      <input
                        aria-label="Custom tone"
                        autoFocus
                        className="tone-tag-input label-xs"
                        placeholder="Custom tone"
                        value={toneDraft}
                        onChange={(event) => setToneDraft(event.target.value)}
                        onKeyDown={(event) => {
                          if (event.key !== "Escape") return;
                          setToneDraft("");
                          setIsAddingTone(false);
                        }}
                      />
                      <button className="tone-tag-save label-xs-semibold" disabled={!toneDraft.trim()} type="submit">
                        Add
                      </button>
                      <button
                        className="tone-tag-cancel label-xs-semibold"
                        type="button"
                        onClick={() => {
                          setToneDraft("");
                          setIsAddingTone(false);
                        }}
                      >
                        Cancel
                      </button>
                    </form>
                  ) : canEdit ? (
                    <button
                      className="tone-tag-add label-xs-semibold"
                      type="button"
                      onClick={beginAddingTone}
                    >
                      + Add tone
                    </button>
                  ) : null}
                </div>
              </>
            ) : (
              <EmptyTile
                action={{
                  label: "Add voice & tone",
                  onClick: () => setVoiceModalOpen(true),
                }}
                copy={role === "client"
                  ? "How does your brand sound? Add a short guide for everyone creating with it."
                  : "How does this brand sound? Add a short guide for everyone creating with it."}
                icon="chat-circle-text"
                visual="voice"
              />
            )}
          </BrandTile>

          <BrandTile
            action={canEdit && Boolean(guidelineFiles.length || profile?.guidelines.aiSummary) ? (
              <TileHeaderActions
                accept={uploadAccept.guidelines}
                addLabel="Upload guidelines"
                menuItems={[
                  downloadAllMenuItem("Brand Guidelines"),
                  reorderMenuItem("Brand Guidelines"),
                  removeAllMenuItem(
                    "Remove all guidelines",
                    "Brand Guidelines",
                    () => updateSection("guidelines", {}),
                    () => updateSection("guidelines", profile?.guidelines ?? {}),
                  ),
                ]}
                onFiles={(files) => handleTileUpload("guidelines", files)}
              />
            ) : undefined}
            className="brand-guidelines-tile"
            disabled={!tilesEnabled}
            onDropFiles={canEdit ? (files) => handleTileUpload("guidelines", files) : undefined}
            progress={uploadProgress?.kind === "guidelines" ? uploadProgress.value : undefined}
            title="Brand Guidelines + Documents"
          >
            {selectedGuideline ? (
              <div className="guidelines-file-asset">
                <div className="guidelines-file-list">
                  {guidelineFiles.map((guideline) => (
                    <div
                      className="guidelines-file-meta"
                      key={guideline.id}
                    >
                      <button
                        className="guidelines-file-thumbnail"
                        type="button"
                        aria-label={`Open ${guideline.name}`}
                        onClick={() => {
                          setSelectedGuidelineId(guideline.id);
                          setGuidelineModalOpen(true);
                        }}
                      >
                        <iframe
                          src={`${guideline.url}#page=1&toolbar=0&navpanes=0&scrollbar=0`}
                          tabIndex={-1}
                          title={`${guideline.name} first page`}
                        />
                      </button>
                      <button
                        className="guidelines-file-select"
                        type="button"
                        onClick={() => {
                          setSelectedGuidelineId(guideline.id);
                          setGuidelineModalOpen(true);
                        }}
                      >
                        <span>
                          <strong className="label-s-semibold">{guideline.name}</strong>
                          <small className="label-xs">{guideline.size} · PDF</small>
                        </span>
                      </button>
                      <a
                        className="brand-compact-action"
                        href={guideline.url}
                        download={guideline.name}
                        aria-label={`Download ${guideline.name}`}
                      >
                        <DsIcon name="download-simple" size={15} />
                      </a>
                      {canEdit ? (
                        <AssetActions
                          menuItems={[
                            {
                              label: "Replace",
                              icon: "arrows-clockwise",
                              onSelect: () => chooseFile(uploadAccept.guidelines, (file) => {
                                const replacement: BrandGuidelineFile = {
                                  ...guideline,
                                  name: file.name,
                                  size: formatUploadedFileSize(file.size),
                                  url: URL.createObjectURL(file),
                                };
                                const nextGuidelines = guidelineFiles.map((candidate) =>
                                  candidate.id === guideline.id ? replacement : candidate,
                                );
                                updateSection("guidelines", {
                                  ...profile?.guidelines,
                                  files: nextGuidelines,
                                  pdfUrl: nextGuidelines[0]?.url,
                                });
                                setSelectedGuidelineId(guideline.id);
                                notify(`${guideline.name} replaced`);
                              }),
                            },
                            {
                              label: "Delete",
                              icon: "trash-simple",
                              destructive: true,
                              onSelect: () => {
                                const previousGuidelines = profile?.guidelines ?? {};
                                const remainingGuidelines = guidelineFiles.filter((candidate) => candidate.id !== guideline.id);
                                requestDelete({
                                  label: guideline.name,
                                  remove: () => {
                                    updateSection("guidelines", {
                                      ...previousGuidelines,
                                      files: remainingGuidelines,
                                      pdfUrl: remainingGuidelines[0]?.url,
                                    });
                                    setSelectedGuidelineId(null);
                                  },
                                  restore: () => {
                                    updateSection("guidelines", previousGuidelines);
                                    setSelectedGuidelineId(guideline.id);
                                  },
                                });
                              },
                            },
                          ]}
                        />
                      ) : null}
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
            {profile?.guidelines.aiSummary ? (
              <div className="guidelines-summary">
                <span className="guidelines-summary-label label-xs-semibold">
                  <DsIcon name="sparkle" size={14} />
                  AI summary
                </span>
                {canEdit ? (
                  <textarea
                    className="guidelines-summary-editor paragraph-s"
                    value={profile.guidelines.aiSummary}
                    aria-label="Brand guidelines summary"
                    onChange={(event) =>
                      updateSection("guidelines", {
                        ...profile.guidelines,
                        aiSummary: event.target.value,
                      })
                    }
                    onBlur={() => notify("Brand Guidelines saved")}
                  />
                ) : (
                  <p className="paragraph-s">{profile.guidelines.aiSummary}</p>
                )}
              </div>
            ) : null}
            {!selectedGuideline && !profile?.guidelines.aiSummary ? (
              <EmptyTile
                action={{
                  label: "Upload guidelines",
                  accept: uploadAccept.guidelines,
                  multiple: true,
                  onFiles: (files) => handleTargetedUpload("guidelines", files),
                }}
                copy="No guidelines yet. Upload a PDF or add a short summary."
                icon="file-text"
                visual="guidelines"
              />
            ) : null}
          </BrandTile>

          <BrandTile
            action={canManageBrands ? (
              <TileHeaderActions
                addLabel="Add sub-brand"
                menuItems={[
                  reorderMenuItem("Sub-brands"),
                  {
                    label: "Manage sub-brands",
                    icon: "settings",
                    onSelect: () => {
                      setShowAllSubBrands(true);
                      notify("Sub-brand management opened");
                    },
                  },
                ]}
                onAdd={openNewBrandSetup}
              />
            ) : undefined}
            className="brand-sub-brands-tile sub-brands-tile"
            disabled={!tilesEnabled}
            id="sub-brands"
            title="Sub-brands"
          >
            {subBrands.length > 0 ? (
                <>
                  <div className="sub-brand-list">
                    {subBrand ? (
                      <SubBrandCard
                        customerSlug={customer.slug}
                        href={`/brand-kits/${customer.slug}`}
                        subBrand={{
                          slug: customer.slug,
                          name: customer.name,
                          logoUrl: customer.logoUrl,
                          lastUpdated: customer.lastUpdated,
                          relationship: "master",
                        }}
                      />
                    ) : null}
                    {visibleSubBrands.map((candidate) => (
                      <ManagedAsset key={candidate.slug} selected={isSelected(`brand-${candidate.slug}`)}>
                        <SubBrandCard
                          customerSlug={customer.slug}
                          subBrand={candidate}
                        />
                        {canManageBrands ? (
                          <AssetActions
                            checked={isSelected(`brand-${candidate.slug}`)}
                            onToggle={() => toggleSelected({ id: `brand-${candidate.slug}`, kind: "sub-brand", label: candidate.name })}
                            selectionItems={selectedAssetMenuItems()}
                            onDownload={() => notify(`${candidate.name} Brand Kit download started`)}
                            menuItems={[
                              {
                                label: "Rename",
                                icon: "pencil-simple-ds",
                                onSelect: () => setRenameRequest({
                                  initialName: candidate.name,
                                  save: (name) => updateSubBrands(subBrands.map((brand) => brand.slug === candidate.slug ? { ...brand, name } : brand)),
                                }),
                              },
                              { label: "Copy link", icon: "link", onSelect: () => void copyText(`/brand-kits/${customer.slug}/${candidate.slug}`, "Link copied") },
                              {
                                label: "Delete",
                                icon: "trash-simple",
                                destructive: true,
                                onSelect: () => {
                                  const previousSubBrands = subBrands;
                                  requestDelete({
                                    label: candidate.name,
                                    remove: () => updateSubBrands(previousSubBrands.filter((brand) => brand.slug !== candidate.slug)),
                                    restore: () => updateSubBrands(previousSubBrands),
                                  });
                                },
                              },
                            ]}
                          />
                        ) : null}
                      </ManagedAsset>
                    ))}
                  </div>
                  <div className="sub-brand-actions">
                    {canManageBrands ? (
                      <button
                        className="brand-text-button label-s-semibold"
                        type="button"
                        onClick={openNewBrandSetup}
                      >
                        + Add sub-brand
                      </button>
                    ) : null}
                    {subBrands.length > 3 ? (
                      <button
                        className="brand-text-button label-s-semibold"
                        type="button"
                        onClick={() => setShowAllSubBrands(!showAllSubBrands)}
                      >
                        {showAllSubBrands ? "Show less" : "View all"}
                      </button>
                    ) : null}
                  </div>
                </>
              ) : (
                <EmptyTile
                  action={{
                    label: "+ Add sub-brand",
                    onClick: openNewBrandSetup,
                  }}
                  copy="Add another identity and keep every brand together."
                  icon="plus"
                  visual="sub-brands"
                />
            )}
          </BrandTile>
        </section>
      </div>

      {isGuest ? (
        <footer className="brand-guest-footer">
          <span className="label-xs">Shared by the production team</span>
          {customer.showPoweredBy ? (
            <span className="label-xs-semibold">
              <img src="/assets/logos/brisk.svg" alt="" />
              Powered by Brisk
            </span>
          ) : null}
        </footer>
      ) : null}

      {toast ? (
        <div className="brand-toast label-s-semibold" role="status">
          <span>{toast.message}</span>
          {toast.actionLabel && toast.onAction ? (
            <button className="label-s-semibold" type="button" onClick={toast.onAction}>{toast.actionLabel}</button>
          ) : null}
        </div>
      ) : null}

      {pendingDelete ? (
        <DeleteConfirmation
          confirmName={pendingDelete.confirmName}
          label={pendingDelete.label}
          onCancel={() => setPendingDelete(null)}
          onConfirm={() => {
            pendingDelete.remove();
            const restore = pendingDelete.restore;
            const label = pendingDelete.label;
            setPendingDelete(null);
            notifyUndo(label, restore);
          }}
        />
      ) : null}

      {renameRequest ? (
        <RenameAssetDialog
          initialName={renameRequest.initialName}
          onCancel={() => setRenameRequest(null)}
          onSave={(name) => {
            renameRequest.save(name);
            setRenameRequest(null);
            notify(`${name} renamed`);
          }}
        />
      ) : null}

      {fontModalOpen ? (
        <AddFontDialog
          onCancel={() => setFontModalOpen(false)}
          onAdd={(family, fontRole) => {
            const currentFonts = profile?.fonts ?? [];
            const nextFonts = currentFonts.some((font) => font.role === fontRole)
              ? currentFonts.map((font) => font.role === fontRole ? { ...font, family, source: "google" as const } : font)
              : [...currentFonts, { role: fontRole, family, source: "google" as const }];
            updateSection("fonts", nextFonts);
            setFontModalOpen(false);
            notify(`${family} added`);
          }}
          onUpload={(file, fontRole) => {
            const family = file.name.replace(/\.[^.]+$/u, "");
            const currentFonts = profile?.fonts ?? [];
            const nextFonts = currentFonts.some((font) => font.role === fontRole)
              ? currentFonts.map((font) => font.role === fontRole ? { ...font, family, source: "custom" as const } : font)
              : [...currentFonts, { role: fontRole, family, source: "custom" as const }];
            updateSection("fonts", nextFonts);
            setFontModalOpen(false);
            notify(`${family} uploaded`);
          }}
        />
      ) : null}

      {voiceModalOpen ? (
        <VoiceToneDialog
          initialValue={profile?.voice.summary ?? ""}
          isCustomerView={role === "client"}
          onCancel={() => setVoiceModalOpen(false)}
          onSave={(summary) => {
            updateSection("voice", {
              summary,
              tags: profile?.voice.tags ?? [],
            });
            setVoiceModalOpen(false);
            notify("Voice & Tone saved");
          }}
        />
      ) : null}

      {setupModal && !isSetupProcessing ? (
        <SetupModal
          customerName={customer.name}
          initialMode={setupModal.mode}
          initialFiles={setupModal.kind === "customer" ? setupInitialFiles : undefined}
          brandRelationship={setupModal.kind === "new-brand" ? setupModal.relationship : undefined}
          isCustomerView={role === "client"}
          onClose={() => {
            setSetupInitialFiles([]);
            setSetupModal(null);
          }}
          onComplete={completeModalSetup}
          onProcessingStart={setupModal.kind === "customer" ? beginAutomatedSetup : undefined}
        />
      ) : null}
      {selectedLogo ? (
        <LogoDownloadModal
          logo={selectedLogo}
          onClose={() => setSelectedLogo(null)}
          onReplace={() => chooseFile(uploadAccept.logos, (file) => {
            if (!profile) return;
            updateSection("logos", profile.logos.map((candidate) => candidate.id === selectedLogo.id ? {
              ...candidate,
              format: /\.svg$/iu.test(file.name) ? "svg" as const : "png" as const,
              url: URL.createObjectURL(file),
            } : candidate));
            notify(`${selectedLogo.label} replaced`);
          })}
          onDelete={() => {
            if (!profile) return;
            const logo = selectedLogo;
            const previousLogos = profile.logos;
            setSelectedLogo(null);
            requestDelete({
              label: logo.label,
              remove: () => updateSection("logos", previousLogos.filter((candidate) => candidate.id !== logo.id)),
              restore: () => updateSection("logos", previousLogos),
            });
          }}
        />
      ) : null}
      {selectedImagery ? (
        <ImageryPreviewModal imagery={selectedImagery} onClose={() => setSelectedImagery(null)} />
      ) : null}
      {guidelineModalOpen && selectedGuideline ? (
        <GuidelinesPreviewModal
          guideline={selectedGuideline}
          onClose={() => setGuidelineModalOpen(false)}
        />
      ) : null}
    </div>
  );

  if (!hasLoadedRole || !canViewCustomer) {
    return <BrandKitPermissionTransition />;
  }

  if (isGuest) {
    return <main className="brand-guest-shell">{surface}</main>;
  }

  return (
    <main className="brand-kit-shell">
      <WorkspaceSidebar activeItem="brandKits" />
      {surface}
    </main>
  );
}

function BrandKitPermissionTransition() {
  return (
    <main className="brand-kits-shell">
      <WorkspaceSidebar activeItem="brandKits" />
      <div className="brand-kit-permission-transition" role="status">
        <span className="brand-loading-mark"><DsIcon name="sparkle" size={24} /></span>
        <strong className="label-m-semibold">Opening your Brand Kit…</strong>
      </div>
    </main>
  );
}

function MotionPreview({
  canManage,
  customer,
  onDelete,
  onDownload,
  onManageVersions,
  onReplace,
  titleName,
}: {
  canManage: boolean;
  customer: BrandKitCustomer;
  onDelete: () => void;
  onDownload: () => void;
  onManageVersions: () => void;
  onReplace: () => void;
  titleName: string;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);

  const playPreview = () => {
    void videoRef.current?.play().catch(() => undefined);
  };

  const pausePreview = () => {
    if (!videoRef.current) return;
    videoRef.current.pause();
    videoRef.current.currentTime = 0;
  };

  return (
    <div
      className="brand-motion-preview"
      onMouseEnter={playPreview}
      onMouseLeave={pausePreview}
      onFocus={playPreview}
      onBlur={pausePreview}
      tabIndex={0}
      aria-label={`${titleName} motion package preview. Hover or focus to play.`}
    >
      <video
        ref={videoRef}
        muted
        loop
        playsInline
        preload="metadata"
        poster={customer.motionPreview.posterUrl}
        src={customer.motionPreview.videoUrl}
      />
      <div className="brand-motion-shade" />
      <div className="brand-motion-wordmark">
        <img src={customer.logoUrl} alt="" />
      </div>
      <div className="brand-motion-lower-third">
        <strong>{titleName}</strong>
        <span>Motion package · titles · lower thirds</span>
      </div>
      <span className="brand-motion-play-hint label-xs-semibold">
        <DsIcon name="play" size={14} />
        Hover to preview
      </span>
      {canManage ? (
        <span className="brand-motion-actions">
          <ActionMenu items={[
            { label: "Download video", icon: "download-simple", onSelect: onDownload },
            { label: "Manage versions", icon: "settings", onSelect: onManageVersions },
            { label: "Replace video", icon: "arrows-clockwise", onSelect: onReplace },
            { label: "Remove video", icon: "trash-simple", destructive: true, onSelect: onDelete },
          ]} />
        </span>
      ) : null}
    </div>
  );
}

function EditorFiles({
  activeVersion,
  onDelete,
  onDownload,
  onReplace,
  onSelectVersion,
  onToggleSelected,
  selectionItems,
  selectedAssets,
  versions,
}: {
  activeVersion: EditorFileVersion;
  onDelete: (file: EditorFile) => void;
  onDownload: (message: string) => void;
  onReplace: (file: EditorFile) => void;
  onSelectVersion: (version: EditorFileVersion["id"]) => void;
  onToggleSelected: (asset: SelectedAsset) => void;
  selectionItems: BrandMenuItem[];
  selectedAssets: SelectedAsset[];
  versions: EditorFileVersion[];
}) {
  const allFileNames = activeVersion.files.map((file) => file.name).join("\n");
  const allHref = `data:application/zip;charset=utf-8,${encodeURIComponent(allFileNames)}`;

  return (
    <section className="editor-files" aria-label="Editor files">
      <header>
        <h3 className="label-m-semibold">Editor files</h3>
        <select
          className="brand-version-select label-xs-semibold"
          value={activeVersion.id}
          aria-label="Motion package version"
          onChange={(event) => onSelectVersion(event.target.value as EditorFileVersion["id"])}
        >
          {versions.map((version) => (
            <option value={version.id} key={version.id}>{version.label}</option>
          ))}
        </select>
      </header>
      <a
        className="editor-files-download-all label-s-semibold"
        download={`${activeVersion.id}-editor-files.zip`}
        href={allHref}
        onClick={() => onDownload("Editor files download started")}
      >
        <DsIcon name="download-simple" size={16} />
        Download all editor files
      </a>
      <div className="editor-file-list">
        {activeVersion.files.map((file) => (
          <ManagedAsset key={file.id} selected={selectedAssets.some((asset) => asset.id === file.id)}>
            <div className="editor-file-row">
              <span className={`editor-file-icon is-${file.kind}`}>
                <DsIcon name={file.kind === "folder" ? "folder" : "file-text"} size={16} />
              </span>
              <span className="editor-file-name">
                <strong className="label-xs-semibold">{file.name}</strong>
                <small className="label-xs">{file.size}</small>
              </span>
            </div>
            <AssetActions
              checked={selectedAssets.some((asset) => asset.id === file.id)}
              onToggle={() => onToggleSelected({ id: file.id, kind: "editor-file", label: file.name })}
              selectionItems={selectionItems}
              onDownload={() => onDownload(`${file.name} download started`)}
              menuItems={[
                { label: "Replace", icon: "arrows-clockwise", onSelect: () => onReplace(file) },
                { label: "Copy link", icon: "link", onSelect: () => onDownload(`${file.name} link copied`) },
                { label: "Delete", icon: "trash-simple", destructive: true, onSelect: () => onDelete(file) },
              ]}
            />
          </ManagedAsset>
        ))}
      </div>
    </section>
  );
}

function VoiceToneDialog({
  initialValue,
  isCustomerView,
  onCancel,
  onSave,
}: {
  initialValue: string;
  isCustomerView: boolean;
  onCancel: () => void;
  onSave: (summary: string) => void;
}) {
  const [summary, setSummary] = useState(initialValue);

  return (
    <div className="brand-modal-backdrop" role="presentation" onMouseDown={onCancel}>
      <section
        className="brand-modal brand-voice-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="brand-voice-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header className="brand-modal-header">
          <h2 className="headings-xs-bold" id="brand-voice-title">Add voice & tone</h2>
          <button className="brand-modal-close" type="button" aria-label="Close" onClick={onCancel}>
            <DsIcon name="x-close-cross" size={18} />
          </button>
        </header>
        <div className="brand-modal-body brand-voice-modal-body">
          <label>
            <span className="label-s-semibold">
              {isCustomerView ? "How does your brand sound?" : "How does this brand sound?"}
            </span>
            <textarea
              className="brand-voice-modal-input paragraph-m"
              value={summary}
              autoFocus
              placeholder="Warm, direct and useful. Lead with the outcome and keep the language conversational."
              onChange={(event) => setSummary(event.target.value)}
            />
          </label>
        </div>
        <footer className="brand-modal-footer">
          <Button size="S" variant="secondary" onClick={onCancel}>Cancel</Button>
          <button
            className="brand-save-button label-s-semibold"
            type="button"
            disabled={!summary.trim()}
            onClick={() => onSave(summary.trim())}
          >
            Save
          </button>
        </footer>
      </section>
    </div>
  );
}

function LogoDownloadModal({
  logo,
  onClose,
  onDelete,
  onReplace,
}: {
  logo: BrandLogo;
  onClose: () => void;
  onDelete: () => void;
  onReplace: () => void;
}) {
  const options = ["SVG", "PNG @1x", "PNG @2x", "PNG @3x", "Favicon"];

  return (
    <div className="brand-modal-backdrop" role="presentation" onMouseDown={onClose}>
      <section
        className="brand-modal logo-download-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="logo-download-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header className="brand-modal-header">
          <div>
            <h2 className="headings-xs-bold" id="logo-download-title">Download logo</h2>
            <p className="paragraph-s">{logo.label}</p>
          </div>
          <button className="brand-modal-close" type="button" aria-label="Close" onClick={onClose}>
            <DsIcon name="x-close-cross" size={18} />
          </button>
        </header>
        <div className={`logo-download-preview is-${logo.variant}`}>
          <img src={logo.url} alt={logo.label} />
        </div>
        <div className="logo-download-options">
          {options.map((option) => (
            <a
              className="label-s-semibold"
              download={`${logo.id}-${option.toLowerCase().replace(/[^a-z0-9]+/gu, "-")}`}
              href={`data:image/svg+xml;charset=utf-8,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg"><text x="10" y="32">${logo.label}</text></svg>`)}`}
              key={option}
            >
              <span>{option}</span>
              <DsIcon name="download-simple" size={16} />
            </a>
          ))}
        </div>
        <footer className="brand-modal-footer">
          <Button size="S" variant="secondary" onClick={onReplace}>Replace</Button>
          <ActionMenu items={[{
            label: "Delete",
            icon: "trash-simple",
            destructive: true,
            onSelect: onDelete,
          }]} />
        </footer>
      </section>
    </div>
  );
}

function ImageryPreviewModal({
  imagery,
  onClose,
}: {
  imagery: BrandImagery;
  onClose: () => void;
}) {
  return (
    <div className="brand-modal-backdrop" role="presentation" onMouseDown={onClose}>
      <section
        className="brand-modal imagery-preview-modal"
        role="dialog"
        aria-modal="true"
        aria-label={`${imagery.label} preview`}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header className="brand-modal-header">
          <div>
            <h2 className="headings-xs-bold">{imagery.label}</h2>
            <p className="paragraph-s">{imagery.kind === "broll" ? "Signature footage" : "Brand imagery"}</p>
          </div>
          <button className="brand-modal-close" type="button" aria-label="Close" onClick={onClose}>
            <DsIcon name="x-close-cross" size={18} />
          </button>
        </header>
        <img className="imagery-preview-image" src={imagery.url} alt={imagery.label} />
      </section>
    </div>
  );
}

function GuidelinesPreviewModal({
  guideline,
  onClose,
}: {
  guideline: BrandGuidelineFile;
  onClose: () => void;
}) {
  return (
    <div className="brand-modal-backdrop" role="presentation" onMouseDown={onClose}>
      <section
        className="brand-modal guidelines-preview-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="guidelines-preview-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header className="brand-modal-header">
          <div>
            <h2 className="headings-xs-bold" id="guidelines-preview-title">{guideline.name}</h2>
            <p className="paragraph-s">{guideline.size} · PDF</p>
          </div>
          <button className="brand-modal-close" type="button" aria-label="Close" onClick={onClose}>
            <DsIcon name="x-close-cross" size={18} />
          </button>
        </header>
        <iframe
          className="brand-guidelines-modal-frame"
          src={guideline.url}
          title={guideline.name}
        />
      </section>
    </div>
  );
}
