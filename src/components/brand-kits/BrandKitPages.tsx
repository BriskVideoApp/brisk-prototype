"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
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
  type BrandImagery,
  type BrandKitCustomer,
  type BrandLogo,
  type BrandProfile,
  type BrandRelationship,
  type EditorFileVersion,
  type SubBrand,
} from "@/data/brand-kits";
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
  TileActionButton,
  TileUploadButton,
} from "./BrandKitPrimitives";

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
  | "guidelines";

const uploadAccept: Record<TargetedUploadKind, string> = {
  motion: ".aep,.mogrt,.zip,.otf,.ttf",
  logos: ".svg,.png",
  fonts: ".otf,.ttf,.woff,.woff2,.zip",
  photo: ".png,.jpg,.jpeg,.webp",
  broll: ".mp4,.mov,.m4v,.webm",
  illustration: ".svg,.png,.jpg,.jpeg,.webp",
  guidelines: ".pdf,application/pdf",
};

const imageryUploadLabels: Record<BrandImagery["kind"], string> = {
  photo: "Upload photos",
  broll: "Upload b-roll",
  illustration: "Upload illustrations",
};

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
      {customers.map((customer) => (
        <Link className="customer-brand-card" href={`/brand-kits/${customer.slug}`} key={customer.slug}>
          <div className="customer-brand-card-mark">
            <img src={customer.logoUrl} alt="" />
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
      ))}
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
      initialSubBrands={subBrand ? [] : customer.subBrands}
      isGuest={isGuest}
    >
      <BrandKitSurface subBrand={subBrand} />
    </BrandKitProvider>
  );
}

