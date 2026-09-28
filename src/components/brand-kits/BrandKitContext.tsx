"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { usePrototypeRole } from "@/components/navigation/PrototypeRoleContext";
import { usePrototypeState } from "@/components/prototype-state/PrototypeStateContext";
import {
  cloneBrandProfile,
  createManualBrandProfile,
  type BrandRelationship,
  type BrandKitCustomer,
  type BrandProfile,
  type SubBrand,
} from "@/data/brand-kits";

export type BrandKitRole = "owner" | "editor" | "client";
export type BrandProfileSection = keyof BrandProfile;
export type SetupSource = "quick" | "deep" | "manual";
export type SetupMode = Exclude<SetupSource, "manual">;

type BrandKitContextValue = {
  customer: BrandKitCustomer;
  profile: BrandProfile | null;
  subBrands: SubBrand[];
  role: BrandKitRole;
  hasLoadedRole: boolean;
  isGuest: boolean;
  canEdit: boolean;
  banner: string | null;
  autoDetectedSections: ReadonlySet<BrandProfileSection>;
  updateSection: <Section extends BrandProfileSection>(
    section: Section,
    value: BrandProfile[Section],
  ) => void;
  completeSetup: (profile: BrandProfile, source: SetupSource) => void;
  addBrand: (
    name: string,
    profile: BrandProfile,
    relationship: BrandRelationship,
  ) => SubBrand;
  updateSubBrands: (subBrands: SubBrand[]) => void;
};

const BrandKitContext = createContext<BrandKitContextValue | null>(null);
export type StoredBrandKit = { profile: BrandProfile | null; subBrands: SubBrand[] };

export function getBrandKitStorageKey(workspaceId: string, slug: string) {
  return `brisk-brand-kit-v1:${workspaceId}:${slug}`;
}

export function readStoredBrandKit(key: string): StoredBrandKit | null {
  try {
    const stored = window.localStorage.getItem(key);
    const parsed: unknown = stored ? JSON.parse(stored) : null;
    if (parsed && typeof parsed === "object" && "subBrands" in parsed && Array.isArray(parsed.subBrands)
      && "profile" in parsed) return parsed as StoredBrandKit;
  } catch {
    // Keep the seeded Brand Kit if browser storage is unavailable.
  }
  return null;
}

function writeStoredBrandKit(key: string, value: StoredBrandKit) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // The prototype remains editable for this visit if browser storage is unavailable.
  }
}
const profileSections: BrandProfileSection[] = [
  "logos",
  "colours",
  "fonts",
  "imagery",
  "voice",
  "guidelines",
];

export function useRole(): BrandKitRole {
  const { selectedRole } = usePrototypeRole();

  if (selectedRole === "Studio Staff") {
    return "owner";
  }

  if (selectedRole === "Studio Freelancer") {
    return "editor";
  }

  return "client";
}

