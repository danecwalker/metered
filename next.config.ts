import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  serverExternalPackages: ["pg", "js-tiktoken", "drizzle-orm"],
  allowedDevOrigins: ["192.168.1.116", "127.0.0.1", "localhost"],
  experimental: {
    serverActions: {
      allowedOrigins: ["192.168.1.116:3000", "localhost:3000", "127.0.0.1:3000"],
    },
  },
  async redirects() {
    return [{ source: "/compare", destination: "/stacks", permanent: true }];
  },
};

export default nextConfig;
