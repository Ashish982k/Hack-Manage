import type { NextConfig } from "next";

const frontendUrl = process.env.FRONTEND_URL!;
const backendUrl = process.env.BACKEND_URL!;

if (!frontendUrl || !backendUrl) {
  throw new Error(
    "Missing FRONTEND_URL or BACKEND_URL in frontend/.env. Both are required.",
  );
}

const nextConfig: NextConfig = {
  reactCompiler: true,
  images: {
    remotePatterns: [
      {
        protocol: "http",
        hostname: "localhost",
        port: "", // optional
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "avatars.githubusercontent.com",
        pathname: "/**",
      },
    ],
  },
  env: {
    NEXT_PUBLIC_FRONTEND_URL: frontendUrl,
    NEXT_PUBLIC_BACKEND_URL: backendUrl,
  },
  async rewrites() {
    return [
      {
        source: "/api/auth/:path*",
        destination: `${backendUrl}/api/auth/:path*`,
      },
    ];
  },
};

export default nextConfig;
