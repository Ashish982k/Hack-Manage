import crypto from "crypto";
import { and, eq } from "drizzle-orm";
import { db } from "../../src/db/index.js";
import { hackathonParticipants, teamMembers } from "../../src/db/schema.js";
export const findMembershipForHackathon = async (userId, hackathonId) => {
    const memberships = await db.query.teamMembers.findMany({
        where: eq(teamMembers.userId, userId),
        with: { team: true },
    });
    return memberships.find((member) => member.team.hackathonId === hackathonId) || null;
};
export const ensureParticipant = async (hackathonId, userId) => {
    const existing = await db.query.hackathonParticipants.findFirst({
        where: and(eq(hackathonParticipants.hackathonId, hackathonId), eq(hackathonParticipants.userId, userId)),
    });
    if (existing)
        return existing;
    const participant = {
        id: crypto.randomUUID(),
        hackathonId,
        userId,
    };
    await db.insert(hackathonParticipants).values(participant);
    return participant;
};
