import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  serverExternalPackages: ["pg", "js-tiktoken", "drizzle-orm", "@opencode-ai/models"],
  allowedDevOrigins: ["192.168.1.116", "127.0.0.1", "localhost"],
  experimental: {
    serverActions: {
      allowedOrigins: [
        "localhost:3000",
        "127.0.0.1:3000",
        "192.168.1.116:3000",
        "metered.danecwalker.com",
      ],
      bodySizeLimit: "4mb",
    },
  },
  async redirects() {
    return [{ source: "/compare", destination: "/stacks", permanent: true }];
  },
};

export default nextConfig;
