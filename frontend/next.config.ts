import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Skip TypeScript type-checking during build (SWC handles transpilation)
  // 'typescript' in devDeps is not installed with NODE_ENV=production
  typescript: { ignoreBuildErrors: true },

  images: {
    remotePatterns: [
      { protocol: "https", hostname: "*.supabase.co" },
      { protocol: "https", hostname: "res.cloudinary.com" },
    ],
  },

  // Ensure Prisma and bcrypt work in serverless environment
  serverExternalPackages: ["@prisma/client", "bcryptjs"],

  // Disable telemetry
  env: {
    NEXT_TELEMETRY_DISABLED: "1",
  },
};

export default nextConfig;
