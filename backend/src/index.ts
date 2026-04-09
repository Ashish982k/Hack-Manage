import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { auth } from "../lib/auth";
import { cors } from "hono/cors";
import { authMiddleware } from "../middleware/auth.middleware";
import { writeFile } from "fs/promises";
import path from "path";
import { db } from "./db";
import Teams from "../routers/team";
import Hack from "../routers/hack";
import {
  teamMembers,
  hackathonParticipants,
  submissions,
  hackathons,
  teams,
  user,
  stages,
  problemStatements,
  shortlistedTeams,
  evaluations,
} from "./db/schema";
import { eq, inArray } from "drizzle-orm";
import {
  upload,
  newHackathon,
  getMember,
  joinHackathon,
  deleteUser,
  
} from "../controllers/Hackathon";

import { serveStatic } from "@hono/node-server/serve-static";

const app = new Hono();
app.use(
  "*",
  cors({
    origin: "http://localhost:3000",
    allowMethods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  }),
);
app.use(
  "/images/*",
  serveStatic({
    root: "./",
  }),
);
app.on(["POST", "GET"], "/api/auth/*", (c) => auth.handler(c.req.raw));


//Route for hackathon
app.route("/hackathons", Hack);
//Route for teams
app.route("/teams", Teams);
//Check for valid email
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
