import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["@libsql/client", "js-tiktoken", "drizzle-orm"],
  allowedDevOrigins: ["192.168.1.116"],
  experimental: {
    serverActions: {
      allowedOrigins: ["192.168.1.116:3000", "localhost:3000"],
    },
  },
};

export default nextConfig;
