import { Hono } from "hono";
import { authMiddleware } from "../middleware/auth.middleware";
import { db } from "../src/db";
import {
  hackathons,
  problemStatements,
  teams,
  submissions,
  teamMembers,
  shortlistedTeams,
  hackathonParticipants,
  stages,
  evaluations,
  user,
} from "../src/db/schema";
import { eq, inArray } from "drizzle-orm";

import {
  upload,
  newHackathon,
  getMember,
  joinHackathon,
  deleteUser,
} from "../controllers/Hackathon";


const Hack = new Hono();

Hack.use("*", authMiddleware);
Hack.post("/:id/uploads", authMiddleware, upload);
Hack.get("/:id/team", authMiddleware, getMember);

Hack.post("/", authMiddleware, newHackathon);
Hack.get("/", authMiddleware, async (c) => {
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

Hack.get("/:id", authMiddleware, async (c) => {
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

Hack.delete("/:id", authMiddleware, async (c) => {
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

Hack.post("/:id/join", authMiddleware, joinHackathon);
Hack.delete("/:id/join", authMiddleware, deleteUser);


export default Hack;
