import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "../src/db/index.js";
import { openAPI } from "better-auth/plugins";
import * as schema from "../src/db/schema.js";
import "dotenv/config";
const normalizeOrigin = (value) => {
    if (!value)
        return null;
    const trimmed = value.trim();
    if (!trimmed)
        return null;
    try {
        return new URL(trimmed).origin;
    }
    catch {
        return null;
    }
};
const parseOrigins = (value) => (value ?? "")
    .split(",")
    .map((origin) => normalizeOrigin(origin))
    .filter((origin) => Boolean(origin));
const trustedOrigins = Array.from(new Set([
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    ...parseOrigins(process.env.FRONTEND_URL),
    ...parseOrigins(process.env.NEXT_PUBLIC_FRONTEND_URL),
    ...parseOrigins(process.env.CLIENT_URL),
    ...parseOrigins(process.env.TRUSTED_ORIGINS),
]));
export const auth = betterAuth({
    database: drizzleAdapter(db, {
        provider: "sqlite",
        schema,
    }),
    emailAndPassword: {
        enabled: true,
    },
    socialProviders: {
        google: {
            clientId: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        },
        github: {
            clientId: process.env.GITHUB_CLIENT_ID,
            clientSecret: process.env.GITHUB_CLIENT_SECRET,
        },
    },
    trustedOrigins,
    plugins: [openAPI()],
});
