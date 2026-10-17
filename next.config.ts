import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /*
   * `standalone` is the minimal server the Dockerfile ships — it traces the
   * files the app actually imports instead of copying node_modules wholesale.
   * Vercel builds the app itself and does not need it, so it stays opt-in
   * rather than on for every build: turn it on with the env var the Dockerfile
   * sets. See docs/self-hosting.md.
   */
  output: process.env.NEXT_OUTPUT_STANDALONE === "true" ? "standalone" : undefined,
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
