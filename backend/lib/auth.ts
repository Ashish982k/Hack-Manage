import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "../src/db/index.js";
import { openAPI } from "better-auth/plugins";
import * as schema from "../src/db/schema.js";
import dotenv from "dotenv";
dotenv.config();

// The browser talks to the frontend (Next.js proxy) which forwards to this
// backend internally. So Better Auth must treat the FRONTEND URL as its base —
// that's where cookies get set.
const frontendUrl = process.env.FRONTEND_URL || "http://localhost:3000";
const serverUrl = process.env.BETTER_AUTH_URL || "http://localhost:5000";

if (!serverUrl) {
  throw new Error("BETTER_AUTH_URL (or BACKEND_URL) missing");
}

export const auth = betterAuth({
  // baseURL = where the browser sends auth requests (via the Next.js proxy)
  baseURL: frontendUrl,

  secret: process.env.BETTER_AUTH_SECRET!,

  trustedOrigins: [frontendUrl, serverUrl],
  onErrorURL: `${frontendUrl}/login`,

  database: drizzleAdapter(db, {
    provider: "sqlite",
    schema,
  }),

  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    },
  },

  session: {
    expiresIn: 60 * 60 * 24 * 7,
    updateAge: 60 * 60 * 24,
    cookieCache: {
      enabled: true,
      maxAge: 300,
    },
  },

  advanced: {
    useSecureCookies: process.env.NODE_ENV === "production",
    crossSubDomainCookies: {
      enabled: false,
    },
  },

  emailAndPassword: {
    enabled: false,
  },

  debug: true,
});

