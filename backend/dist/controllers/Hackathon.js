import crypto from "crypto";
import { and, desc, eq, sql } from "drizzle-orm";
import { db } from "../src/db";
import { hackathons, hackathonParticipants, hackathonRoles, hackathonSchedules, stages, submissions, teamMembers, } from "../src/db/schema";
const isHackathonAdmin = async (hackathonId, userId, createdBy) => {
    if (createdBy === userId)
        return true;
    const role = await db.query.hackathonRoles.findFirst({
        where: and(eq(hackathonRoles.hackathonId, hackathonId), eq(hackathonRoles.userId, userId), eq(hackathonRoles.role, "admin")),
    });
    return !!role;
};
const isHackathonJudge = async (hackathonId, userId) => {
    const role = await db.query.hackathonRoles.findFirst({
        where: and(eq(hackathonRoles.hackathonId, hackathonId), eq(hackathonRoles.userId, userId), eq(hackathonRoles.role, "judge")),
    });
    return !!role;
};
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
const getActiveSubmissionStage = async (hackathonId) => {
    const now = new Date().toISOString();
    return db.query.stages.findFirst({
        where: and(eq(stages.hackathonId, hackathonId), sql `${stages.startTime} <= ${now}`, sql `${stages.endTime} >= ${now}`),
    });
};
export const upload = async (c) => {
    try {
        const hackathonId = c.req.param("id");
        const user = c.get("user");
        if (!hackathonId || !user) {
            return c.json({ message: "Invalid request" }, 400);
        }
        const hackathon = await db.query.hackathons.findFirst({
            where: eq(hackathons.id, hackathonId),
        });
        if (!hackathon) {
            return c.json({ message: "Hackathon not found" }, 404);
        }
        const isAdmin = await isHackathonAdmin(hackathonId, user.id, hackathon.createdBy);
        if (isAdmin) {
            return c.json({ message: "Admins cannot submit" }, 403);
        }
        const { driveUrl, githubUrl, problemStatementId } = await c.req.json();
        if (!driveUrl) {
            return c.json({ message: "Drive URL is required" }, 400);
        }
        const membership = await findMembershipForHackathon(user.id, hackathonId);
        if (!membership) {
            return c.json({ message: "You are not in a team" }, 400);
        }
        const activeStage = await getActiveSubmissionStage(hackathonId);
        if (!activeStage || activeStage.type !== "SUBMISSION") {
            return c.json({ message: "Submission not allowed right now" }, 400);
        }
        if (!problemStatementId) {
            return c.json({ message: "Problem statement is required" }, 400);
        }
        const existing = await db.query.submissions.findFirst({
            where: and(eq(submissions.teamId, membership.team.id), eq(submissions.stageId, activeStage.id)),
        });
        const now = new Date().toISOString();
        const data = {
            pptUrl: driveUrl,
            githubUrl,
            problemStatementId,
            submittedAt: now,
        };
        if (existing) {
            await db.update(submissions).set(data).where(eq(submissions.id, existing.id));
            return c.json({ message: "Submission updated" });
        }
        await db.insert(submissions).values({
            id: crypto.randomUUID(),
            teamId: membership.team.id,
            stageId: activeStage.id,
            ...data,
        });
        return c.json({ message: "Submission created" });
    }
    catch (err) {
        console.error(err);
        return c.json({ message: "Error" }, 500);
    }
};
export const newHackathon = async (c) => {
    try {
        const user = c.get("user");
        if (!user)
            return c.json({ message: "Unauthorized" }, 401);
        const data = await c.req.parseBody();
        const hackathonId = crypto.randomUUID();
        await db.insert(hackathons).values({
            id: hackathonId,
            title: data.title,
            description: data.description,
            startDate: data.startDate,
            endDate: data.endDate,
            registrationDeadline: data.registrationDeadline,
            location: data.location,
            createdBy: user.id,
        });
        return c.json({ message: "Created", hackathonId });
    }
    catch (err) {
        console.error(err);
        return c.json({ message: "Error" }, 500);
    }
};
export const saveHackathonSchedules = async (c) => {
    try {
        const hackathonId = c.req.param("id");
        const user = c.get("user");
        if (!hackathonId || !user) {
            return c.json({ message: "Invalid request" }, 400);
        }
        const { schedules } = await c.req.json();
        await db
            .delete(hackathonSchedules)
            .where(eq(hackathonSchedules.hackathonId, hackathonId));
        for (const s of schedules || []) {
            if (!s?.type || !s?.startTime || !s?.endTime)
                continue;
            await db.insert(hackathonSchedules).values({
                id: crypto.randomUUID(),
                hackathonId,
                type: s.type,
                startTime: s.startTime,
                endTime: s.endTime,
            });
        }
        return c.json({ message: "Saved" });
    }
    catch (err) {
        console.error(err);
        return c.json({ message: "Error" }, 500);
    }
};
export const getHackathonRoles = async (c) => {
    try {
        const hackathonId = c.req.param("id");
        if (!hackathonId) {
            return c.json({ message: "Hackathon not found" }, 404);
        }
        const roles = await db.query.hackathonRoles.findMany({
            where: eq(hackathonRoles.hackathonId, hackathonId),
        });
        return c.json({
            admins: roles.filter((r) => r.role === "admin"),
            judges: roles.filter((r) => r.role === "judge"),
        });
    }
    catch {
        return c.json({ admins: [], judges: [] });
    }
};
export const getJudgeAccess = async (c) => {
    try {
        const hackathonId = c.req.param("id");
        const user = c.get("user");
        if (!hackathonId || !user) {
            return c.json({ message: "Invalid request" }, 400);
        }
        const hackathon = await db.query.hackathons.findFirst({
            where: eq(hackathons.id, hackathonId),
        });
        if (!hackathon) {
            return c.json({ message: "Hackathon not found" }, 404);
        }
        const isAdmin = await isHackathonAdmin(hackathonId, user.id, hackathon.createdBy);
        const isJudge = await isHackathonJudge(hackathonId, user.id);
        const stage = await getActiveSubmissionStage(hackathonId);
        return c.json({
            isJudge,
            isAdmin,
            activeStageType: stage?.type || null,
        });
    }
    catch {
        return c.json({ message: "Error" }, 500);
    }
};
export const updateHackathonRoles = async (c) => {
    try {
        const hackathonId = c.req.param("id");
        if (!hackathonId) {
            return c.json({ message: "Hackathon not found" }, 404);
        }
        const body = await c.req.json();
        await db.delete(hackathonRoles).where(eq(hackathonRoles.hackathonId, hackathonId));
        const roles = [
            ...(body.admins || []).map((u) => ({
                id: crypto.randomUUID(),
                hackathonId,
                userId: u,
                role: "admin",
            })),
            ...(body.judges || []).map((u) => ({
                id: crypto.randomUUID(),
                hackathonId,
                userId: u,
                role: "judge",
            })),
        ];
        if (roles.length) {
            await db.insert(hackathonRoles).values(roles);
        }
        return c.json({ message: "Updated" });
    }
    catch {
        return c.json({ message: "Error" }, 500);
    }
};
export const getMember = async (c) => {
    try {
        const hackathonId = c.req.param("id");
        const user = c.get("user");
        if (!hackathonId || !user) {
            return c.json({ message: "Invalid request" }, 400);
        }
        const membership = await findMembershipForHackathon(user.id, hackathonId);
        if (!membership)
            return c.json({ joined: false });
        const members = await db.query.teamMembers.findMany({
            where: eq(teamMembers.teamId, membership.team.id),
            with: { user: true },
        });
        return c.json({
            joined: true,
            team: {
                id: membership.team.id,
                name: membership.team.name,
                members,
            },
        });
    }
    catch {
        return c.json({ message: "Error" }, 500);
    }
};
export const joinHackathon = async (c) => {
    try {
        const user = c.get("user");
        const hackathonId = c.req.param("id");
        if (!hackathonId || !user) {
            return c.json({ message: "Invalid request" }, 400);
        }
        await ensureParticipant(hackathonId, user.id);
        return c.json({ message: "Joined" });
    }
    catch {
        return c.json({ message: "Error" }, 500);
    }
};
export const deleteUser = async (c) => {
    try {
        const user = c.get("user");
        const hackathonId = c.req.param("id");
        if (!hackathonId || !user) {
            return c.json({ message: "Invalid request" }, 400);
        }
        const membership = await findMembershipForHackathon(user.id, hackathonId);
        if (membership) {
            await db.delete(teamMembers).where(eq(teamMembers.id, membership.id));
        }
        await db
            .delete(hackathonParticipants)
            .where(eq(hackathonParticipants.userId, user.id));
        return c.json({ message: "Left" });
    }
    catch {
        return c.json({ message: "Error" }, 500);
    }
};
