import crypto from "crypto";
import { hackathonRoles, teams, submissions, stages, evaluations, shortlistedTeams, } from "../src/db/schema";
import { eq, and, inArray, sql, desc } from "drizzle-orm";
import { db } from "../src/db";
const requireAuth = (c) => {
    const userId = c.get("user")?.id;
    if (!userId)
        return null;
    return userId;
};
const requireJudge = async (userId, hackathonId) => {
    const role = await db.query.hackathonRoles.findFirst({
        where: and(eq(hackathonRoles.hackathonId, hackathonId), eq(hackathonRoles.userId, userId)),
    });
    return role?.role === "judge";
};
const requireJudgeOrAdmin = async (userId, hackathonId) => {
    const role = await db.query.hackathonRoles.findFirst({
        where: and(eq(hackathonRoles.hackathonId, hackathonId), eq(hackathonRoles.userId, userId)),
    });
    return role?.role === "judge" || role?.role === "admin";
};
export const getSubmissions = async (c) => {
    try {
        const userId = requireAuth(c);
        const hackathonId = c.req.param("id");
        const stageId = c.req.query("stageId")?.trim();
        if (!userId)
            return c.json({ message: "Unauthorized" }, 401);
        if (!hackathonId || !stageId)
            return c.json({ message: "Missing required fields" }, 400);
        const isJudge = await requireJudge(userId, hackathonId);
        if (!isJudge)
            return c.json({ message: "Unauthorized" }, 403);
        const stage = await db.query.stages.findFirst({
            where: and(eq(stages.id, stageId), eq(stages.hackathonId, hackathonId)),
        });
        if (!stage)
            return c.json({ message: "Stage not found" }, 404);
        const data = await db
            .select({
            submissionId: submissions.id,
            pptUrl: submissions.pptUrl,
            githubUrl: submissions.githubUrl,
            submittedAt: submissions.submittedAt,
            teamId: teams.id,
            teamName: teams.name,
        })
            .from(submissions)
            .innerJoin(teams, eq(submissions.teamId, teams.id))
            .where(and(eq(teams.hackathonId, hackathonId), eq(submissions.stageId, stage.id)));
        const evaluated = new Set((await db
            .select({ submissionId: evaluations.submissionId })
            .from(evaluations)
            .where(and(eq(evaluations.judgeId, userId), inArray(evaluations.submissionId, data.map((d) => d.submissionId))))).map((d) => d.submissionId));
        return c.json({
            count: data.length,
            data: data.map((d) => ({
                ...d,
                evaluated: evaluated.has(d.submissionId),
            })),
        });
    }
    catch {
        return c.json({ message: "Something went wrong" }, 500);
    }
};
export const evaluateSubmission = async (c) => {
    try {
        const userId = requireAuth(c);
        const hackathonId = c.req.param("id");
        const teamId = c.req.param("teamId");
        const stageId = c.req.query("stageId")?.trim();
        if (!userId || !hackathonId || !teamId || !stageId)
            return c.json({ message: "Missing required fields" }, 400);
        const isJudge = await requireJudge(userId, hackathonId);
        if (!isJudge)
            return c.json({ message: "Unauthorized" }, 403);
        const [team, stage] = await Promise.all([
            db.query.teams.findFirst({
                where: and(eq(teams.id, teamId), eq(teams.hackathonId, hackathonId)),
            }),
            db.query.stages.findFirst({
                where: and(eq(stages.id, stageId), eq(stages.hackathonId, hackathonId)),
            }),
        ]);
        if (!team)
            return c.json({ message: "Team not found" }, 404);
        if (!stage)
            return c.json({ message: "Stage not found" }, 404);
        if (stage.type !== "EVALUATION" && stage.type !== "FINAL") {
            return c.json({ message: "Invalid stage" }, 400);
        }
        const submission = await db.query.submissions.findFirst({
            where: and(eq(submissions.teamId, teamId), eq(submissions.stageId, stageId)),
        });
        if (!submission && stage.type !== "FINAL") {
            return c.json({ message: "Submission not found" }, 404);
        }
        let submissionId = submission?.id;
        if (!submissionId) {
            submissionId = crypto.randomUUID();
            await db.insert(submissions).values({
                id: submissionId,
                teamId,
                stageId,
                pptUrl: null,
                githubUrl: null,
                problemStatementId: null,
            });
        }
        const form = await c.req.formData();
        const scores = ["innovation", "feasibility", "technical", "impact", "presentation"].map((k) => Number(form.get(k)));
        if (scores.some((s) => !Number.isInteger(s) || s < 0 || s > 10)) {
            return c.json({ message: "Invalid scores" }, 400);
        }
        const [innovation, feasibility, technical, impact, presentation] = scores;
        const total = scores.reduce((a, b) => a + b, 0);
        const existing = await db.query.evaluations.findFirst({
            where: and(eq(evaluations.submissionId, submissionId), eq(evaluations.judgeId, userId)),
        });
        if (existing) {
            await db
                .update(evaluations)
                .set({ innovation, feasibility, technical, impact, presentation, total })
                .where(eq(evaluations.id, existing.id));
        }
        else {
            await db.insert(evaluations).values({
                id: crypto.randomUUID(),
                submissionId,
                judgeId: userId,
                innovation,
                feasibility,
                technical,
                impact,
                presentation,
                total,
            });
        }
        return c.json({ total });
    }
    catch {
        return c.json({ message: "Something went wrong" }, 500);
    }
};
export const fetchEvaluatedTeams = async (c) => {
    const hackathonId = c.req.param("id");
    const stageId = c.req.query("stageId")?.trim();
    if (!hackathonId || !stageId)
        return c.json({ message: "Missing required fields" }, 400);
    const data = await db
        .select({
        teamId: teams.id,
        teamName: teams.name,
        totalScore: sql `AVG(${evaluations.total})`,
    })
        .from(submissions)
        .innerJoin(teams, eq(submissions.teamId, teams.id))
        .innerJoin(evaluations, eq(submissions.id, evaluations.submissionId))
        .where(and(eq(submissions.stageId, stageId), eq(teams.hackathonId, hackathonId)))
        .groupBy(teams.id)
        .orderBy(desc(sql `AVG(${evaluations.total})`));
    return c.json({ data });
};
export const createShortlistedTeams = async (c) => {
    try {
        const userId = requireAuth(c);
        const hackathonId = c.req.param("id");
        const { stageId, teamIds } = await c.req.json();
        if (!userId || !hackathonId || !stageId || !Array.isArray(teamIds)) {
            return c.json({ success: false, message: "Invalid input" }, 400);
        }
        const isJudgeOrAdmin = await requireJudgeOrAdmin(userId, hackathonId);
        if (!isJudgeOrAdmin) {
            return c.json({ success: false, message: "Unauthorized" }, 403);
        }
        const stage = await db.query.stages.findFirst({
            where: and(eq(stages.id, stageId), eq(stages.hackathonId, hackathonId)),
        });
        if (!stage) {
            return c.json({ success: false, message: "Stage not found" }, 404);
        }
        if (stage.type === "FINAL") {
            return c.json({ success: false, message: "Use final winners endpoint for final stage" }, 400);
        }
        const uniqueTeamIds = [...new Set(teamIds.filter((id) => typeof id === "string" && id.trim().length > 0))];
        if (uniqueTeamIds.length === 0) {
            return c.json({ success: false, message: "Invalid teams" }, 400);
        }
        const validTeams = await db.query.teams.findMany({
            where: and(eq(teams.hackathonId, hackathonId), inArray(teams.id, uniqueTeamIds)),
            columns: { id: true },
        });
        if (validTeams.length !== uniqueTeamIds.length) {
            return c.json({ success: false, message: "Invalid teams" }, 400);
        }
        const existing = await db.query.shortlistedTeams.findFirst({
            where: and(eq(shortlistedTeams.hackathonId, hackathonId), eq(shortlistedTeams.stageId, stageId)),
            columns: { id: true },
        });
        if (existing) {
            return c.json({
                success: false,
                message: "Shortlist already confirmed",
                shortlistedStageId: stageId,
            }, 409);
        }
        await db.insert(shortlistedTeams).values(uniqueTeamIds.map((teamId) => ({
            id: crypto.randomUUID(),
            teamId,
            hackathonId,
            stageId,
        })));
        return c.json({
            success: true,
            message: "Shortlist confirmed successfully",
            shortlistedStageId: stageId,
        });
    }
    catch {
        return c.json({ success: false, message: "Something went wrong" }, 500);
    }
};
export const confirmFinalWinners = async (c) => {
    try {
        const userId = requireAuth(c);
        const hackathonId = c.req.param("id");
        const { finalStageId, winnerCount } = await c.req.json();
        if (!userId ||
            !hackathonId ||
            !finalStageId ||
            !Number.isInteger(winnerCount) ||
            winnerCount <= 0) {
            return c.json({ success: false, message: "Invalid input" }, 400);
        }
        const isJudgeOrAdmin = await requireJudgeOrAdmin(userId, hackathonId);
        if (!isJudgeOrAdmin) {
            return c.json({ success: false, message: "Unauthorized" }, 403);
        }
        const stage = await db.query.stages.findFirst({
            where: and(eq(stages.id, finalStageId), eq(stages.hackathonId, hackathonId), eq(stages.type, "FINAL")),
            columns: { id: true },
        });
        if (!stage) {
            return c.json({ success: false, message: "Final stage not found" }, 404);
        }
        const ranked = await db
            .select({
            teamId: teams.id,
            totalScore: sql `AVG(${evaluations.total})`,
        })
            .from(submissions)
            .innerJoin(teams, eq(submissions.teamId, teams.id))
            .innerJoin(evaluations, eq(submissions.id, evaluations.submissionId))
            .where(and(eq(submissions.stageId, finalStageId), eq(teams.hackathonId, hackathonId)))
            .groupBy(teams.id)
            .orderBy(desc(sql `AVG(${evaluations.total})`));
        if (ranked.length === 0) {
            return c.json({ success: false, message: "No scored teams available" }, 400);
        }
        const winners = ranked.slice(0, winnerCount).map((team) => team.teamId);
        await db
            .delete(shortlistedTeams)
            .where(and(eq(shortlistedTeams.hackathonId, hackathonId), eq(shortlistedTeams.stageId, finalStageId)));
        await db.insert(shortlistedTeams).values(winners.map((teamId) => ({
            id: crypto.randomUUID(),
            teamId,
            hackathonId,
            stageId: finalStageId,
        })));
        return c.json({
            success: true,
            message: "Winners confirmed successfully",
            finalStageId,
            data: winners,
        });
    }
    catch {
        return c.json({ success: false, message: "Something went wrong" }, 500);
    }
};
export const fetchShortlistedTeams = async (c) => {
    const hackathonId = c.req.param("id");
    const stageId = c.req.query("stageId")?.trim();
    if (!hackathonId || !stageId)
        return c.json({ message: "Missing required fields" }, 400);
    const data = await db
        .select({
        teamId: teams.id,
        teamName: teams.name,
    })
        .from(shortlistedTeams)
        .innerJoin(teams, eq(shortlistedTeams.teamId, teams.id))
        .where(and(eq(shortlistedTeams.hackathonId, hackathonId), eq(shortlistedTeams.stageId, stageId)));
    return c.json({ data });
};
