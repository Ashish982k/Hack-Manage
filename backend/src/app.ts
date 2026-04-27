import { Hono } from "hono";
import { cors } from "hono/cors";
import { eq } from "drizzle-orm";

import { auth } from "../lib/auth";
import { db } from "./db";
import { user } from "./db/schema";
import Teams from "../routers/team";
import Hack from "../routers/hack";

const app = new Hono();

const frontendUrl =
  process.env.CLIENT_URL ??
  "http://localhost:3000";

app.use(
  "*",
  cors({
    origin: frontendUrl,
    allowMethods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  }),
);

app.on(["POST", "GET"], "/api/auth/*", (c) => auth.handler(c.req.raw));

app.route("/hackathons", Hack);
app.route("/teams", Teams);
app.get("/", (c) => {
  return c.text("Hono on Vercel working");
});

app.get("/users/check", async (c) => {
  const email = c.req.query("email");

  if (!email) return c.json({ exists: false });

  const [foundUser] = await db
    .select()
    .from(user)
    .where(eq(user.email, email))
    .limit(1);

  return c.json({ exists: !!foundUser });
});

export default app;

