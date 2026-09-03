import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  /* config options here */
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
  // The Next.js dev-tools badge (nextjs-portal) sits bottom-left and would
  // swallow pointer events over the game canvas — disabled for a clean
  // full-screen game viewport.
  devIndicators: false,
};

export default nextConfig;
