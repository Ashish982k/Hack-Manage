import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "../src/db/index";
import { openAPI } from "better-auth/plugins"
import * as schema from '../src/db/schema'
import "dotenv/config"


export const auth = betterAuth({
    database: drizzleAdapter(db, {
        provider: "sqlite",
        schema,
    }),
    emailAndPassword:{
        enabled: true,
    },
    socialProviders:{
        google:{
            clientId: process.env.GOOGLE_CLIENT_ID!,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
        },
        github:{
            clientId: process.env.GITHUB_CLIENT_ID!,
            clientSecret: process.env.GITHUB_CLIENT_SECRET!,
        }
    },
    trustedOrigins: ["http://localhost:3000"],
    plugins:[
        openAPI()
    ]
});