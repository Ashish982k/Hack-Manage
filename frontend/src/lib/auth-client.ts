import { createAuthClient } from "better-auth/react";
import { BACKEND_URL } from "@/api/client";

export const authClient = createAuthClient({
  baseURL: `${BACKEND_URL}/api/auth`,
});
