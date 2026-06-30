import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  webpack: (config) => {
    config.watchOptions = {
      ...config.watchOptions,
      ignored: [
        "**/.git/**",
        "**/.next-stale-active-videos/**",
        "**/.next-stale-active-videos-2/**",
        "**/Brisk DS/**",
        "**/Brisk Visuals/**",
        "**/Docs/**",
        "**/node_modules/**",
      ],
    };

    return config;
  },
};

export default nextConfig;
