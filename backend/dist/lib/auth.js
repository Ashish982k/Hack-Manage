import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "../src/db/index.js";
import { openAPI } from "better-auth/plugins";
import * as schema from "../src/db/schema.js";
import dotenv from "dotenv";
dotenv.config();
// Better Auth must use the FRONTEND URL as its base
// That's where the browser sends auth requests (via the Next.js proxy)
// and where cookies get set.
const frontendUrl = process.env.FRONTEND_URL || "http://localhost:3000";
if (!frontendUrl) {
    throw new Error("FRONTEND_URL missing");
}
export const auth = betterAuth({
    // baseURL = where the browser sends auth requests (via the Next.js proxy)
    // This is ALWAYS the frontend URL, never the backend
    baseURL: frontendUrl,
    secret: process.env.BETTER_AUTH_SECRET,
    trustedOrigins: [frontendUrl],
    onErrorURL: `${frontendUrl}/login`,
    database: drizzleAdapter(db, {
        provider: "sqlite",
        schema,
    }),
    socialProviders: {
        google: {
            clientId: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
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
