import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      // Backend-served uploads (movie posters, theater images) — local dev.
      { protocol: "http", hostname: "127.0.0.1", port: "5050" },
      { protocol: "http", hostname: "localhost", port: "5050" },
      // Placeholder poster fallback (see lib/utils/posterUrl.ts).
      { protocol: "https", hostname: "images.unsplash.com" },
    ],
  },
};

export default nextConfig;
