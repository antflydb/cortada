import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  serverExternalPackages: ["@antfly/sdk"],
  turbopack: { root: process.cwd() },
};

export default nextConfig;
