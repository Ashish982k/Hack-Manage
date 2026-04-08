import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  async rewrites() {
    return [
      {
        source: "/api/auth/:path*",
        destination: "http://localhost:5000/api/auth/:path*",
      },
    ];
  },
};

export default nextConfig;
