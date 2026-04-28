import { serve } from "@hono/node-server";
import dotenv from "dotenv";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { eq } from "drizzle-orm";
dotenv.config();
import { auth } from "../lib/auth.js";
import { db } from "./db/index.js";
import { user } from "./db/schema.js";
import Teams from "../routers/team.js";
import Hack from "../routers/hack.js";
const app = new Hono();
app.use("*", cors({
    origin: "http://localhost:3000",
    allowMethods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization"],
    credentials: true,
}));
app.on(["POST", "GET"], "/api/auth/*", (c) => auth.handler(c.req.raw));
app.get("/", (c) => {
    return c.text("Running");
});
app.route("/hackathons", Hack);
app.route("/teams", Teams);
app.get("/users/check", async (c) => {
    const email = c.req.query("email");
    if (!email)
        return c.json({ exists: false });
    const [foundUser] = await db
        .select()
        .from(user)
        .where(eq(user.email, email))
        .limit(1);
    return c.json({ exists: !!foundUser });
});
dotenv.config();
serve({
    fetch: app.fetch,
    port: 5000,
}, (info) => {
    console.log(`Server is running on http://localhost:${info.port}`);
});
