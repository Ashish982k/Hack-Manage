import crypto from "crypto";
import { hackathonRoles, teams, submissions, stages, evaluations, shortlistedTeams, } from "../src/db/schema";
import { eq, and, inArray, sql, desc, isNotNull, asc } from "drizzle-orm";
import { db } from "../src/db";
const toTimestamp = (value) => {
    const timestamp = Date.parse(value ?? "");
    return Number.isFinite(timestamp) ? timestamp : Number.NEGATIVE_INFINITY;
};
export const getSubmissions = async (c) => {
    try {
        const currentUser = c.get("user");
        const hackathonId = c.req.param("id");
        if (!currentUser?.id) {
            return c.json({ message: "Unauthorized" }, 401);
        }
        if (!hackathonId) {
            return c.json({ message: "Hackathon ID is required" }, 400);
        }
        const userId = currentUser.id;
        const role = await db.query.hackathonRoles.findFirst({
            where: and(eq(hackathonRoles.hackathonId, hackathonId), eq(hackathonRoles.userId, userId)),
        });
        if (!role || role.role !== "judge") {
            return c.json({ message: "Unauthorized" }, 403);
        }
        const activeStage = await db.query.stages.findFirst({
            where: and(eq(stages.hackathonId, hackathonId), sql `datetime(${stages.startTime}) <= datetime('now', 'localtime')`, sql `datetime(${stages.endTime}) >= datetime('now', 'localtime')`),
        });
        if (!activeStage) {
            return c.json({ message: "No active stage" }, 400);
        }
        if (activeStage.type !== "EVALUATION") {
            return c.json({
                message: "Submissions can be judged only during an active EVALUATION stage.",
            }, 400);
        }
        const submissionStages = await db.query.stages.findMany({
            where: and(eq(stages.hackathonId, hackathonId), eq(stages.type, "SUBMISSION")),
        });
        if (submissionStages.length === 0) {
            return c.json({ message: "No submission stage found for this hackathon." }, 400);
        }
        const evaluationStartTime = toTimestamp(activeStage.startTime);
        const candidatesBeforeEvaluation = submissionStages.filter((stage) => toTimestamp(stage.startTime) <= evaluationStartTime);
        const candidateStages = candidatesBeforeEvaluation.length > 0
            ? candidatesBeforeEvaluation
            : submissionStages;
        const submissionStage = candidateStages.slice().sort((a, b) => {
            const aEnd = toTimestamp(a.endTime ?? a.startTime);
            const bEnd = toTimestamp(b.endTime ?? b.startTime);
            return bEnd - aEnd;
        })[0];
        const data = await db
            .select({
            submissionId: submissions.id,
            pptUrl: submissions.pptUrl,
            githubUrl: submissions.githubUrl,
            submittedAt: submissions.submittedAt,
            stageId: stages.id,
            stageTitle: stages.title,
            stageType: stages.type,
            teamId: teams.id,
            teamName: teams.name,
        })
            .from(submissions)
            .innerJoin(teams, eq(submissions.teamId, teams.id))
            .innerJoin(stages, eq(submissions.stageId, stages.id))
            .where(and(eq(teams.hackathonId, hackathonId), eq(submissions.stageId, submissionStage.id)));
        const submissionIds = data.map((item) => item.submissionId);
        const evaluatedSubmissionIds = submissionIds.length === 0
            ? new Set()
            : new Set((await db
                .select({ submissionId: evaluations.submissionId })
                .from(evaluations)
                .where(and(eq(evaluations.judgeId, userId), inArray(evaluations.submissionId, submissionIds)))).map((item) => item.submissionId));
        const dataWithEvaluationStatus = data.map((item) => ({
            ...item,
            evaluated: evaluatedSubmissionIds.has(item.submissionId),
        }));
        return c.json({
            message: "Submissions fetched successfully",
            evaluationStage: {
                id: activeStage.id,
                title: activeStage.title,
                type: activeStage.type,
            },
            submissionStage: {
                id: submissionStage.id,
                title: submissionStage.title,
                type: submissionStage.type,
            },
            count: dataWithEvaluationStatus.length,
            data: dataWithEvaluationStatus,
        });
    }
    catch (err) {
        console.error(err);
        return c.json({ message: "Something went wrong" }, 500);
    }
};
export const evaluateSubmission = async (c) => {
    try {
        const hackathonId = c.req.param("id");
        const teamId = c.req.param("teamId");
        const userId = c.get("user").id;
        if (!userId || !hackathonId || !teamId) {
            return c.json({ message: "Missing required fields" }, 400);
        }
        const role = await db.query.hackathonRoles.findFirst({
            where: and(eq(hackathonRoles.hackathonId, hackathonId), eq(hackathonRoles.userId, userId)),
        });
        if (!role || role.role !== "judge") {
            return c.json({ message: "Unauthorized" }, 403);
        }
        const activeStage = await db.query.stages.findFirst({
            where: and(eq(stages.hackathonId, hackathonId), sql `datetime(${stages.startTime}) <= datetime('now', 'localtime')`, sql `datetime(${stages.endTime}) >= datetime('now', 'localtime')`),
        });
        if (!activeStage || activeStage.type !== "EVALUATION") {
            return c.json({ message: "No active evaluation stage" }, 400);
        }
        const submissionStages = await db.query.stages.findMany({
            where: and(eq(stages.hackathonId, hackathonId), eq(stages.type, "SUBMISSION")),
        });
        if (submissionStages.length === 0) {
            return c.json({ message: "No submission stage found" }, 400);
        }
        const evaluationStartTime = toTimestamp(activeStage.startTime);
        const candidatesBeforeEvaluation = submissionStages.filter((stage) => toTimestamp(stage.startTime) <= evaluationStartTime);
        const candidateStages = candidatesBeforeEvaluation.length > 0
            ? candidatesBeforeEvaluation
            : submissionStages;
        const submissionStage = candidateStages.slice().sort((a, b) => {
            const aEnd = toTimestamp(a.endTime ?? a.startTime);
            const bEnd = toTimestamp(b.endTime ?? b.startTime);
            return bEnd - aEnd;
        })[0];
        const submitted = await db.query.submissions.findFirst({
            where: and(eq(submissions.teamId, teamId), eq(submissions.stageId, submissionStage.id)),
        });
        if (!submitted) {
            return c.json({ message: "No submission found for this team" }, 400);
        }
        const alreadyEvaluated = await db.query.evaluations.findFirst({
            where: and(eq(evaluations.submissionId, submitted.id), eq(evaluations.judgeId, userId)),
        });
        const data = await c.req.formData();
        const innovation = Number(data.get("innovation"));
        const feasibility = Number(data.get("feasibility"));
        const technical = Number(data.get("technical"));
        const impact = Number(data.get("impact"));
        const presentation = Number(data.get("presentation"));
        const scores = [innovation, feasibility, technical, impact, presentation];
        const hasInvalidScore = scores.some((score) => !Number.isFinite(score) ||
            !Number.isInteger(score) ||
            score < 0 ||
            score > 10);
        if (hasInvalidScore) {
            return c.json({ message: "Scores must be integers between 0 and 10" }, 400);
        }
        const total = innovation + feasibility + technical + impact + presentation;
        if (alreadyEvaluated) {
            await db
                .update(evaluations)
                .set({
                innovation,
                feasibility,
                technical,
                impact,
                presentation,
                total,
            })
                .where(eq(evaluations.id, alreadyEvaluated.id));
            return c.json({
                message: "Evaluation updated successfully",
                total,
            });
        }
        await db.insert(evaluations).values({
            id: crypto.randomUUID(),
            submissionId: submitted.id,
            judgeId: userId,
            innovation,
            feasibility,
            technical,
            impact,
            presentation,
            total,
        });
        return c.json({
            message: "Evaluation submitted successfully",
            total,
        });
    }
    catch (err) {
        console.error(err);
        return c.json({ message: "Something went wrong" }, 500);
    }
};
export const fetchEvaluatedTeams = async (c) => {
    const hackathonId = c.req.param("id");
    const userId = c.get("user")?.id;
    if (!userId || !hackathonId) {
        return c.json({ message: "Missing required fields" }, 400);
    }
    // 1. Get active evaluation stage
    const activeStage = await db.query.stages.findFirst({
        where: and(eq(stages.hackathonId, hackathonId), eq(stages.type, "EVALUATION"), sql `datetime(${stages.startTime}) <= datetime('now', 'localtime')`, sql `datetime(${stages.endTime}) >= datetime('now', 'localtime')`),
    });
    let leaderboardStage = activeStage;
    if (!leaderboardStage) {
        leaderboardStage = await db.query.stages.findFirst({
            where: and(eq(stages.hackathonId, hackathonId), eq(stages.type, "EVALUATION"), sql `datetime(${stages.endTime}) < datetime('now', 'localtime')`),
            orderBy: desc(sql `datetime(${stages.endTime})`),
        });
    }
    if (!leaderboardStage) {
        return c.json({ message: "No evaluation stage found" }, 400);
    }
    const submissionStages = await db.query.stages.findMany({
        where: and(eq(stages.hackathonId, hackathonId), eq(stages.type, "SUBMISSION")),
    });
    if (!submissionStages.length) {
        return c.json({ message: "No submission stage found" }, 400);
    }
    // 4. Pick relevant submission stage
    const evalStart = toTimestamp(leaderboardStage.startTime);
    const validStages = submissionStages.filter((s) => toTimestamp(s.startTime) <= evalStart);
    const selectedStage = (validStages.length ? validStages : submissionStages).sort((a, b) => toTimestamp(b.endTime ?? b.startTime) -
        toTimestamp(a.endTime ?? a.startTime))[0];
    // 5. Build leaderboard
    const leaderboard = await db
        .select({
        teamId: teams.id,
        teamName: teams.name,
        totalScore: sql `AVG(${evaluations.total})`,
        technical: sql `AVG(${evaluations.technical})`,
        innovation: sql `AVG(${evaluations.innovation})`,
        feasibility: sql `AVG(${evaluations.feasibility})`,
        presentation: sql `AVG(${evaluations.presentation})`,
        impact: sql `AVG(${evaluations.impact})`,
        evaluationCount: sql `COUNT(${evaluations.id})`,
    })
        .from(submissions)
        .innerJoin(teams, eq(submissions.teamId, teams.id))
        .innerJoin(evaluations, eq(submissions.id, evaluations.submissionId))
        .where(and(eq(submissions.stageId, selectedStage.id), eq(teams.hackathonId, hackathonId)))
        .groupBy(teams.id)
        .orderBy(desc(sql `AVG(${evaluations.total})`));
    return c.json({ data: leaderboard });
};
export async function getStage(db, hackathonId, type) {
    const activeStage = await db.query.stages.findFirst({
        where: and(eq(stages.hackathonId, hackathonId), eq(stages.type, type), isNotNull(stages.startTime), isNotNull(stages.endTime), sql `datetime(${stages.startTime}) <= datetime('now', 'localtime')`, sql `datetime(${stages.endTime}) >= datetime('now', 'localtime')`),
    });
    if (activeStage)
        return activeStage;
    const lastStage = await db.query.stages.findFirst({
        where: and(eq(stages.hackathonId, hackathonId), eq(stages.type, type), isNotNull(stages.endTime), sql `datetime(${stages.endTime}) < datetime('now', 'localtime')`),
        orderBy: [desc(sql `datetime(${stages.endTime})`)],
    });
    return lastStage ?? null;
}
export const createShortlistedTeams = async (c) => {
    const { teamIds } = await c.req.json();
    if (!Array.isArray(teamIds) || teamIds.some((id) => typeof id !== "string")) {
        return c.json({ message: "Invalid teamIds format" }, 400);
    }
    const userId = c.get("user")?.id;
    if (!userId) {
        return c.json({ message: "Unauthorized" }, 401);
    }
    const hackathonId = c.req.param("id");
    if (!hackathonId) {
        return c.json({ message: "Hackathon ID is required" }, 400);
    }
    const isJudge = await db.query.hackathonRoles.findFirst({
        where: and(eq(hackathonRoles.hackathonId, hackathonId), eq(hackathonRoles.userId, userId), eq(hackathonRoles.role, "judge")),
    });
    if (!isJudge) {
        return c.json({ message: "Unauthorized judge" }, 403);
    }
    const activeEvaluationStage = await db.query.stages.findFirst({
        where: and(eq(stages.hackathonId, hackathonId), eq(stages.type, "EVALUATION"), isNotNull(stages.startTime), isNotNull(stages.endTime), sql `datetime(${stages.startTime}) <= datetime('now', 'localtime')`, sql `datetime(${stages.endTime}) >= datetime('now', 'localtime')`),
        orderBy: [asc(sql `datetime(${stages.startTime})`)],
    });
    if (!activeEvaluationStage) {
        return c.json({ message: "No active evaluation stage found" }, 400);
    }
    const orderedStages = await db.query.stages.findMany({
        where: and(eq(stages.hackathonId, hackathonId), isNotNull(stages.startTime)),
        orderBy: [asc(sql `datetime(${stages.startTime})`), asc(stages.id)],
    });
    const activeStageIndex = orderedStages.findIndex((stage) => stage.id === activeEvaluationStage.id);
    const nextStage = activeStageIndex >= 0 && activeStageIndex < orderedStages.length - 1
        ? orderedStages[activeStageIndex + 1]
        : null;
    if (!nextStage) {
        return c.json({ message: "No next stage available for shortlisting" }, 400);
    }
    for (const tid of teamIds) {
        const exists = await db.query.shortlistedTeams.findFirst({
            where: and(eq(shortlistedTeams.teamId, tid), eq(shortlistedTeams.hackathonId, hackathonId), eq(shortlistedTeams.stageId, nextStage.id)),
        });
        if (!exists) {
            await db.insert(shortlistedTeams).values({
                id: crypto.randomUUID(),
                teamId: tid,
                hackathonId,
                stageId: nextStage.id,
            });
        }
    }
    return c.json({ message: "Teams shortlisted successfully", nextStageId: nextStage.id }, 200);
};
export const fetchShortlistedTeams = async (c) => {
    const hackathonId = c.req.param("id");
    const userId = c.get("user")?.id;
    if (!userId) {
        return c.json({ message: "Unauthorized" }, 401);
    }
    if (!hackathonId) {
        return c.json({ message: "Hackathon ID is required" }, 400);
    }
    const finalStage = await db.query.stages.findFirst({
        where: and(eq(stages.hackathonId, hackathonId), eq(stages.type, "FINAL"), isNotNull(stages.startTime)),
        orderBy: [asc(sql `datetime(${stages.startTime})`)],
    });
    const evalStage = await getStage(db, hackathonId, "EVALUATION");
    const stageIds = [finalStage?.id, evalStage?.id].filter((stageId) => typeof stageId === "string");
    if (stageIds.length === 0) {
        return c.json({ message: "No stage available for shortlisted teams" }, 400);
    }
    const shortlistedRows = await db
        .select({
        id: shortlistedTeams.id,
        teamId: shortlistedTeams.teamId,
        teamName: teams.name,
    })
        .from(shortlistedTeams)
        .innerJoin(teams, eq(shortlistedTeams.teamId, teams.id))
        .where(and(eq(shortlistedTeams.hackathonId, hackathonId), inArray(shortlistedTeams.stageId, stageIds)))
        .orderBy(teams.name);
    const shortlisted = Array.from(new Map(shortlistedRows.map((row) => [row.teamId, row])).values());
    return c.json({ data: shortlisted });
};