function BrandKitSurface({ subBrand }: { subBrand?: SubBrand }) {
  const {
    addBrand,
    autoDetectedSections,
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
  } = useBrandKit();
  const router = useRouter();
  const [setupModal, setSetupModal] = useState<SetupModalState>(null);
  const [selectedLogo, setSelectedLogo] = useState<BrandLogo | null>(null);
  const [selectedImagery, setSelectedImagery] = useState<BrandImagery | null>(null);
  const [imageryFilter, setImageryFilter] = useState<"photo" | "broll" | "illustration">("photo");
  const [selectedVersionId, setSelectedVersionId] = useState<EditorFileVersion["id"]>("v3");
  const [showAllSubBrands, setShowAllSubBrands] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [currentRelationship, setCurrentRelationship] = useState<BrandRelationship>(
    subBrand?.relationship ?? "master",
  );
  const titleName = subBrand?.name ?? customer.name;
  const activeVersion =
    customer.editorFileVersions.find((version) => version.id === selectedVersionId)
    ?? customer.editorFileVersions[0];
  const visibleSubBrands = showAllSubBrands ? subBrands : subBrands.slice(0, 3);
  const canViewCustomer = isGuest || role !== "client" || customer.slug === prototypeCustomerSlug;
  const canManageBrands = !isGuest && (canEdit || role === "client");
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

  const notify = (message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(null), 2200);
  };

  const openNewBrandSetup = () => setSetupModal({
    kind: "new-brand",
    mode: "quick",
    relationship: newBrandRelationship,
  });

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
      notify("Brand Kit ready to edit");
    }
    setSetupModal(null);
  };

  const handleTargetedUpload = (kind: TargetedUploadKind, files: File[]) => {
    if (files.length === 0) return;

    if (kind === "motion") {
      notify(files.length === 1 ? "Motion file uploaded" : "Motion files uploaded");
      return;
    }

    if (kind === "logos") {
      updateSection("logos", files.map((file, index) => ({
        id: `uploaded-logo-${Date.now()}-${index}`,
        label: file.name.replace(/\.[^.]+$/u, ""),
        variant: (["light", "dark", "mono"] as const)[index % 3],
        format: /\.svg$/iu.test(file.name) ? "svg" : "png",
        url: URL.createObjectURL(file),
        layout: index === 2 ? "mark" : "horizontal",
      })));
      notify(files.length === 1 ? "Logo uploaded" : "Logos uploaded");
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
      notify(files.length === 1 ? "Font uploaded" : "Fonts uploaded");
      return;
    }

    if (kind === "guidelines") {
      updateSection("guidelines", {
        pdfUrl: URL.createObjectURL(files[0]),
        aiSummary: "Key brand guidance extracted from the uploaded PDF.",
      });
      notify("Brand guidelines uploaded");
      return;
    }

    const existingImagery = profile?.imagery.filter((image) => image.kind !== kind) ?? [];
    const uploadedImagery: BrandImagery[] = files.map((file, index) => ({
      id: `uploaded-${kind}-${Date.now()}-${index}`,
      label: file.name.replace(/\.[^.]+$/u, ""),
      url: kind === "broll" ? customer.motionPreview.posterUrl : URL.createObjectURL(file),
      kind,
    }));
    updateSection("imagery", [...existingImagery, ...uploadedImagery]);
    notify(`${imageryUploadLabels[kind].replace("Upload", "Uploaded")} successfully`);
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
            <h1>{titleName} Brand Kit</h1>
            <p className="paragraph-s">
              Brand assets
              {subBrand ? ` · ${currentRelationship === "master" ? "Master brand" : "Sub-brand"}` : ""}
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
              Add brand
            </button>
          ) : null}
        </div>
      </header>

      <div className="brand-kit-content">
        {banner ? (
          <section className="brand-kit-banner" aria-label="Brand Kit setup status">
            <DsIcon name="sparkle" size={20} />
            <p className="paragraph-s">{banner}</p>
            <Button
              size="S"
              variant="secondary"
              onClick={() => setSetupModal({ kind: "customer", mode: "deep" })}
            >
              Upload files
            </Button>
          </section>
        ) : null}

        <section className="brand-tile-grid" aria-label={`${titleName} brand assets`}>
          <HeroTile
            action={canEdit ? (
              <TileUploadButton
                accept={uploadAccept.motion}
                label="Update motion package"
                onFiles={(files) => handleTargetedUpload("motion", files)}
              />
            ) : undefined}
            autoDetected={autoDetectedSections.has("imagery")}
            isClientView={role === "client"}
          >
            {profile ? (
              <>
                <MotionPreview customer={customer} titleName={titleName} />
                {role !== "client" ? (
                  <EditorFiles
                    activeVersion={activeVersion}
                    versions={customer.editorFileVersions}
                    onSelectVersion={setSelectedVersionId}
                    onDownload={notify}
                  />
                ) : null}
              </>
            ) : (
              <EmptyTile
                action={{
                  label: "Set up Brand Kit",
                  onClick: () => setSetupModal({ kind: "customer", mode: "quick" }),
                }}
                copy="Branded titles, lower thirds, and animated logo, ready to drop into every edit."
                icon="sparkle"
                title={`Set up ${role === "client" ? "your" : "their"} Brand Kit.`}
              />
            )}
          </HeroTile>

          <BrandTile
            action={canEdit ? (
              <TileUploadButton
                accept={uploadAccept.logos}
                label="Upload logos"
                onFiles={(files) => handleTargetedUpload("logos", files)}
              />
            ) : undefined}
            autoDetected={autoDetectedSections.has("logos")}
            title="Logos"
          >
            {profile?.logos.length ? (
              <div className="logo-variant-grid">
                {profile.logos.map((logo) => (
                  <LogoVariant logo={logo} key={logo.id} onOpen={setSelectedLogo} />
                ))}
              </div>
            ) : (
              <EmptyTile
                action={{
                  label: "Upload logos",
                  accept: uploadAccept.logos,
                  onFiles: (files) => handleTargetedUpload("logos", files),
                }}
                copy={role === "client"
                  ? "No logos yet. Upload your logo pack to get started."
                  : "No logos yet. Upload the customer's logo pack to get started."}
                icon="image-square"
              />
            )}
          </BrandTile>

          <BrandTile
            action={canEdit ? (
              <TileActionButton
                icon="plus"
                label="Add colour"
                onClick={() => {
                  updateSection("colours", [
                    ...(profile?.colours ?? []),
                    { name: "New colour", hex: "#FFFFFF", role: "accent" },
                  ]);
                }}
              />
            ) : undefined}
            autoDetected={autoDetectedSections.has("colours")}
            title="Colours"
          >
            {profile?.colours.length ? (
              <div className="colour-swatch-grid">
                {profile.colours.map((colour, index) => (
                  <ColourSwatch
                    colour={colour}
                    editable={canEdit}
                    key={`${colour.hex}-${index}`}
                    onChange={(nextColour) => {
                      const nextColours = [...profile.colours];
                      nextColours[index] = nextColour;
                      updateSection("colours", nextColours);
                    }}
                    onCopy={(hex) => void copyText(hex, `Copied ${hex}`)}
                  />
                ))}
              </div>
            ) : (
              <EmptyTile
                action={{
                  label: "Add colours",
                  onClick: () => {
                    updateSection("colours", [{ name: "Primary", hex: "#FFFFFF", role: "primary" }]);
                  },
                }}
                copy={`We couldn't find ${role === "client" ? "your" : "their"} colours. Add them here.`}
                icon="plus"
              />
            )}
          </BrandTile>

          <BrandTile
            action={canEdit ? (
              <TileUploadButton
                accept={uploadAccept.fonts}
                label="Upload fonts"
                onFiles={(files) => handleTargetedUpload("fonts", files)}
              />
            ) : undefined}
            autoDetected={autoDetectedSections.has("fonts")}
            title="Fonts"
          >
            {profile?.fonts.length ? (
              <div className="font-preview-list">
                {profile.fonts.map((font, index) => (
                  <FontPreview
                    editable={canEdit}
                    font={font}
                    key={`${font.role}-${index}`}
                    onChange={(nextFont) => {
                      const nextFonts = [...profile.fonts];
                      nextFonts[index] = nextFont;
                      updateSection("fonts", nextFonts);
                    }}
                    onRemove={() => {
                      updateSection("fonts", profile.fonts.filter((_, candidateIndex) => candidateIndex !== index));
                      notify("Font removed");
                    }}
                    onUpload={(file) => {
                      const nextFonts = [...profile.fonts];
                      nextFonts[index] = {
                        ...font,
                        family: file.name.replace(/\.[^.]+$/u, ""),
                        source: "custom",
                      };
                      updateSection("fonts", nextFonts);
                      notify("Font replaced");
                    }}
                  />
                ))}
              </div>
            ) : (
              <EmptyTile
                action={{
                  label: "Upload fonts",
                  accept: uploadAccept.fonts,
                  onFiles: (files) => handleTargetedUpload("fonts", files),
                }}
                copy={role === "client"
                  ? "No fonts yet. Upload your font files."
                  : "No fonts yet. Upload the customer's font files."}
                icon="file-text"
              />
            )}
          </BrandTile>

          <BrandTile
            action={canEdit ? (
              <TileUploadButton
                accept={uploadAccept[imageryFilter]}
                label={imageryUploadLabels[imageryFilter]}
                onFiles={(files) => handleTargetedUpload(imageryFilter, files)}
              />
            ) : undefined}
            autoDetected={autoDetectedSections.has("imagery")}
            title="Imagery"
          >
            <>
              <div className="imagery-filter" role="group" aria-label="Imagery type">
                {([
                  ["photo", "Photos"],
                  ["broll", "B-roll"],
                  ["illustration", "Illustration"],
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
                  {profile.imagery
                    .filter((image) => image.kind === imageryFilter)
                    .map((image) => (
                      <button type="button" key={image.id} onClick={() => setSelectedImagery(image)}>
                        <img src={image.url} alt={image.label} />
                        {image.kind === "broll" ? <DsIcon name="play" size={16} /> : null}
                      </button>
                    ))}
                  {profile.imagery.every((image) => image.kind !== imageryFilter) ? (
                    <p className="brand-imagery-empty paragraph-s">No {imageryFilter} assets yet.</p>
                  ) : null}
                </div>
              ) : (
                <EmptyTile
                  action={{
                    label: imageryUploadLabels[imageryFilter],
                    accept: uploadAccept[imageryFilter],
                    onFiles: (files) => handleTargetedUpload(imageryFilter, files),
                  }}
                  copy={`No ${imageryFilter === "broll" ? "b-roll" : imageryFilter} assets yet.`}
                  icon="image-square"
                />
              )}
            </>
          </BrandTile>

          <BrandTile
            action={canEdit ? (
              <TileActionButton icon="pencil-simple-ds" label="Edit voice and tone" onClick={() => undefined} />
            ) : undefined}
            autoDetected={autoDetectedSections.has("voice")}
            className="voice-tone-tile"
            title="Voice & Tone"
          >
            {profile ? (
              <>
                {canEdit ? (
                  <textarea
                    className="voice-summary-editor paragraph-s"
                    value={profile.voice.summary}
                    aria-label="Voice and tone summary"
                    onChange={(event) =>
                      updateSection("voice", { ...profile.voice, summary: event.target.value })
                    }
                    onBlur={() => notify("Voice & Tone saved")}
                  />
                ) : (
                  <p className="voice-summary paragraph-s">{profile.voice.summary}</p>
                )}
                <div className="tone-tag-list">
                  {profile.voice.tags.map((tag) => (
                    <span className="tone-tag label-xs-semibold" key={tag}>{tag}</span>
                  ))}
                  {canEdit ? (
                    <button
                      className="tone-tag-add label-xs-semibold"
                      type="button"
                      onClick={() =>
                        updateSection("voice", {
                          ...profile.voice,
                          tags: [...profile.voice.tags, "New tone"],
                        })
                      }
                    >
                      + Add tone
                    </button>
                  ) : null}
                </div>
              </>
            ) : (
              <EmptyTile
                action={{
                  label: "Add voice notes",
                  onClick: () => setSetupModal({ kind: "customer", mode: "quick" }),
                }}
                copy={role === "client"
                  ? "Add a short guide to how your brand should sound."
                  : "Add a short guide to how the customer should sound."}
                icon="chat-circle-text"
              />
            )}
          </BrandTile>

          <BrandTile
            action={canEdit ? (
              <TileUploadButton
                accept={uploadAccept.guidelines}
                label="Upload guidelines"
                multiple={false}
                onFiles={(files) => handleTargetedUpload("guidelines", files)}
              />
            ) : undefined}
            autoDetected={autoDetectedSections.has("guidelines")}
            title="Brand Guidelines"
          >
            {profile?.guidelines.pdfUrl ? (
              <iframe
                className="brand-guidelines-frame"
                src={profile.guidelines.pdfUrl}
                title={`${titleName} brand guidelines`}
              />
            ) : profile?.guidelines.aiSummary ? (
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
            ) : (
              <EmptyTile
                action={{
                  label: "Upload guidelines",
                  accept: uploadAccept.guidelines,
                  multiple: false,
                  onFiles: (files) => handleTargetedUpload("guidelines", files),
                }}
                copy="No guidelines yet. Upload a PDF or add a short summary."
                icon="file-text"
              />
            )}
          </BrandTile>

          {!subBrand ? (
            <BrandTile
              action={canManageBrands ? (
                <TileActionButton
                  icon="plus"
                  label="Add brand"
                  onClick={openNewBrandSetup}
                />
              ) : undefined}
              className="sub-brands-tile"
              id="sub-brands"
              title="Brands"
            >
              {subBrands.length > 0 ? (
                <>
                  <div className="sub-brand-list">
                    {visibleSubBrands.map((candidate) => (
                      <SubBrandCard
                        customerSlug={customer.slug}
                        key={candidate.slug}
                        subBrand={candidate}
                      />
                    ))}
                  </div>
                  <div className="sub-brand-actions">
                    {canManageBrands ? (
                      <button
                        className="brand-text-button label-s-semibold"
                        type="button"
                        onClick={openNewBrandSetup}
                      >
                        + Add brand
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
                    label: "+ Add brand",
                    onClick: openNewBrandSetup,
                  }}
                  copy="Add another identity and keep every brand together."
                  icon="plus"
                />
              )}
            </BrandTile>
          ) : null}
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

      {toast ? <div className="brand-toast label-s-semibold" role="status">{toast}</div> : null}

      {setupModal ? (
        <SetupModal
          customerName={customer.name}
          initialMode={setupModal.mode}
          brandRelationship={setupModal.kind === "new-brand" ? setupModal.relationship : undefined}
          isCustomerView={role === "client"}
          onClose={() => setSetupModal(null)}
          onComplete={completeModalSetup}
        />
      ) : null}
      {selectedLogo ? (
        <LogoDownloadModal logo={selectedLogo} onClose={() => setSelectedLogo(null)} />
      ) : null}
      {selectedImagery ? (
        <ImageryPreviewModal imagery={selectedImagery} onClose={() => setSelectedImagery(null)} />
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
  customer,
  titleName,
}: {
  customer: BrandKitCustomer;
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
      <span className="brand-active-badge label-xs-semibold">
        <span />
        Active
      </span>
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
    </div>
  );
}

function EditorFiles({
  activeVersion,
  onDownload,
  onSelectVersion,
  versions,
}: {
  activeVersion: EditorFileVersion;
  onDownload: (message: string) => void;
  onSelectVersion: (version: EditorFileVersion["id"]) => void;
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
          <div className="editor-file-row" key={file.id}>
            <span className={`editor-file-icon is-${file.kind}`}>
              <DsIcon name={file.kind === "folder" ? "folder" : "file-text"} size={16} />
            </span>
            <span className="editor-file-name">
              <strong className="label-xs-semibold">{file.name}</strong>
              <small className="label-xs">{file.size}</small>
            </span>
            <a
              download={file.name}
              href={`data:application/octet-stream;charset=utf-8,${encodeURIComponent(`Mock ${file.name}`)}`}
              aria-label={`Download ${file.name}`}
              onClick={() => onDownload(`${file.name} download started`)}
            >
              <DsIcon name="download-simple" size={15} />
            </a>
          </div>
        ))}
      </div>
    </section>
  );
}

function LogoDownloadModal({
  logo,
  onClose,
}: {
  logo: BrandLogo;
  onClose: () => void;
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
            <p className="paragraph-s">{imagery.kind === "broll" ? "Signature b-roll" : "Brand imagery"}</p>
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
