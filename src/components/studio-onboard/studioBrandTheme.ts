import type { CSSProperties } from "react";
import {
  getStudioBrandTheme,
  type StudioBrandAccentId,
  type StudioBrandColour,
} from "@/data/studio-onboard";

type StudioBrandThemeSource = {
  brandAccentId?: StudioBrandAccentId;
  brandColours?: readonly StudioBrandColour[];
};

type StudioBrandThemeProperties = CSSProperties & {
  "--studio-client-accent": string;
  "--studio-client-accent-soft": string;
  "--studio-client-accent-ink": string;
  "--studio-client-accent-contrast": string;
  "--studio-client-accent-ink-contrast": string;
};

export function getStudioBrandThemeStyle(source: StudioBrandThemeSource): StudioBrandThemeProperties {
  const theme = getStudioBrandTheme(source);

  return {
    "--studio-client-accent": theme.primary,
    "--studio-client-accent-soft": theme.soft,
    "--studio-client-accent-ink": theme.ink,
    "--studio-client-accent-contrast": theme.primaryContrast,
    "--studio-client-accent-ink-contrast": theme.inkContrast,
  };
}
