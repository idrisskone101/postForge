import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["@prisma/client", "satori"],
  outputFileTracingIncludes: {
    "/api/slideshows/overlay": ["./src/lib/slideshow/fonts/**/*"],
    "/api/slideshows/[id]/export": ["./src/lib/slideshow/fonts/**/*"],
  },
};

export default nextConfig;
