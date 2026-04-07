import { writeFile } from "fs/promises";
import path from "path";
import crypto from "crypto";
import { eq } from "drizzle-orm";
import { db } from "../src/db";
import {
  hackathons,
  submissions,
  teamMembers,
  teams,
  user,
} from "../src/db/schema";
import type { Context } from "hono";

export const createTeam = async (c: Context) => {
  try {
    const { hackathonId, teamName, members } = await c.req.json();
    const userId = c.get("user").id;

    if (!hackathonId || !teamName) {
      return c.json({ message: "Missing fields" }, 400);
    }

    const hackathon = await db.query.hackathons.findFirst({
      where: eq(hackathons.id, hackathonId),
    });

    if (!hackathon) {
      return c.json({ message: "Invalid Hackathon" }, 400);
    }

    const existingTeam = await db.query.teamMembers.findMany({
      where: eq(teamMembers.userId, userId),
      with: { team: true },
    });

    const already = existingTeam.some(
      (m) => m.team.hackathonId === hackathonId,
    );

    if (already) {
      return c.json({ message: "Already in a team for this hackathon" }, 400);
    }

    const teamId = crypto.randomUUID();

    await db.insert(teams).values({
      id: teamId,
      hackathonId,
      name: teamName,
      leaderId: userId,
    });

    await db.insert(teamMembers).values({
      id: crypto.randomUUID(),
      teamId,
      userId,
    });

    if (members && Array.isArray(members)) {
      for (const email of members) {
        const foundUser = await db.query.user.findFirst({
          where: eq(user.email, email),
        });

        if (!foundUser) {
          return c.json({ message: `User ${email} not found` }, 400);
        }

        if (foundUser.id === userId) continue;

        await db.insert(teamMembers).values({
          id: crypto.randomUUID(),
          teamId,
          userId: foundUser.id,
        });
      }
    }

    return c.json({
      message: "Team created successfully",
      teamId,
    });
  } catch (error) {
    console.error(error);
    return c.json({ message: "Something went wrong" }, 500);
  }
};
