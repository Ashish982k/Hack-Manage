import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "../src/db/index.js";
import { openAPI } from "better-auth/plugins";
import * as schema from "../src/db/schema.js";
import dotenv from "dotenv";
dotenv.config();
const serverUrl = "http://localhost:5000";
const frontendUrl = "http://localhost:3000";
if (!serverUrl) {
    throw new Error("BETTER_AUTH_URL (or BACKEND_URL) missing");
}
export const auth = betterAuth({
    baseURL: "http://localhost:5000",
    secret: process.env.BETTER_AUTH_SECRET,
    trustedOrigins: [serverUrl, frontendUrl],
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
