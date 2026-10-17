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
  /*
   * The social cards read their two fonts from `assets/fonts` at runtime, so the
   * standalone image — whose whole job is to trace only what the app imports —
   * has to be told to carry them. Without this the Docker build serves a 500 for
   * every link preview while the same code works on Vercel. A file read is
   * invisible to the tracer in a way an `import` is not.
   */
  outputFileTracingIncludes: {
    "/*": ["./assets/fonts/**/*"],
  },
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
