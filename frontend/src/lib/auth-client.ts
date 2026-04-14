import { createAuthClient } from "better-auth/react";
import { BACKEND_URL } from "@/api/client";

const frontendUrl = process.env.NEXT_PUBLIC_FRONTEND_URL?.trim();
const authBaseUrl = frontendUrl ? frontendUrl.replace(/\/+$/, "") : BACKEND_URL;

export const authClient = createAuthClient({
  baseURL: `${authBaseUrl}/api/auth`,
});
