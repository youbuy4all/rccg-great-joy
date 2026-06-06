import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Allow images from Supabase storage and Cloudinary
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "*.supabase.co" },
      { protocol: "https", hostname: "res.cloudinary.com" },
    ],
  },
  // Ensure Prisma works in serverless environment
  serverExternalPackages: ["@prisma/client", "bcryptjs"],
};

export default nextConfig;
