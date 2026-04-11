import { mkdir, writeFile } from "fs/promises";
import path from "path";
import crypto from "crypto";
import { and, desc, eq, sql } from "drizzle-orm";
import { db } from "../src/db";
import { hackathons, hackathonParticipants, evaluations, problemStatements, submissions, teamMembers, stages, teams, user, hackathonRoles, } from "../src/db/schema";
const getFile = (value) => {
    const file = Array.isArray(value) ? value[0] : value;
    if (file &&
        typeof file === "object" &&
        typeof file.name === "string" &&
        typeof file.arrayBuffer === "function") {
        return file;
    }
    return null;
};
const normalizeEmail = (email) => email.trim();
const parseEmailList = (value) => {
    const normalizeList = (input) => Array.from(new Set(input
        .map((item) => typeof item === "string" ? normalizeEmail(item) : "")
        .filter(Boolean)));
    if (Array.isArray(value)) {
        return normalizeList(value);
    }
    if (typeof value !== "string") {
        return [];
    }
    const raw = value.trim();
    if (!raw) {
        return [];
    }
    if (raw.startsWith("[")) {
        try {
            const parsed = JSON.parse(raw);
            if (!Array.isArray(parsed)) {
                return null;
            }
            return normalizeList(parsed);
        }
        catch {
            return null;
        }
    }
    return normalizeList(raw.split(","));
};
const parseStageType = (value) => {
    if (value === "SUBMISSION" || value === "EVALUATION") {
        return value;
    }
    if (typeof value !== "string") {
        return null;
    }
    const normalized = value.trim().toUpperCase();
    if (normalized === "SUBMISSION" || normalized === "EVALUATION") {
        return normalized;
    }
    return null;
};
const isHackathonAdmin = async (hackathonId, userId, createdBy) => {
    if (createdBy === userId)
        return true;
    const role = await db.query.hackathonRoles.findFirst({
        where: and(eq(hackathonRoles.hackathonId, hackathonId), eq(hackathonRoles.userId, userId), eq(hackathonRoles.role, "admin")),
    });
    return Boolean(role);
};
const isHackathonJudge = async (hackathonId, userId) => {
    const role = await db.query.hackathonRoles.findFirst({
        where: and(eq(hackathonRoles.hackathonId, hackathonId), eq(hackathonRoles.userId, userId), eq(hackathonRoles.role, "judge")),
    });
    return Boolean(role);
};
const resolveRoleAssignments = async ({ creatorId, admins, judges, }) => {
    const roleAssignments = new Map();
    roleAssignments.set(creatorId, "admin");
    for (const email of admins) {
        const userData = await db.query.user.findFirst({
            where: eq(user.email, normalizeEmail(email)),
        });
        if (!userData) {
            return { error: `Admin not found: ${email}` };
        }
        roleAssignments.set(userData.id, "admin");
    }
    for (const email of judges) {
        const userData = await db.query.user.findFirst({
            where: eq(user.email, normalizeEmail(email)),
        });
        if (!userData) {
            return { error: `Judge not found: ${email}` };
        }
        if (!roleAssignments.has(userData.id)) {
            roleAssignments.set(userData.id, "judge");
        }
    }
    return { roleAssignments };
};
const persistRoleAssignments = async (hackathonId, roleAssignments) => {
    for (const [userId, role] of roleAssignments) {
        await db.insert(hackathonRoles).values({
            id: crypto.randomUUID(),
            userId,
            hackathonId,
            role,
        });
    }
};
const getHackathonRoleEmails = async (hackathonId, creatorId) => {
    const rows = await db
        .select({
        role: hackathonRoles.role,
        email: user.email,
    })
        .from(hackathonRoles)
        .innerJoin(user, eq(hackathonRoles.userId, user.id))
        .where(eq(hackathonRoles.hackathonId, hackathonId));
    const admins = new Set();
    const judges = new Set();
    for (const row of rows) {
        const email = normalizeEmail(row.email);
        if (!email)
            continue;
        if (row.role === "admin") {
            admins.add(email);
            continue;
        }
        if (row.role === "judge") {
            judges.add(email);
        }
    }
    const creator = await db.query.user.findFirst({
        where: eq(user.id, creatorId),
    });
    if (creator?.email) {
        admins.add(normalizeEmail(creator.email));
    }
    for (const adminEmail of admins) {
        judges.delete(adminEmail);
    }
    return {
        admins: Array.from(admins),
        judges: Array.from(judges),
    };
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
export const upload = async (c) => {
    try {
        const hackathonId = c.req.param("id");
        const currentUser = c.get("user");
        if (!hackathonId) {
            return c.json({ message: "Hackathon not found" }, 404);
        }
        if (!currentUser) {
            return c.json({ message: "Unauthorized" }, 401);
        }
        const [hackathon] = await db
            .select({
            id: hackathons.id,
            isSubmissionDeadlinePassed: sql `CASE WHEN datetime(${hackathons.registrationDeadline}) < datetime('now', 'localtime') THEN 1 ELSE 0 END`,
        })
            .from(hackathons)
            .where(eq(hackathons.id, hackathonId))
            .limit(1);
        if (!hackathon) {
            return c.json({ message: "Hackathon not found" }, 404);
        }
        if (hackathon.isSubmissionDeadlinePassed === 1) {
            return c.json({ message: "Submission deadline has passed" }, 400);
        }
        const { driveUrl, githubUrl, problemStatementId } = await c.req.json();
        if (!driveUrl) {
            return c.json({ message: "Drive URL is required" }, 400);
        }
        const membership = await findMembershipForHackathon(currentUser.id, hackathonId);
        if (!membership) {
            return c.json({ message: "Not in a team" }, 400);
        }
        const teamId = membership.team.id;
        const activeStage = await db.query.stages.findFirst({
            where: and(eq(stages.hackathonId, hackathonId), sql `datetime(${stages.startTime}) <= datetime('now', 'localtime')`, sql `datetime(${stages.endTime}) >= datetime('now', 'localtime')`),
        });
        if (!activeStage) {
            return c.json({ message: "No active stage, submission not allowed" }, 400);
        }
        if (activeStage.type !== "SUBMISSION") {
            return c.json({ message: "Submissions not allowed in this stage" }, 400);
        }
        const problems = await db.query.problemStatements.findMany({
            where: eq(problemStatements.hackathonId, hackathonId),
        });
        if (problems.length && !problemStatementId) {
            return c.json({ message: "Problem statement required" }, 400);
        }
        const existing = await db.query.submissions.findFirst({
            where: and(eq(submissions.teamId, teamId), eq(submissions.stageId, activeStage.id)),
        });
        const data = {
            pptUrl: driveUrl,
            githubUrl,
            problemStatementId,
        };
        if (existing) {
            const existingEvaluation = await db.query.evaluations.findFirst({
                where: eq(evaluations.submissionId, existing.id),
            });
            if (existingEvaluation) {
                return c.json({ message: "Submission has already been evaluated and cannot be updated" }, 400);
            }
            await db
                .update(submissions)
                .set({
                ...data,
                submittedAt: sql `CURRENT_TIMESTAMP`,
            })
                .where(eq(submissions.id, existing.id));
            return c.json({ message: "Submission updated" });
        }
        else {
            await db.insert(submissions).values({
                id: crypto.randomUUID(),
                teamId,
                stageId: activeStage.id,
                ...data,
            });
            return c.json({ message: "Submission created" });
        }
    }
    catch (error) {
        console.error(error);
        return c.json({ message: "Something went wrong" }, 500);
    }
};
export const newHackathon = async (c) => {
    try {
        const currentUser = c.get("user");
        if (!currentUser)
            return c.json({ message: "Unauthorized" }, 401);
        const data = await c.req.parseBody();
        const file = getFile(data.headerImage);
        if (!data.title ||
            !data.startDate ||
            !data.endDate ||
            !data.registrationDeadline ||
            !data.admins ||
            !data.judges) {
            return c.json({
                message: "Title, start date, end date, registration deadline, admins and judges are required",
            }, 400);
        }
        const admins = parseEmailList(data.admins);
        const judges = parseEmailList(data.judges);
        if (!admins || !judges) {
            return c.json({ message: "Invalid admins or judges format" }, 400);
        }
        const roleResolution = await resolveRoleAssignments({
            creatorId: currentUser.id,
            admins,
            judges,
        });
        if ("error" in roleResolution) {
            return c.json({ message: roleResolution.error }, 400);
        }
        const safeTitle = data.title
            .toLowerCase()
            .replace(/\s+/g, "-")
            .replace(/[^a-z0-9-]/g, "");
        let filePath;
        if (file) {
            const ext = file.name.split(".").pop();
            const fileName = `${Date.now()}-${safeTitle}${ext ? `.${ext}` : ""}`;
            filePath = path.join("images", fileName);
            await mkdir(path.dirname(filePath), { recursive: true });
            const buffer = Buffer.from(await file.arrayBuffer());
            await writeFile(filePath, buffer);
        }
        const hackathonId = crypto.randomUUID();
        await db.insert(hackathons).values({
            id: hackathonId,
            title: data.title,
            description: data.description,
            headerImage: filePath ?? null,
            startDate: data.startDate,
            endDate: data.endDate,
            registrationDeadline: data.registrationDeadline,
            location: data.location,
            createdBy: currentUser.id,
        });
        await persistRoleAssignments(hackathonId, roleResolution.roleAssignments);
        const stagesData = JSON.parse(data.stages || "[]");
        for (const stage of stagesData) {
            const stageTitle = (stage.title ?? "").trim();
            if (!stageTitle) {
                return c.json({ message: "Stage title is required" }, 400);
            }
            const stageType = parseStageType(stage.type);
            if (!stageType) {
                return c.json({ message: "Each stage must have type SUBMISSION or EVALUATION" }, 400);
            }
            await db.insert(stages).values({
                id: crypto.randomUUID(),
                hackathonId,
                title: stageTitle,
                description: typeof stage.description === "string" ? stage.description : undefined,
                type: stageType,
                startTime: typeof stage.startDate === "string" ? stage.startDate : undefined,
                endTime: typeof stage.endDate === "string" ? stage.endDate : undefined,
            });
        }
        const problems = JSON.parse(data.problemStatements || "[]");
        for (const p of problems) {
            let title = "";
            let description = "";
            if (typeof p === "string") {
                title = p.trim();
            }
            else {
                title = (p.title ?? "").trim();
                description = (p.description ?? p.body ?? "").trim();
            }
            if (!title)
                continue;
            await db.insert(problemStatements).values({
                id: crypto.randomUUID(),
                hackathonId,
                title,
                description: description || undefined,
            });
        }
        return c.json({
            message: "Hackathon created successfully",
            filePath,
        });
    }
    catch (error) {
        console.error(error);
        return c.json({ message: "Something went wrong" }, 500);
    }
};
export const getHackathonRoles = async (c) => {
    try {
        const hackathonId = c.req.param("id");
        const currentUser = c.get("user");
        if (!hackathonId)
            return c.json({ message: "Hackathon not found" }, 404);
        if (!currentUser)
            return c.json({ message: "Unauthorized" }, 401);
        const hackathon = await db.query.hackathons.findFirst({
            where: eq(hackathons.id, hackathonId),
        });
        if (!hackathon)
            return c.json({ message: "Hackathon not found" }, 404);
        const canManage = await isHackathonAdmin(hackathonId, currentUser.id, hackathon.createdBy);
        if (!canManage) {
            return c.json({ message: "Access to admin only" }, 403);
        }
        const roles = await getHackathonRoleEmails(hackathonId, hackathon.createdBy);
        return c.json(roles);
    }
    catch (error) {
        console.error(error);
        return c.json({ message: "Something went wrong" }, 500);
    }
};
export const getJudgeAccess = async (c) => {
    try {
        const hackathonId = c.req.param("id");
        const currentUser = c.get("user");
        if (!hackathonId)
            return c.json({ message: "Hackathon not found" }, 404);
        if (!currentUser)
            return c.json({ message: "Unauthorized" }, 401);
        const hackathon = await db.query.hackathons.findFirst({
            where: eq(hackathons.id, hackathonId),
        });
        if (!hackathon)
            return c.json({ message: "Hackathon not found" }, 404);
        const isJudge = await isHackathonJudge(hackathonId, currentUser.id);
        return c.json({ isJudge });
    }
    catch (error) {
        console.error(error);
        return c.json({ message: "Something went wrong" }, 500);
    }
};
export const updateHackathonRoles = async (c) => {
    try {
        const hackathonId = c.req.param("id");
        const currentUser = c.get("user");
        if (!hackathonId)
            return c.json({ message: "Hackathon not found" }, 404);
        if (!currentUser)
            return c.json({ message: "Unauthorized" }, 401);
        const hackathon = await db.query.hackathons.findFirst({
            where: eq(hackathons.id, hackathonId),
        });
        if (!hackathon)
            return c.json({ message: "Hackathon not found" }, 404);
        const canManage = await isHackathonAdmin(hackathonId, currentUser.id, hackathon.createdBy);
        if (!canManage) {
            return c.json({ message: "Access to admin only" }, 403);
        }
        let payload;
        try {
            payload = await c.req.json();
        }
        catch {
            return c.json({ message: "Invalid request body" }, 400);
        }
        if (typeof payload !== "object" || payload === null) {
            return c.json({ message: "Invalid request body" }, 400);
        }
        const { admins: rawAdmins, judges: rawJudges } = payload;
        if (rawAdmins === undefined || rawJudges === undefined) {
            return c.json({ message: "Admins and judges are required" }, 400);
        }
        const admins = parseEmailList(rawAdmins);
        const judges = parseEmailList(rawJudges);
        if (!admins || !judges) {
            return c.json({ message: "Invalid admins or judges format" }, 400);
        }
        const roleResolution = await resolveRoleAssignments({
            creatorId: hackathon.createdBy,
            admins,
            judges,
        });
        if ("error" in roleResolution) {
            return c.json({ message: roleResolution.error }, 400);
        }
        await db
            .delete(hackathonRoles)
            .where(eq(hackathonRoles.hackathonId, hackathonId));
        await persistRoleAssignments(hackathonId, roleResolution.roleAssignments);
        const roles = await getHackathonRoleEmails(hackathonId, hackathon.createdBy);
        return c.json({
            message: "Roles updated successfully",
            ...roles,
        });
    }
    catch (error) {
        console.error(error);
        return c.json({ message: "Something went wrong" }, 500);
    }
};
export const getMember = async (c) => {
    try {
        const hackathonId = c.req.param("id");
        const user = c.get("user");
        if (!hackathonId)
            return c.json({ message: "Hackathon not found" }, 404);
        if (!user)
            return c.json({ message: "Unauthorized" }, 401);
        const userId = user.id;
        const participant = await db.query.hackathonParticipants.findFirst({
            where: and(eq(hackathonParticipants.hackathonId, hackathonId), eq(hackathonParticipants.userId, userId)),
        });
        if (!participant) {
            return c.json({ joined: false, team: null });
        }
        const membership = await findMembershipForHackathon(userId, hackathonId);
        if (!membership) {
            return c.json({ joined: true, team: null });
        }
        const teamId = membership.team.id;
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
        const hasEvaluation = latestSubmission
            ? Boolean(await db.query.evaluations.findFirst({
                where: eq(evaluations.submissionId, latestSubmission.id),
            }))
            : false;
        const submission = latestSubmission
            ? {
                ...latestSubmission,
                evaluated: hasEvaluation,
            }
            : null;
        return c.json({
            joined: true,
            team: {
                id: teamId,
                name: membership.team.name,
                leaderId: membership.team.leaderId,
                members,
                submission,
            },
        });
    }
    catch {
        return c.json({ message: "Something went wrong" }, 500);
    }
};
export const joinHackathon = async (c) => {
    try {
        const userId = c.get("user").id;
        const hackathonId = c.req.param("id");
        if (!hackathonId)
            return c.json({ message: "Hackathon not found" }, 404);
        const hackathon = await db.query.hackathons.findFirst({
            where: eq(hackathons.id, hackathonId),
        });
        if (!hackathon)
            return c.json({ message: "Hackathon not found" }, 404);
        await ensureParticipant(hackathonId, userId);
        return c.json({ message: "Joined" });
    }
    catch {
        return c.json({ message: "Something went wrong" }, 500);
    }
};
export const deleteUser = async (c) => {
    try {
        const hackathonId = c.req.param("id");
        const userId = c.get("user").id;
        if (!hackathonId)
            return c.json({ message: "Hackathon not found" }, 404);
        const participant = await db.query.hackathonParticipants.findFirst({
            where: and(eq(hackathonParticipants.hackathonId, hackathonId), eq(hackathonParticipants.userId, userId)),
        });
        if (!participant)
            return c.json({ message: "Not joined" }, 404);
        const membership = await findMembershipForHackathon(userId, hackathonId);
        if (membership) {
            if (membership.team.leaderId === userId) {
                await db.delete(teams).where(eq(teams.id, membership.team.id));
            }
            else {
                await db.delete(teamMembers).where(eq(teamMembers.id, membership.id));
            }
        }
        await db
            .delete(hackathonParticipants)
            .where(eq(hackathonParticipants.id, participant.id));
        return c.json({ message: "Left hackathon" });
    }
    catch {
        return c.json({ message: "Something went wrong" }, 500);
    }
};
