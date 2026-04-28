import { Hono } from "hono";
import { cors } from "hono/cors";
import { eq } from "drizzle-orm";

import { auth } from "../lib/auth.js";
import { db } from "./db/index.js";
import { user } from "./db/schema.js";
import Teams from "../routers/team.js";
import Hack from "../routers/hack.js";

const app = new Hono();

const frontendUrl = process.env.FRONTEND_URL as string;
app.use(
  "*",
  cors({
    origin: frontendUrl,
    credentials: true,
  }),
);

app.on(["POST", "GET"], "/api/auth/*", (c) => auth.handler(c.req.raw));
app.get("/", (c) => {
  return c.text("Running");
});
app.route("/hackathons", Hack);
app.route("/teams", Teams);

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
