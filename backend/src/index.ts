import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { auth } from "../lib/auth";
import { cors } from "hono/cors";
import { authMiddleware } from "../middleware/auth.middleware";
import { writeFile } from "fs/promises";
import path from "path";
import { db } from "./db";
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
  createTeam,
  addTeamMember,
  getMember,
  joinHackathon,
  deleteUser,
  updateTeam,
  removeTeamMember,
  updateTeamMember,
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

app.post("/hackathons/:id/uploads", authMiddleware, upload);
app.get("/hackathons/:id/team", authMiddleware, getMember);
app.post("/teams", authMiddleware, createTeam);
app.patch("/teams/:id", authMiddleware, updateTeam);
app.post("/teams/:teamId/members", authMiddleware, addTeamMember);
app.patch("/teams/:teamId/members/:userId", authMiddleware, updateTeamMember);
app.delete("/teams/:teamId/members/:userId", authMiddleware, removeTeamMember);
app.get("/users/check", async (c) => {
  const email = c.req.query("email");

  if (!email) return c.json({ exists: false });

  const User = await db.query.user.findFirst({
    where: eq(user.email, email),
  });

  return c.json({ exists: !!User });
});

app.post("/hackathons", authMiddleware, newHackathon);
app.get("/hackathons", authMiddleware, async (c) => {
  try {
    const all = await db.select().from(hackathons);
    return c.json({
      hackathons: all,
    });
  } catch (err) {
    console.log(err);
    return c.json(
      {
        message: "Something went wrong",
      },
      500,
    );
  }
});

app.get("/hackathons/:id", authMiddleware, async (c) => {
  const id = c.req.param("id");
  try {
    const hackathon = await db.query.hackathons.findFirst({
      where: eq(hackathons.id, id),
    });
    if (!hackathon) return c.json({ message: "Not found" }, 404);

    const statements = await db
      .select()
      .from(problemStatements)
      .where(eq(problemStatements.hackathonId, id));

    return c.json({
      ...hackathon,
      problemStatements: statements.map((statement) => ({
        id: statement.id,
        title: statement.title,
        body: statement.description ?? statement.title,
      })),
    });
  } catch (err) {
    console.log(err);
    return c.json({ message: "Something went wrong" }, 500);
  }
});

app.delete("/hackathons/:id", authMiddleware, async (c) => {
  const id = c.req.param("id");
  const user = c.get("user");

  try {
    const hackathon = await db.query.hackathons.findFirst({
      where: eq(hackathons.id, id),
    });

    if (!hackathon) {
      return c.json({ message: "Not found" }, 404);
    }

    if (hackathon.createdBy !== user.id) {
      return c.json({ message: "Unauthorized" }, 403);
    }

    const teamIds = (
      await db
        .select({ id: teams.id })
        .from(teams)
        .where(eq(teams.hackathonId, id))
    ).map((t) => t.id);

    if (teamIds.length) {
      const submissionIds = (
        await db
          .select({ id: submissions.id })
          .from(submissions)
          .where(inArray(submissions.teamId, teamIds))
      ).map((s) => s.id);

      if (submissionIds.length) {
        await db
          .delete(evaluations)
          .where(inArray(evaluations.submissionId, submissionIds));

        await db
          .delete(submissions)
          .where(inArray(submissions.id, submissionIds));
      }

      await db.delete(teamMembers).where(inArray(teamMembers.teamId, teamIds));

      await db.delete(teams).where(inArray(teams.id, teamIds));
    }

    await Promise.all([
      db.delete(shortlistedTeams).where(eq(shortlistedTeams.hackathonId, id)),
      db
        .delete(hackathonParticipants)
        .where(eq(hackathonParticipants.hackathonId, id)),
      db.delete(stages).where(eq(stages.hackathonId, id)),
      db.delete(problemStatements).where(eq(problemStatements.hackathonId, id)),
    ]);

    await db.delete(hackathons).where(eq(hackathons.id, id));

    return c.json({ success: true });
  } catch (err) {
    console.error(err);
    return c.json({ message: "Something went wrong" }, 500);
  }
});

app.post("/hackathons/:id/join", authMiddleware, joinHackathon);
app.delete("/hackathons/:id/join", authMiddleware, deleteUser);

serve(
  {
    fetch: app.fetch,
    port: 5000,
  },
  (info) => {
    console.log(`Server is running on http://localhost:${info.port}`);
  },
);
