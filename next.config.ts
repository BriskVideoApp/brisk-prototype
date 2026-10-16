import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  webpack: (config) => {
    config.watchOptions = {
      ...config.watchOptions,
      ignored: [
        "**/.git/**",
        "**/.next-stale-active-videos/**",
        "**/.next-stale-active-videos-2/**",
        // Watch shared React components, while skipping the large design exports.
        "**/Brisk DS/src/imports/**",
        "**/Brisk DS/src/BriskDesignSystem/**",
        "**/Brisk DS/guidelines/**",
        "**/Brisk Visuals/**",
        "**/Docs/**",
        "**/node_modules/**",
      ],
    };

    return config;
  },
};

export default nextConfig;
