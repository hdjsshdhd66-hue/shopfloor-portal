import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Static export: the whole site is pre-rendered content with no server
  // features (no API routes, no dynamic data), so `next build` can emit
  // plain HTML/CSS/JS into out/ — deployable to GitHub Pages or any static
  // host, exactly like the previous single-file site.
  output: "export",
  images: {
    // next/image's on-demand optimization needs a server; static export has
    // none, so serve the logo/icon PNGs as-is (they're already small).
    unoptimized: true,
  },
};

export default nextConfig;
