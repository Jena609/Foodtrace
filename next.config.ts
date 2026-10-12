import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  devIndicators: false,
  poweredByHeader: false,
  reactStrictMode: true,
  serverExternalPackages: ["@prisma/adapter-libsql", "@libsql/client", "libsql"],
  outputFileTracingIncludes: {
    "/api/**": ["./prisma/migrations/**/*"],
  },
  webpack: (config) => {
    config.resolve.alias = {
      ...(config.resolve.alias ?? {}),
      // The wagmi connector barrel also loads Coinbase and Base Account, which
      // require optional @x402 packages FoodTrace does not use.
      "wagmi/connectors$": path.join(process.cwd(), "lib/wallet/connector-entry.ts"),
      "pino-pretty": path.join(process.cwd(), "lib/wallet/pino-pretty-stub.js"),
    };
    return config;
  },
};

export default nextConfig;
