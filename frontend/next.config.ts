import type { NextConfig } from "next";

const normalizeUrl = (value: string | undefined) =>
  value?.trim().replace(/\/+$/, "");

const frontendUrl = normalizeUrl(process.env.FRONTEND_URL);
const backendUrl = normalizeUrl(process.env.BACKEND_URL);

if (!frontendUrl || !backendUrl) {
  throw new Error(
    "Missing FRONTEND_URL or BACKEND_URL in frontend/.env. Both are required.",
  );
}

const nextConfig: NextConfig = {
  reactCompiler: true,
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
