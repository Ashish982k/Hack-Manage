import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { auth } from "../lib/auth";
import { cors } from "hono/cors";
import { db } from "./db";
import Teams from "../routers/team";
import Hack from "../routers/hack";
import { user } from "./db/schema";
import { eq } from "drizzle-orm";
import dotenv from "dotenv";
dotenv.config();
import { serveStatic } from "@hono/node-server/serve-static";
const app = new Hono();
app.use("*", cors({
    origin: "http://localhost:3000",
    allowMethods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization"],
    credentials: true,
}));
app.use("/images/*", serveStatic({
    root: "./",
}));
app.on(["POST", "GET"], "/api/auth/*", (c) => auth.handler(c.req.raw));
// Hackathon routes
app.route("/hackathons", Hack);
// Team routes
app.route("/teams", Teams);
// Check if email exists
app.get("/users/check", async (c) => {
    const email = c.req.query("email");
    if (!email)
        return c.json({ exists: false });
    const User = await db.query.user.findFirst({
        where: eq(user.email, email),
    });
    return c.json({ exists: !!User });
});
serve({
    fetch: app.fetch,
    port: 5000,
}, (info) => {
    console.log(`Server is running on http://localhost:${info.port}`);
});
