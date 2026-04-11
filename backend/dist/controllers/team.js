import crypto from "crypto";
import { and, desc, eq } from "drizzle-orm";
import { db } from "../src/db";
import { hackathonParticipants, hackathonRoles, teamMembers, teams, hackathons, submissions, user, } from "../src/db/schema";
const findMembershipForHackathon = async (userId, hackathonId) => {
    const memberships = await db.query.teamMembers.findMany({
        where: eq(teamMembers.userId, userId),
        with: { team: true },
    });
    return memberships.find((m) => m.team.hackathonId === hackathonId) || null;
};
const ensureParticipant = async (hackathonId, userId) => {
    const existing = await db.query.hackathonParticipants.findFirst({
        where: and(eq(hackathonParticipants.hackathonId, hackathonId), eq(hackathonParticipants.userId, userId)),
    });
    if (existing)
        return existing;
    const newParticipant = {
        id: crypto.randomUUID(),
        hackathonId,
        userId,
    };
    await db.insert(hackathonParticipants).values(newParticipant);
    return newParticipant;
};
export const getTeamDetails = async (c) => {
    try {
        const teamId = c.req.param("id");
        const currentUser = c.get("user");
        if (!teamId)
            return c.json({ message: "Team not found" }, 404);
        if (!currentUser?.id)
            return c.json({ message: "Unauthorized" }, 401);
        const team = await db.query.teams.findFirst({
            where: eq(teams.id, teamId),
        });
        if (!team)
            return c.json({ message: "Team not found" }, 404);
        const hackathon = await db.query.hackathons.findFirst({
            where: eq(hackathons.id, team.hackathonId),
        });
        if (!hackathon)
            return c.json({ message: "Hackathon not found" }, 404);
        const role = await db.query.hackathonRoles.findFirst({
            where: and(eq(hackathonRoles.hackathonId, team.hackathonId), eq(hackathonRoles.userId, currentUser.id)),
        });
        const isCreator = hackathon.createdBy === currentUser.id;
        const isJudgeOrAdmin = role?.role === "judge" || role?.role === "admin";
        const isTeamMember = Boolean(await db.query.teamMembers.findFirst({
            where: and(eq(teamMembers.teamId, teamId), eq(teamMembers.userId, currentUser.id)),
        }));
        if (!isCreator && !isJudgeOrAdmin && !isTeamMember) {
            return c.json({ message: "Unauthorized" }, 403);
        }
        const [members, latestSubmissionRows] = await Promise.all([
            db.query.teamMembers.findMany({
                where: eq(teamMembers.teamId, teamId),
                with: { user: true },
            }),
            db
                .select()
                .from(submissions)
                .where(eq(submissions.teamId, teamId))
                .orderBy(desc(submissions.submittedAt))
                .limit(1),
        ]);
        const latestSubmission = latestSubmissionRows[0] ?? null;
        return c.json({
            team: {
                id: team.id,
                name: team.name,
                hackathonId: team.hackathonId,
                leaderId: team.leaderId,
                members: members.map((member) => ({
                    id: member.id,
                    userId: member.userId,
                    status: member.status,
                    user: member.user
                        ? {
                            id: member.user.id,
                            name: member.user.name,
                            email: member.user.email,
                        }
                        : null,
                })),
                submission: latestSubmission,
            },
        });
    }
    catch {
        return c.json({ message: "Something went wrong" }, 500);
    }
};
export const updateTeam = async (c) => {
    try {
        const teamId = c.req.param("id");
        const userId = c.get("user").id;
        const { name } = await c.req.json();
        if (!teamId)
            return c.json({ message: "Team not found" }, 404);
        if (!name?.trim())
            return c.json({ message: "Team name required" }, 400);
        const team = await db.query.teams.findFirst({
            where: eq(teams.id, teamId),
        });
        if (!team)
            return c.json({ message: "Team not found" }, 404);
        if (team.leaderId !== userId)
            return c.json({ message: "Only leader can rename" }, 403);
        await db.update(teams).set({ name }).where(eq(teams.id, teamId));
        return c.json({ message: "Updated", team: { ...team, name } });
    }
    catch {
        return c.json({ message: "Something went wrong" }, 500);
    }
};
export const addTeamMember = async (c) => {
    try {
        const teamId = c.req.param("teamId");
        const userId = c.get("user").id;
        const { email } = await c.req.json();
        if (!teamId)
            return c.json({ message: "Team not found" }, 404);
        if (!email)
            return c.json({ message: "Email required" }, 400);
        const team = await db.query.teams.findFirst({
            where: eq(teams.id, teamId),
        });
        if (!team)
            return c.json({ message: "Team not found" }, 404);
        if (team.leaderId !== userId)
            return c.json({ message: "Only leader can add members" }, 403);
        const userToAdd = await db.query.user.findFirst({
            where: eq(user.email, email),
        });
        if (!userToAdd)
            return c.json({ message: "User not found" }, 400);
        if (userToAdd.id === team.leaderId)
            return c.json({ message: "Already leader" }, 409);
        const exists = await db.query.teamMembers.findFirst({
            where: and(eq(teamMembers.teamId, teamId), eq(teamMembers.userId, userToAdd.id)),
        });
        if (exists)
            return c.json({ message: "Already in team" }, 409);
        const inOtherTeam = await findMembershipForHackathon(userToAdd.id, team.hackathonId);
        if (inOtherTeam)
            return c.json({ message: "Already in another team" }, 409);
        await ensureParticipant(team.hackathonId, userToAdd.id);
        await db.insert(teamMembers).values({
            id: crypto.randomUUID(),
            teamId,
            userId: userToAdd.id,
            status: "pending",
        });
        return c.json({ message: "Invited" });
    }
    catch {
        return c.json({ message: "Something went wrong" }, 500);
    }
};
export const removeTeamMember = async (c) => {
    try {
        const teamId = c.req.param("teamId");
        const targetUserId = c.req.param("userId");
        const userId = c.get("user").id;
        if (!teamId || !targetUserId)
            return c.json({ message: "Not found" }, 404);
        const team = await db.query.teams.findFirst({
            where: eq(teams.id, teamId),
        });
        if (!team)
            return c.json({ message: "Team not found" }, 404);
        const member = await db.query.teamMembers.findFirst({
            where: and(eq(teamMembers.teamId, teamId), eq(teamMembers.userId, targetUserId)),
        });
        if (!member)
            return c.json({ message: "Member not found" }, 404);
        const isLeader = team.leaderId === userId;
        const isSelf = userId === targetUserId;
        if (!isLeader && !isSelf)
            return c.json({ message: "Unauthorized" }, 403);
        if (targetUserId === team.leaderId)
            return c.json({ message: "Cannot remove leader" }, 400);
        await db.delete(teamMembers).where(eq(teamMembers.id, member.id));
        return c.json({
            message: isSelf ? "Left team" : "Removed member",
        });
    }
    catch {
        return c.json({ message: "Something went wrong" }, 500);
    }
};
export const updateTeamMember = async (c) => {
    try {
        const teamId = c.req.param("teamId");
        const targetUserId = c.req.param("userId");
        const userId = c.get("user").id;
        const { action } = await c.req.json();
        if (!teamId || !targetUserId)
            return c.json({ message: "Not found" }, 404);
        if (!["approve", "reject"].includes(action))
            return c.json({ message: "Invalid action" }, 400);
        const team = await db.query.teams.findFirst({
            where: eq(teams.id, teamId),
        });
        if (!team)
            return c.json({ message: "Team not found" }, 404);
        if (team.leaderId !== userId)
            return c.json({ message: "Only leader allowed" }, 403);
        if (targetUserId === team.leaderId)
            return c.json({ message: "Cannot modify leader" }, 400);
        const member = await db.query.teamMembers.findFirst({
            where: and(eq(teamMembers.teamId, teamId), eq(teamMembers.userId, targetUserId)),
        });
        if (!member)
            return c.json({ message: "Member not found" }, 404);
        if (member.status !== "pending")
            return c.json({ message: "Already processed" }, 409);
        if (action === "approve") {
            await db
                .update(teamMembers)
                .set({ status: "approved" })
                .where(eq(teamMembers.id, member.id));
            return c.json({ message: "Approved" });
        }
        await db.delete(teamMembers).where(eq(teamMembers.id, member.id));
        return c.json({ message: "Rejected" });
    }
    catch {
        return c.json({ message: "Something went wrong" }, 500);
    }
};
export const createTeam = async (c) => {
    try {
        const userId = c.get("user").id;
        const { hackathonId, teamName, members = [] } = await c.req.json();
        if (!hackathonId || !teamName) {
            return c.json({ message: "Missing fields" }, 400);
        }
        const hackathon = await db.query.hackathons.findFirst({
            where: eq(hackathons.id, hackathonId),
        });
        if (!hackathon)
            return c.json({ message: "Invalid hackathon" }, 400);
        const participant = await ensureParticipant(hackathonId, userId);
        if (!participant)
            return c.json({ message: "Join hackathon first" }, 400);
        const already = await findMembershipForHackathon(userId, hackathonId);
        if (already)
            return c.json({ message: "Already in a team" }, 400);
        const teamId = crypto.randomUUID();
        // create team
        await db.insert(teams).values({
            id: teamId,
            hackathonId,
            name: teamName,
            leaderId: userId,
        });
        // add leader
        await db.insert(teamMembers).values({
            id: crypto.randomUUID(),
            teamId,
            userId,
            status: "approved",
        });
        // add members
        for (const email of members) {
            const u = await db.query.user.findFirst({
                where: eq(user.email, email),
            });
            if (!u || u.id === userId)
                continue;
            const inTeam = await findMembershipForHackathon(u.id, hackathonId);
            if (inTeam)
                continue;
            await ensureParticipant(hackathonId, u.id);
            await db.insert(teamMembers).values({
                id: crypto.randomUUID(),
                teamId,
                userId: u.id,
                status: "pending",
            });
        }
        return c.json({ message: "Team created", teamId });
    }
    catch {
        return c.json({ message: "Something went wrong" }, 500);
    }
};
