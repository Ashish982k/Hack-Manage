import type { Context } from "hono";
import { db } from "../src/db/index";
import { hackathons, teamMembers } from "../src/db/schema";
import { eq } from "drizzle-orm";

export const getMember = async (c: Context) => {
  const hackathonId = c.req.param("id");

  if (!hackathonId) {
    return c.json({ message: "Hackathon ID is required" }, 400);
  }

  const user = c.get("user");
  if (!user) {
    return c.json({ message: "Unauthorized" }, 401);
  }

  const userId = user.id;

  const valid = await db
    .select()
    .from(hackathons)
    .where(eq(hackathons.id, hackathonId));

  if (!valid || valid.length === 0) {
    return c.json({ message: "Hackathon not found" }, 404);
  }

  const memberships = await db.query.teamMembers.findMany({
    where: eq(teamMembers.userId, userId),
    with: {
      team: true,
    },
  });

 
  const teamMember = memberships.find(
    (m) => m.team.hackathonId === hackathonId
  );

  
  if (!teamMember) {
    return c.json(null);
  }

  const members = await db.query.teamMembers.findMany({
    where: eq(teamMembers.teamId, teamMember.team.id),
    with: {
      user: true,
    },
  });

  return c.json({
    teamId: teamMember.team.id,
    name: teamMember.team.name,
    leaderId: teamMember.team.leaderId,
    members,
  });
}