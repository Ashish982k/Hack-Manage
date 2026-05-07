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
      // Proxy Better Auth — keeps session cookies on the same origin
      {
        source: "/api/auth/:path*",
        destination: `${backendUrl}/api/auth/:path*`,
      },
      // Proxy backend REST API under /api/* to avoid clashing with Next.js
      // page routes (e.g. the /hackathons page takes priority over a /hackathons
      // rewrite, so we use /api/hackathons → backend /hackathons instead).
      {
        source: "/api/hackathons/:path*",
        destination: `${backendUrl}/hackathons/:path*`,
      },
      {
        source: "/api/hackathons",
        destination: `${backendUrl}/hackathons`,
      },
      {
        source: "/api/teams/:path*",
        destination: `${backendUrl}/teams/:path*`,
      },
      {
        source: "/api/teams",
        destination: `${backendUrl}/teams`,
      },
      {
        source: "/api/users/:path*",
        destination: `${backendUrl}/users/:path*`,
      },
    ];
  },
};

export default nextConfig;
