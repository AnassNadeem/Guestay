import path from "path";
import { fileURLToPath } from "url";
import { withSentryConfig } from "@sentry/nextjs";
import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const emptyTransformer = path.resolve(__dirname, "stubs/empty-code-transformer.js");

/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    formats: ["image/avif", "image/webp"],
    remotePatterns: [
      {
        protocol: "https",
        hostname: "qxmvxxylsyhatrgowfcu.supabase.co",
      },
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
    ],
  },
  // Keep Sentry's APM WASM out of the OpenNext/Workers server bundle.
  serverExternalPackages: ["@apm-js-collab/code-transformer"],
  turbopack: {
    resolveAlias: {
      "@apm-js-collab/code-transformer": "./stubs/empty-code-transformer.js",
    },
  },
  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      "@apm-js-collab/code-transformer": emptyTransformer,
    };
    return config;
  },
};

export default withSentryConfig(nextConfig, {
  org: "anas-4w",
  project: "javascript-nextjs",
  silent: !process.env.CI,
  // Smaller deploy artifact on Workers free/paid size limits
  widenClientFileUpload: false,
  webpack: {
    automaticVercelMonitors: false,
    treeshake: {
      removeDebugLogging: true,
    },
  },
});

// Enables Cloudflare bindings during `next dev` when using OpenNext.
initOpenNextCloudflareForDev();
