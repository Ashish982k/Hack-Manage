import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "../src/db/index.js";
import { openAPI } from "better-auth/plugins";
import * as schema from "../src/db/schema.js";
import "dotenv/config";

const serverUrl = process.env.BETTER_AUTH_URL!;
const appUrl = process.env.FRONTEND_URL!;

if (!serverUrl || !appUrl) {
  throw new Error("BETTER_AUTH_URL or FRONTEND_URL missing");
}

export const auth = betterAuth({
  baseURL: serverUrl,

  secret: process.env.BETTER_AUTH_SECRET!,

  trustedOrigins: [serverUrl, appUrl],
  onErrorURL: `${appUrl}/login`,

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
    expiresIn: 60 * 60 * 24 * 7, // 7 days
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
