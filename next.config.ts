import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  watchOptions: {
    pollIntervalMs: 1000,
  },
  async redirects() {
    return [
      {
        source: "/models",
        destination: "/pipelines",
        permanent: true,
      },
      {
        source: "/models/:path*",
        destination: "/pipelines",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
