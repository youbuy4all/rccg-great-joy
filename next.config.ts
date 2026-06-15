import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  typescript: { ignoreBuildErrors: true },
  eslint:     { ignoreDuringBuilds: true },

  images: {
    remotePatterns: [
      { protocol: "https", hostname: "*.supabase.co" },
      { protocol: "https", hostname: "res.cloudinary.com" },
    ],
  },

  serverExternalPackages: ["@prisma/client", "bcryptjs"],

  env: {
    NEXT_TELEMETRY_DISABLED: "1",
  },

  // Explicit webpack alias so @/ always resolves to src/ regardless of
  // how Next.js applies tsconfig paths (fixes "Module not found: @/lib/utils"
  // and "@/lib/api" errors on Vercel with webpack bundler)
  webpack(config) {
    config.resolve.alias = {
      ...config.resolve.alias,
      "@": path.resolve(process.cwd(), "src"),
    };
    return config;
  },
};

export default nextConfig;
