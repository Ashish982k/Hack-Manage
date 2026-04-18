import crypto from "crypto";
import {
  hackathonRoles,
  teams,
  submissions,
  stages,
  evaluations,
  shortlistedTeams,
} from "../src/db/schema";
import { eq, and, inArray, sql, desc, asc } from "drizzle-orm";
import { db } from "../src/db";
import type { Context } from "hono";

const requireAuth = (c: Context) => {
  const userId = c.get("user")?.id;
  if (!userId) return null;
  return userId;
};

const requireJudge = async (userId: string, hackathonId: string) => {
  const role = await db.query.hackathonRoles.findFirst({
    where: and(
      eq(hackathonRoles.hackathonId, hackathonId),
      eq(hackathonRoles.userId, userId),
    ),
  });
  return role?.role === "judge";
};

export const getSubmissions = async (c: Context) => {
  try {
    const userId = requireAuth(c);
    const hackathonId = c.req.param("id");
    const stageId = c.req.query("stageId")?.trim();

    if (!userId) return c.json({ message: "Unauthorized" }, 401);
    if (!hackathonId || !stageId)
      return c.json({ message: "Missing required fields" }, 400);

    const isJudge = await requireJudge(userId, hackathonId);
    if (!isJudge) return c.json({ message: "Unauthorized" }, 403);

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
      .where(
        and(
          eq(teams.hackathonId, hackathonId),
          eq(submissions.stageId, stage.id),
        ),
      );

    const evaluated = new Set(
      (
        await db
          .select({ submissionId: evaluations.submissionId })
          .from(evaluations)
          .where(
            and(
              eq(evaluations.judgeId, userId),
              inArray(
                evaluations.submissionId,
                data.map((d) => d.submissionId),
              ),
            ),
          )
      ).map((d) => d.submissionId),
    );

    return c.json({
      count: data.length,
      data: data.map((d) => ({
        ...d,
        evaluated: evaluated.has(d.submissionId),
      })),
    });
  } catch {
    return c.json({ message: "Something went wrong" }, 500);
  }
};

export const evaluateSubmission = async (c: Context) => {
  try {
    const userId = requireAuth(c);
    const hackathonId = c.req.param("id");
    const teamId = c.req.param("teamId");
    const stageId = c.req.query("stageId")?.trim();

    if (!userId || !hackathonId || !teamId || !stageId)
      return c.json({ message: "Missing required fields" }, 400);

    const isJudge = await requireJudge(userId, hackathonId);
    if (!isJudge) return c.json({ message: "Unauthorized" }, 403);

    const submission = await db.query.submissions.findFirst({
      where: and(
        eq(submissions.teamId, teamId),
        eq(submissions.stageId, stageId),
      ),
    });

    const submissionId = submission?.id ?? crypto.randomUUID();

    if (!submission) {
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
    const scores = ["innovation", "feasibility", "technical", "impact", "presentation"].map((k) =>
      Number(form.get(k)),
    );

    if (scores.some((s) => !Number.isInteger(s) || s < 0 || s > 10)) {
      return c.json({ message: "Invalid scores" }, 400);
    }

    const [innovation, feasibility, technical, impact, presentation] = scores;
    const total = scores.reduce((a, b) => a + b, 0);

    const existing = await db.query.evaluations.findFirst({
      where: and(
        eq(evaluations.submissionId, submissionId),
        eq(evaluations.judgeId, userId),
      ),
    });

    if (existing) {
      await db
        .update(evaluations)
        .set({ innovation, feasibility, technical, impact, presentation, total })
        .where(eq(evaluations.id, existing.id));
    } else {
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
  } catch {
    return c.json({ message: "Something went wrong" }, 500);
  }
};

export const fetchEvaluatedTeams = async (c: Context) => {
  const hackathonId = c.req.param("id");
  const stageId = c.req.query("stageId")?.trim();

  if (!hackathonId || !stageId)
    return c.json({ message: "Missing required fields" }, 400);

  const data = await db
    .select({
      teamId: teams.id,
      teamName: teams.name,
      total: sql<number>`AVG(${evaluations.total})`,
    })
    .from(submissions)
    .innerJoin(teams, eq(submissions.teamId, teams.id))
    .innerJoin(evaluations, eq(submissions.id, evaluations.submissionId))
    .where(
      and(
        eq(submissions.stageId, stageId),
        eq(teams.hackathonId, hackathonId),
      ),
    )
    .groupBy(teams.id)
    .orderBy(desc(sql`AVG(${evaluations.total})`));

  return c.json({ data });
};

export const createShortlistedTeams = async (c: Context) => {
  const userId = requireAuth(c);
  const hackathonId = c.req.param("id");
  const { stageId, teamIds } = await c.req.json();

  if (!userId || !hackathonId || !stageId || !Array.isArray(teamIds))
    return c.json({ message: "Invalid input" }, 400);

  const validTeams = await db.query.teams.findMany({
    where: and(
      eq(teams.hackathonId, hackathonId),
      inArray(teams.id, teamIds),
    ),
    columns: { id: true },
  });

  if (validTeams.length !== teamIds.length)
    return c.json({ message: "Invalid teams" }, 400);

  await db.insert(shortlistedTeams).values(
    teamIds.map((teamId: string) => ({
      id: crypto.randomUUID(),
      teamId,
      hackathonId,
      stageId,
    })),
  );

  return c.json({ success: true });
};

export const confirmFinalWinners = async (c: Context) => {
  const userId = requireAuth(c);
  const hackathonId = c.req.param("id");
  const { finalStageId, winnerCount } = await c.req.json();

  if (!userId || !hackathonId || !finalStageId || !winnerCount)
    return c.json({ message: "Invalid input" }, 400);

  const ranked = await db
    .select({
      teamId: teams.id,
      total: sql<number>`AVG(${evaluations.total})`,
    })
    .from(submissions)
    .innerJoin(teams, eq(submissions.teamId, teams.id))
    .innerJoin(evaluations, eq(submissions.id, evaluations.submissionId))
    .where(
      and(
        eq(submissions.stageId, finalStageId),
        eq(teams.hackathonId, hackathonId),
      ),
    )
    .groupBy(teams.id)
    .orderBy(desc(sql`AVG(${evaluations.total})`));

  const winners = ranked.slice(0, winnerCount).map((t) => t.teamId);

  await db.delete(shortlistedTeams).where(eq(shortlistedTeams.stageId, finalStageId));

  await db.insert(shortlistedTeams).values(
    winners.map((teamId) => ({
      id: crypto.randomUUID(),
      teamId,
      hackathonId,
      stageId: finalStageId,
    })),
  );

  return c.json({ winners });
};

export const fetchShortlistedTeams = async (c: Context) => {
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
    .where(
      and(
        eq(shortlistedTeams.hackathonId, hackathonId),
        eq(shortlistedTeams.stageId, stageId),
      ),
    );

  return c.json({ data });
};
