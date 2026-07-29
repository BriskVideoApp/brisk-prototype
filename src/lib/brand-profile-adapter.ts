import {
  brandKitCustomers,
  cloneBrandProfile,
  mockBrandProfilesBySlug,
  type BrandProfile,
} from "@/data/brand-kits";

export type BrandProfileProvider = {
  fromUrl: (url: string) => Promise<BrandProfile>;
  fromFiles: (files: File[]) => Promise<BrandProfile>;
};

const generatedProfile = mockBrandProfilesBySlug.loom;

function normaliseWebsite(value: string) {
  const withProtocol = /^https?:\/\//iu.test(value.trim()) ? value.trim() : `https://${value.trim()}`;

  try {
    return new URL(withProtocol).hostname.replace(/^www\./iu, "");
  } catch {
    return "";
  }
}

function waitForMockExtraction() {
  return new Promise<void>((resolve) => window.setTimeout(resolve, 2400));
}

export const mockBrandProfileProvider: BrandProfileProvider = {
  async fromUrl(url) {
    await waitForMockExtraction();
    const hostname = normaliseWebsite(url);
    const matchedCustomer = brandKitCustomers.find((customer) => normaliseWebsite(customer.website) === hostname);
    const matchedProfile = matchedCustomer
      ? mockBrandProfilesBySlug[matchedCustomer.slug] ?? matchedCustomer.profile
      : null;
    const profile = cloneBrandProfile(matchedProfile ?? generatedProfile);

    if (matchedCustomer && !matchedProfile) {
      profile.logos = profile.logos.map((logo) => ({
        ...logo,
        id: `${matchedCustomer.slug}-${logo.layout}-${logo.variant}`,
        label: `${matchedCustomer.name} ${logo.layout} - ${logo.variant}`,
        url: matchedCustomer.logoUrl,
      }));
      profile.voice = {
        ...profile.voice,
        summary: `${matchedCustomer.name} communicates with clarity and confidence. Keep the message specific, useful and focused on the customer's outcome.`,
      };
    }

    return profile;
  },
  async fromFiles(files) {
    await waitForMockExtraction();
    const detectedProfile = cloneBrandProfile(generatedProfile);
    const fontFiles = files.filter((file) => /\.(otf|ttf|woff2?)$/iu.test(file.name));
    const logoFiles = files.filter((file) => /\.(svg|png)$/iu.test(file.name));
    const imageFiles = files.filter((file) => /\.(png|jpe?g|webp)$/iu.test(file.name));
    const videoFiles = files.filter((file) => /\.(mp4|mov|m4v|webm)$/iu.test(file.name));
    const guidelinesFile = files.find((file) => /\.pdf$/iu.test(file.name));

    if (fontFiles.length > 0) {
      const roles = ["heading", "body", "mono"] as const;
      detectedProfile.fonts = roles.map((role, index) => ({
        role,
        family: (fontFiles[index] ?? fontFiles[0]).name.replace(/\.[^.]+$/u, ""),
        source: "custom",
      }));
    }

    if (logoFiles.length > 0) {
      detectedProfile.logos = logoFiles.map((file, index) => ({
        id: `uploaded-logo-${index}`,
        label: file.name.replace(/\.[^.]+$/u, ""),
        variant: (["light", "dark", "mono"] as const)[index % 3],
        format: /\.svg$/iu.test(file.name) ? "svg" : "png",
        url: URL.createObjectURL(file),
        layout: index === 2 ? "mark" : "horizontal",
      }));
    }

    if (imageFiles.length > 0 || videoFiles.length > 0) {
      detectedProfile.imagery = [
        ...imageFiles.map((file, index) => ({
          id: `uploaded-photo-${index}`,
          label: file.name.replace(/\.[^.]+$/u, ""),
          url: URL.createObjectURL(file),
          kind: "photo" as const,
        })),
        ...videoFiles.map((file, index) => ({
          id: `uploaded-broll-${index}`,
          label: file.name.replace(/\.[^.]+$/u, ""),
          url: URL.createObjectURL(file),
          kind: "broll" as const,
        })),
      ];
    }

    if (guidelinesFile) {
      detectedProfile.guidelines = {
        pdfUrl: URL.createObjectURL(guidelinesFile),
        aiSummary: "Key brand guidance extracted from the uploaded PDF.",
      };
    }

    return detectedProfile;
  },
};

export async function getBrandFromUrl(url: string): Promise<BrandProfile> {
  return mockBrandProfileProvider.fromUrl(url);
}

export async function getBrandFromFiles(files: File[]): Promise<BrandProfile> {
  return mockBrandProfileProvider.fromFiles(files);
}

export async function getBrandFromSources(
  url: string,
  files: File[],
): Promise<BrandProfile> {
  const trimmedUrl = url.trim();

  if (!trimmedUrl) {
    return getBrandFromFiles(files);
  }

  const profile = await getBrandFromUrl(trimmedUrl);
  const guidelinesFile = files.find((file) => /\.pdf$/iu.test(file.name));

  if (guidelinesFile) {
    profile.guidelines = {
      pdfUrl: URL.createObjectURL(guidelinesFile),
      aiSummary: "Key brand guidance extracted from the uploaded PDF.",
    };
  }

  return profile;
}
