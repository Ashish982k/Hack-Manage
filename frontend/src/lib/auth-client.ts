import { createAuthClient } from "better-auth/react";

// better-auth requires an *absolute* URL — relative paths aren't allowed.
// We use the FRONTEND's own origin so the Next.js rewrite proxy intercepts
// /api/auth/* and forwards it to the Hono backend internally.
// Cookies are then set on localhost:3000 (same origin) — no cross-site issues.
const frontendUrl =
  process.env.NEXT_PUBLIC_FRONTEND_URL || "http://localhost:3000";

export const authClient = createAuthClient({
  baseURL: `${frontendUrl}/api/auth`,
});
