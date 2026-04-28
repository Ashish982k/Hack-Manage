import { Hono } from "hono";
import { cors } from "hono/cors";
import { eq } from "drizzle-orm";
import { auth } from "../lib/auth.js";
import { db } from "./db/index.js";
import { user } from "./db/schema.js";
import Teams from "../routers/team.js";
import Hack from "../routers/hack.js";
const app = new Hono();
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
const allowedOrigins = Array.from(new Set([
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    ...parseOrigins(process.env.FRONTEND_URL),
    ...parseOrigins(process.env.NEXT_PUBLIC_FRONTEND_URL),
    ...parseOrigins(process.env.CLIENT_URL),
    ...parseOrigins(process.env.TRUSTED_ORIGINS),
]));
app.use("*", cors({
    origin: allowedOrigins,
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
export default app;