export function BrandKitProvider({
  children,
  customer,
  initialProfile,
  initialSubBrands,
  isGuest = false,
  subBrandSlug,
}: {
  children: ReactNode;
  customer: BrandKitCustomer;
  initialProfile?: BrandProfile | null;
  initialSubBrands?: SubBrand[];
  isGuest?: boolean;
  subBrandSlug?: string;
}) {
  const { hasLoadedRole, selectedRole } = usePrototypeRole();
  const { state } = usePrototypeState();
  const role: BrandKitRole = isGuest
    ? "client"
    : selectedRole === "Studio Staff"
      ? "owner"
      : selectedRole === "Studio Freelancer"
        ? "editor"
        : "client";
  const [profile, setProfile] = useState<BrandProfile | null>(() => {
    const sourceProfile = initialProfile === undefined ? customer.profile : initialProfile;
    return sourceProfile ? cloneBrandProfile(sourceProfile) : null;
  });
  const [subBrands, setSubBrands] = useState<SubBrand[]>(
    () => initialSubBrands ?? customer.subBrands,
  );
  const [loadedStorageKey, setLoadedStorageKey] = useState<string | null>(null);
  const storageKey = getBrandKitStorageKey(state.session.activeWorkspaceId, customer.slug);
  const [banner, setBanner] = useState<string | null>(null);
  const [autoDetectedSections, setAutoDetectedSections] = useState<Set<BrandProfileSection>>(
    () => new Set(),
  );
  const canEdit = !isGuest && (role !== "client" || customer.clientCanEdit);

  useEffect(() => {
    if (isGuest) return;
    const stored = readStoredBrandKit(storageKey);
    const nextSubBrands = stored?.subBrands ?? initialSubBrands ?? customer.subBrands;
    const nextProfile = subBrandSlug
      ? nextSubBrands.find((brand) => brand.slug === subBrandSlug)?.profile ?? initialProfile ?? null
      : stored?.profile ?? customer.profile;
    setSubBrands(nextSubBrands);
    setProfile(nextProfile ? cloneBrandProfile(nextProfile) : null);
    setLoadedStorageKey(storageKey);
  }, [customer.slug, isGuest, storageKey, subBrandSlug]);

  useEffect(() => {
    if (isGuest || loadedStorageKey !== storageKey) return;
    const stored = readStoredBrandKit(storageKey);
    const nextSubBrands = subBrandSlug
      ? subBrands.map((brand) => brand.slug === subBrandSlug ? { ...brand, profile: profile ?? brand.profile } : brand)
      : subBrands;
    writeStoredBrandKit(storageKey, { profile: subBrandSlug ? stored?.profile ?? customer.profile : profile, subBrands: nextSubBrands });
  }, [customer.profile, isGuest, loadedStorageKey, profile, storageKey, subBrandSlug, subBrands]);

  const updateSection = <Section extends BrandProfileSection>(
    section: Section,
    value: BrandProfile[Section],
  ) => {
    setProfile((current) => ({
      ...(current ?? createManualBrandProfile()),
      [section]: value,
    }));
    setAutoDetectedSections((current) => {
      const nextSections = new Set(current);
      nextSections.delete(section);
      return nextSections;
    });
  };

  const completeSetup = (nextProfile: BrandProfile, source: SetupSource) => {
    setProfile(cloneBrandProfile(nextProfile));
    setAutoDetectedSections(source === "manual" ? new Set() : new Set(profileSections));
    setBanner(
      source === "quick"
        ? "We've pulled in what we could find. Use + in Logos, Fonts, Visual Assets and Brand Guidelines to upload to each section. Add Colours and Voice & Tone in their own sections."
        : source === "deep"
          ? "Brand Kit built from the uploads. Use + in any section to add or replace its assets."
          : "Start with the essentials. Use + in each section to add its colours, fonts, logos, visual assets and guidelines.",
    );
  };

  const addBrand = (
    name: string,
    brandProfile: BrandProfile,
    relationship: BrandRelationship,
  ) => {
    const slugBase = name
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/gu, "-")
      .replace(/^-|-$/gu, "") || "new-sub-brand";
    const existingSlugs = new Set(subBrands.map((subBrand) => subBrand.slug));
    let slug = slugBase;
    let suffix = 2;

    while (existingSlugs.has(slug)) {
      slug = `${slugBase}-${suffix}`;
      suffix += 1;
    }

    const nextSubBrand: SubBrand = {
      slug,
      name,
      logoUrl: customer.logoUrl,
      lastUpdated: "Just now",
      relationship,
      profile: cloneBrandProfile(brandProfile),
    };

    const nextSubBrands = [...subBrands, nextSubBrand];
    setSubBrands(nextSubBrands);
    const stored = readStoredBrandKit(storageKey);
    writeStoredBrandKit(storageKey, { profile: subBrandSlug ? stored?.profile ?? customer.profile : profile, subBrands: nextSubBrands });
    return nextSubBrand;
  };

  const updateSubBrands = (nextSubBrands: SubBrand[]) => {
    setSubBrands(nextSubBrands);
    const stored = readStoredBrandKit(storageKey);
    writeStoredBrandKit(storageKey, { profile: subBrandSlug ? stored?.profile ?? customer.profile : profile, subBrands: nextSubBrands });
  };

  const value = useMemo<BrandKitContextValue>(
    () => ({
      customer,
      profile,
      subBrands,
      role,
      hasLoadedRole: isGuest || hasLoadedRole,
      isGuest,
      canEdit,
      banner,
      autoDetectedSections,
      updateSection,
      completeSetup,
      addBrand,
      updateSubBrands,
    }),
    [
      autoDetectedSections,
      banner,
      canEdit,
      customer,
      hasLoadedRole,
      isGuest,
      profile,
      role,
      subBrands,
    ],
  );

  return <BrandKitContext.Provider value={value}>{isGuest || loadedStorageKey === storageKey ? children : null}</BrandKitContext.Provider>;
}

export function useBrandKit() {
  const context = useContext(BrandKitContext);

  if (!context) {
    throw new Error("useBrandKit must be used within BrandKitProvider");
  }

  return context;
}
