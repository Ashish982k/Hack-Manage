import { createAuthClient } from "better-auth/react";

const frontendOrigin =
  typeof window !== "undefined"
    ? window.location.origin
    : (process.env.NEXT_PUBLIC_FRONTEND_URL ?? "http://localhost:3000");

export const authClient = createAuthClient({
  baseURL: `${frontendOrigin}/api/auth`,
});
