import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  typescript: { ignoreBuildErrors: true },

  images: {
    remotePatterns: [
      { protocol: "https", hostname: "*.supabase.co" },
      { protocol: "https", hostname: "res.cloudinary.com" },
    ],
  },

  // Prevent Prisma and bcrypt from being webpack-bundled.
  // serverExternalPackages alone is unreliable in Next 16 + webpack;
  // the webpack() function below enforces it explicitly.
  serverExternalPackages: ["@prisma/client", "bcryptjs"],

  env: {
    NEXT_TELEMETRY_DISABLED: "1",
  },

  webpack(config, { isServer }) {
    // Fix @/ path alias so webpack always resolves it to src/
    config.resolve.alias = {
      ...config.resolve.alias,
      "@": path.resolve(process.cwd(), "src"),
    };

    // Explicitly keep Prisma external so Node.js (not webpack) loads it.
    // Without this, webpack bundles @prisma/client and the native query-engine
    // .node binary can't be found inside the bundle → "did not initialize yet".
    if (isServer) {
      const externals = Array.isArray(config.externals)
        ? config.externals
        : config.externals
        ? [config.externals]
        : [];
      config.externals = [
        ...externals,
        "@prisma/client",
        ".prisma/client",
      ];
    }

    return config;
  },
};

export default nextConfig;
