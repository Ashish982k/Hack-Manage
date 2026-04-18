import { mkdir, writeFile } from "fs/promises";
import path from "path";
import crypto from "crypto";
import { and, asc, desc, eq, sql } from "drizzle-orm";
import { db } from "../src/db";
import { hackathons, hackathonParticipants, evaluations, problemStatements, submissions, teamMembers, stages, hackathonSchedules, teams, user, hackathonRoles, } from "../src/db/schema";
const STAGE_TYPES = ["SUBMISSION", "EVALUATION", "FINAL"];
const SCHEDULE_TYPES = ["entry", "breakfast", "lunch", "dinner"];
const isFileLike = (value) => !!value &&
    typeof value === "object" &&
    "name" in value &&
    "arrayBuffer" in value &&
    typeof value.name === "string" &&
    typeof value.arrayBuffer === "function";
const getFile = (value) => {
    const file = Array.isArray(value) ? value[0] : value;
    return isFileLike(file) ? file : null;
};
const normalizeEmail = (email) => email.trim();
const normalizeEmailList = (input) => Array.from(new Set(input
    .filter((item) => typeof item === "string")
    .map(normalizeEmail)
    .filter(Boolean)));
const parseEmailList = (value) => {
    if (Array.isArray(value)) {
        return normalizeEmailList(value);
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
            return normalizeEmailList(parsed);
        }
        catch {
            return null;
        }
    }
    return normalizeEmailList(raw.split(","));
};
const parseStageType = (value) => {
    if (typeof value !== "string") {
        return null;
    }
    const normalized = value.trim().toUpperCase();
    return STAGE_TYPES.includes(normalized) ? normalized : null;
};
const parseScheduleType = (value) => {
    if (typeof value !== "string") {
        return null;
    }
    const normalized = value.trim().toLowerCase();
    return SCHEDULE_TYPES.includes(normalized) ? normalized : null;
};
const isDateTimeValue = (value) => Number.isFinite(Date.parse(value));
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
        if (!hackathonId)
            return c.json({ message: "Hackathon not found" }, 404);
        if (!currentUser)
            return c.json({ message: "Unauthorized" }, 401);
        const hackathon = await db.query.hackathons.findFirst({
            where: eq(hackathons.id, hackathonId),
        });
        if (!hackathon)
            return c.json({ message: "Hackathon not found" }, 404);
        const isAdminParticipant = await isHackathonAdmin(hackathonId, currentUser.id, hackathon.createdBy);
        if (isAdminParticipant) {
            return c.json({ message: "Hackathon admins cannot participate in this hackathon." }, 403);
        }
        const { driveUrl, githubUrl, problemStatementId } = await c.req.json();
        if (!driveUrl)
            return c.json({ message: "Drive URL is required" }, 400);
        const membership = await findMembershipForHackathon(currentUser.id, hackathonId);
        if (!membership)
            return c.json({ message: "Not in a team" }, 400);
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
        const submissionData = {
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
                ...submissionData,
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
                ...submissionData,
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
        const body = await c.req.parseBody();
        const file = getFile(body.headerImage);
        if (!body.title ||
            !body.startDate ||
            !body.endDate ||
            !body.registrationDeadline ||
            !body.admins ||
            !body.judges) {
            return c.json({
                message: "Title, start date, end date, registration deadline, admins and judges are required",
            }, 400);
        }
        const admins = parseEmailList(body.admins);
        const judges = parseEmailList(body.judges);
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
        const title = body.title;
        const safeTitle = title
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
            title,
            description: body.description,
            headerImage: filePath ?? null,
            startDate: body.startDate,
            endDate: body.endDate,
            registrationDeadline: body.registrationDeadline,
            location: body.location,
            createdBy: currentUser.id,
        });
        await persistRoleAssignments(hackathonId, roleResolution.roleAssignments);
        const stagesData = JSON.parse(body.stages || "[]");
        for (const stage of stagesData) {
            const stageTitle = (stage.title ?? "").trim();
            if (!stageTitle) {
                return c.json({ message: "Stage title is required" }, 400);
            }
            const stageType = parseStageType(stage.type);
            if (!stageType) {
                return c.json({ message: "Each stage must have type SUBMISSION, EVALUATION, or FINAL" }, 400);
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
        const problems = JSON.parse(body.problemStatements || "[]");
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
            hackathonId,
            filePath,
        });
    }
    catch (error) {
        console.error(error);
        return c.json({ message: "Something went wrong" }, 500);
    }
};
export const saveHackathonSchedules = async (c) => {
    try {
        const hackathonId = c.req.param("id");
        const currentUser = c.get("user");
        if (!hackathonId) {
            return c.json({ message: "Hackathon not found" }, 404);
        }
        if (!currentUser) {
            return c.json({ message: "Unauthorized" }, 401);
        }
        const hackathon = await db.query.hackathons.findFirst({
            where: eq(hackathons.id, hackathonId),
        });
        if (!hackathon) {
            return c.json({ message: "Hackathon not found" }, 404);
        }
        const canManage = await isHackathonAdmin(hackathonId, currentUser.id, hackathon.createdBy);
        if (!canManage) {
            return c.json({ message: "Access to admin only" }, 403);
        }
        const body = await c.req.json();
        const schedules = Array.isArray(body?.schedules)
            ? body.schedules
            : [];
        if (!schedules.length) {
            return c.json({ message: "Schedules are required" }, 400);
        }
        const seenTypes = new Set();
        const normalizedSchedules = [];
        for (const item of schedules) {
            const schedule = item;
            const scheduleType = parseScheduleType(schedule.type);
            if (!scheduleType) {
                return c.json({ message: "Invalid schedule item" }, 400);
            }
            seenTypes.add(scheduleType);
            const startTime = typeof schedule.startTime === "string" ? schedule.startTime.trim() : "";
            const endTime = typeof schedule.endTime === "string" ? schedule.endTime.trim() : "";
            if (!startTime || !isDateTimeValue(startTime)) {
                return c.json({ message: "Each schedule must have a valid start time" }, 400);
            }
            if (!endTime || !isDateTimeValue(endTime)) {
                return c.json({ message: "Each schedule must have a valid end time" }, 400);
            }
            if (Date.parse(startTime) >= Date.parse(endTime)) {
                return c.json({ message: `${scheduleType} schedule startTime must be before endTime` }, 400);
            }
            normalizedSchedules.push({
                type: scheduleType,
                startTime,
                endTime,
            });
        }
        for (const scheduleType of SCHEDULE_TYPES) {
            if (seenTypes.has(scheduleType))
                continue;
            await db
                .delete(hackathonSchedules)
                .where(and(eq(hackathonSchedules.hackathonId, hackathonId), eq(hackathonSchedules.type, scheduleType)));
        }
        for (const schedule of normalizedSchedules) {
            await db
                .insert(hackathonSchedules)
                .values({
                id: crypto.randomUUID(),
                hackathonId,
                type: schedule.type,
                startTime: schedule.startTime,
                endTime: schedule.endTime,
            })
                .onConflictDoUpdate({
                target: [hackathonSchedules.hackathonId, hackathonSchedules.type],
                set: {
                    startTime: schedule.startTime,
                    endTime: schedule.endTime,
                },
            });
        }
        return c.json({ message: "Schedules saved successfully" });
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
        const isAdmin = await isHackathonAdmin(hackathonId, currentUser.id, hackathon.createdBy);
        const activeStage = await db.query.stages.findFirst({
            where: and(eq(stages.hackathonId, hackathonId), sql `datetime(${stages.startTime}) <= datetime('now', 'localtime')`, sql `datetime(${stages.endTime}) >= datetime('now', 'localtime')`),
            orderBy: [desc(sql `datetime(${stages.startTime})`)],
        });
        return c.json({
            isJudge,
            isAdmin,
            activeStageType: activeStage?.type ?? null,
        });
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
        const payload = (await c.req.json());
        const admins = parseEmailList(payload.admins ?? []);
        const judges = parseEmailList(payload.judges ?? []);
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
        const isAdminParticipant = await isHackathonAdmin(hackathonId, currentUser.id, hackathon.createdBy);
        if (isAdminParticipant) {
            return c.json({ joined: false, team: null });
        }
        const participant = await db.query.hackathonParticipants.findFirst({
            where: and(eq(hackathonParticipants.hackathonId, hackathonId), eq(hackathonParticipants.userId, currentUser.id)),
        });
        if (!participant) {
            return c.json({ joined: false, team: null });
        }
        const membership = await findMembershipForHackathon(currentUser.id, hackathonId);
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
        const submissionScoreBreakdown = latestSubmission
            ? (await db
                .select({
                technical: sql `COALESCE(AVG(${evaluations.technical}), 0)`,
                feasibility: sql `COALESCE(AVG(${evaluations.feasibility}), 0)`,
                innovation: sql `COALESCE(AVG(${evaluations.innovation}), 0)`,
                presentation: sql `COALESCE(AVG(${evaluations.presentation}), 0)`,
                impact: sql `COALESCE(AVG(${evaluations.impact}), 0)`,
                totalScore: sql `COALESCE(AVG(${evaluations.total}), 0)`,
                evaluationCount: sql `COUNT(${evaluations.id})`,
            })
                .from(evaluations)
                .where(eq(evaluations.submissionId, latestSubmission.id)))[0]
            : null;
        const evaluationCount = Number(submissionScoreBreakdown?.evaluationCount ?? 0);
        const hasEvaluation = evaluationCount > 0;
        const submission = latestSubmission
            ? {
                ...latestSubmission,
                evaluated: hasEvaluation,
                scoreBreakdown: hasEvaluation
                    ? {
                        technical: Number(submissionScoreBreakdown?.technical ?? 0),
                        feasibility: Number(submissionScoreBreakdown?.feasibility ?? 0),
                        innovation: Number(submissionScoreBreakdown?.innovation ?? 0),
                        presentation: Number(submissionScoreBreakdown?.presentation ?? 0),
                        impact: Number(submissionScoreBreakdown?.impact ?? 0),
                        totalScore: Number(submissionScoreBreakdown?.totalScore ?? 0),
                        evaluationCount,
                    }
                    : null,
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
        const currentUser = c.get("user");
        const hackathonId = c.req.param("id");
        if (!currentUser)
            return c.json({ message: "Unauthorized" }, 401);
        if (!hackathonId)
            return c.json({ message: "Hackathon not found" }, 404);
        const hackathon = await db.query.hackathons.findFirst({
            where: eq(hackathons.id, hackathonId),
        });
        if (!hackathon)
            return c.json({ message: "Hackathon not found" }, 404);
        const isAdminParticipant = await isHackathonAdmin(hackathonId, currentUser.id, hackathon.createdBy);
        if (isAdminParticipant) {
            return c.json({ message: "Hackathon admins cannot participate in this hackathon." }, 403);
        }
        await ensureParticipant(hackathonId, currentUser.id);
        return c.json({ message: "Joined" });
    }
    catch {
        return c.json({ message: "Something went wrong" }, 500);
    }
};
export const deleteUser = async (c) => {
    try {
        const hackathonId = c.req.param("id");
        const currentUser = c.get("user");
        if (!currentUser)
            return c.json({ message: "Unauthorized" }, 401);
        if (!hackathonId)
            return c.json({ message: "Hackathon not found" }, 404);
        const participant = await db.query.hackathonParticipants.findFirst({
            where: and(eq(hackathonParticipants.hackathonId, hackathonId), eq(hackathonParticipants.userId, currentUser.id)),
        });
        if (!participant)
            return c.json({ message: "Not joined" }, 404);
        const membership = await findMembershipForHackathon(currentUser.id, hackathonId);
        if (membership) {
            if (membership.team.leaderId === currentUser.id) {
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
