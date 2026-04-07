import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { auth } from "../lib/auth";
import { cors } from "hono/cors";
import { authMiddleware } from "../middleware/auth.middleware";
import { writeFile } from "fs/promises";
import path from "path";
import { db } from "./db";
import { teamMembers, submissions, hackathons, teams, user } from "./db/schema";
import { eq } from "drizzle-orm";
import { upload } from "../controllers/upload";
import { getMember } from "../controllers/getMembers";
import { createTeam } from "../controllers/createTeam";

const app = new Hono();
app.use(
  "*",
  cors({
    origin: "http://localhost:3000",
    allowMethods: ["GET", "POST", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  }),
);

app.on(["POST", "GET"], "/api/auth/*", (c) => auth.handler(c.req.raw));

app.get("/", (c) => {
  return c.text("Hello Hono!");
});

app.post("hackathons/:id/uploads", authMiddleware, upload);
app.get("/hackathons/:id/team", authMiddleware, getMember);
app.post("/teams", authMiddleware, createTeam);
app.get("/users/check", async (c) => {
  const email = c.req.query("email");

  if (!email) return c.json({ exists: false });

  const User = await db.query.user.findFirst({
    where: eq(user.email, email),
  });

  return c.json({ exists: !!User });
});

serve(
  {
    fetch: app.fetch,
    port: 5000,
  },
  (info) => {
    console.log(`Server is running on http://localhost:${info.port}`);
  },
);
