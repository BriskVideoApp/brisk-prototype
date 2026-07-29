"use client";

import {
  createContext,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { usePrototypeRole } from "@/components/navigation/PrototypeRoleContext";
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
};

const BrandKitContext = createContext<BrandKitContextValue | null>(null);
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
}: {
  children: ReactNode;
  customer: BrandKitCustomer;
  initialProfile?: BrandProfile | null;
  initialSubBrands?: SubBrand[];
  isGuest?: boolean;
}) {
  const { hasLoadedRole, selectedRole } = usePrototypeRole();
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
  const [banner, setBanner] = useState<string | null>(null);
  const [autoDetectedSections, setAutoDetectedSections] = useState<Set<BrandProfileSection>>(
    () => new Set(),
  );
  const canEdit = !isGuest && (role !== "client" || customer.clientCanEdit);

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
        ? role === "client"
          ? "We've pulled in what we could find. Edit anything below, or upload your logo pack, fonts, and guidelines to finish."
          : "We've pulled in what we could find. Edit anything below, or upload the customer's logo pack, fonts, and guidelines to finish."
        : source === "deep"
          ? "Brand Kit built from the uploads. Add more anytime."
          : role === "client"
            ? "Start with the essentials. Add your colours, fonts, logos and guidelines below."
            : "Start with the essentials. Add the customer's colours, fonts, logos and guidelines below.",
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

    setSubBrands((current) => [...current, nextSubBrand]);
    return nextSubBrand;
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

  return <BrandKitContext.Provider value={value}>{children}</BrandKitContext.Provider>;
}

export function useBrandKit() {
  const context = useContext(BrandKitContext);

  if (!context) {
    throw new Error("useBrandKit must be used within BrandKitProvider");
  }

  return context;
}
