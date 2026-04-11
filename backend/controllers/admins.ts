
import type { Context } from "hono";
import { db } from "../src/db";
import {
  evaluations,
  hackathonParticipants,
  hackathonRoles,
  hackathons,
  problemStatements,
  shortlistedTeams      ,
  stages,
  submissions,
  teamMembers,
  teams,
} from "../src/db/schema";
import { and, eq, inArray } from "drizzle-orm";

export const deleteHackathon = async (c: Context) => {
  const id = c.req.param("id");
  const currentUser = c.get("user");

  if (!id) {
    return c.json({ message: "Hackathon id is required" }, 400);
  }

  try {
    const hackathon = await db.query.hackathons.findFirst({
      where: eq(hackathons.id, id),
    });

    if (!hackathon) {
      return c.json({ message: "Not found" }, 404);
    }

    const isCreator = hackathon.createdBy === currentUser.id;
    let isAdmin = false;

    if (!isCreator) {
      const role = await db.query.hackathonRoles.findFirst({
        where: and(
          eq(hackathonRoles.hackathonId, id),
          eq(hackathonRoles.userId, currentUser.id),
          eq(hackathonRoles.role, "admin"),
        ),
      });
      isAdmin = Boolean(role);
    }

    if (!isCreator && !isAdmin) {
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
}

