import { mkdir, writeFile } from "fs/promises";
import path from "path";
import crypto from "crypto";
import { and, asc, desc, eq, sql } from "drizzle-orm";
import { db } from "../src/db";
import {
  hackathons,
  hackathonParticipants,
  evaluations,
  problemStatements,
  submissions,
  teamMembers,
  stages,
  hackathonSchedules,
  teams,
  user,
  hackathonRoles,
} from "../src/db/schema";
import type { Context } from "hono";
import type { HonoEnv } from "../types";

type ProblemStatementInput =
  | string
  | {
      title?: string;
      description?: string;
      body?: string;
    };

type StageInput = {
  title?: string;
  description?: string;
  startDate?: string;
  endDate?: string;
  type?: unknown;
};

type HackathonScheduleInput = {
  type?: unknown;
  startTime?: unknown;
  endTime?: unknown;
};

type FileLike = {
  name: string;
  arrayBuffer: () => Promise<ArrayBuffer>;
};

type HackathonRoleType = "admin" | "judge";

const getFile = (value: unknown): FileLike | null => {
  const file = Array.isArray(value) ? value[0] : value;

  if (
    file &&
    typeof file === "object" &&
    typeof (file as any).name === "string" &&
    typeof (file as any).arrayBuffer === "function"
  ) {
    return file as FileLike;
  }

  return null;
};

const normalizeEmail = (email: string) => email.trim();

const parseEmailList = (value: unknown): string[] | null => {
  const normalizeList = (input: unknown[]) =>
    Array.from(
      new Set(
        input
          .map((item) =>
            typeof item === "string" ? normalizeEmail(item) : "",
          )
          .filter(Boolean),
      ),
    );

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
    } catch {
      return null;
    }
  }

  return normalizeList(raw.split(","));
};

const parseStageType = (
  value: unknown,
): "SUBMISSION" | "EVALUATION" | "FINAL" | null => {
  if (value === "SUBMISSION" || value === "EVALUATION" || value === "FINAL") {
    return value;
  }

  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim().toUpperCase();
  if (
    normalized === "SUBMISSION" ||
    normalized === "EVALUATION" ||
    normalized === "FINAL"
  ) {
    return normalized;
  }

  return null;
};

const parseScheduleType = (
  value: unknown,
): "entry" | "breakfast" | "lunch" | "dinner" | null => {
  if (
    value === "entry" ||
    value === "breakfast" ||
    value === "lunch" ||
    value === "dinner"
  ) {
    return value;
  }

  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim().toLowerCase();
  if (
    normalized === "entry" ||
    normalized === "breakfast" ||
    normalized === "lunch" ||
    normalized === "dinner"
  ) {
    return normalized;
  }

  return null;
};

const isDateTimeValue = (value: string) =>
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value) &&
  Number.isFinite(Date.parse(value));

const isHackathonAdmin = async (
  hackathonId: string,
  userId: string,
  createdBy: string,
) => {
  if (createdBy === userId) return true;

  const role = await db.query.hackathonRoles.findFirst({
    where: and(
      eq(hackathonRoles.hackathonId, hackathonId),
      eq(hackathonRoles.userId, userId),
      eq(hackathonRoles.role, "admin"),
    ),
  });

  return Boolean(role);
};

const isHackathonJudge = async (hackathonId: string, userId: string) => {
  const role = await db.query.hackathonRoles.findFirst({
    where: and(
      eq(hackathonRoles.hackathonId, hackathonId),
      eq(hackathonRoles.userId, userId),
      eq(hackathonRoles.role, "judge"),
    ),
  });

  return Boolean(role);
};

const resolveRoleAssignments = async ({
  creatorId,
  admins,
  judges,
}: {
  creatorId: string;
  admins: string[];
  judges: string[];
}): Promise<
  | { roleAssignments: Map<string, HackathonRoleType> }
  | { error: string }
> => {
  const roleAssignments = new Map<string, HackathonRoleType>();
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

const persistRoleAssignments = async (
  hackathonId: string,
  roleAssignments: Map<string, HackathonRoleType>,
) => {
  for (const [userId, role] of roleAssignments) {
    await db.insert(hackathonRoles).values({
      id: crypto.randomUUID(),
      userId,
      hackathonId,
      role,
    });
  }
};

const getHackathonRoleEmails = async (hackathonId: string, creatorId: string) => {
  const rows = await db
    .select({
      role: hackathonRoles.role,
      email: user.email,
    })
    .from(hackathonRoles)
    .innerJoin(user, eq(hackathonRoles.userId, user.id))
    .where(eq(hackathonRoles.hackathonId, hackathonId));

  const admins = new Set<string>();
  const judges = new Set<string>();

  for (const row of rows) {
    const email = normalizeEmail(row.email);
    if (!email) continue;

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

type AppContext = Context<HonoEnv>;

const findMembershipForHackathon = async (
  userId: string,
  hackathonId: string,
) => {
  const memberships = await db.query.teamMembers.findMany({
    where: eq(teamMembers.userId, userId),
    with: { team: true },
  });

  return memberships.find((m) => m.team.hackathonId === hackathonId) || null;
};

const ensureParticipant = async (hackathonId: string, userId: string) => {
  const existing = await db.query.hackathonParticipants.findFirst({
    where: and(
      eq(hackathonParticipants.hackathonId, hackathonId),
      eq(hackathonParticipants.userId, userId),
    ),
  });

  if (existing) return existing;

  const newParticipant = {
    id: crypto.randomUUID(),
    hackathonId,
    userId,
  };

  await db.insert(hackathonParticipants).values(newParticipant);

  return newParticipant;
};

export const upload = async (c: AppContext) => {
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

    const isAdminParticipant = await isHackathonAdmin(
      hackathonId,
      currentUser.id,
      hackathon.createdBy,
    );

    if (isAdminParticipant) {
      return c.json(
        { message: "Hackathon admins cannot participate in this hackathon." },
        403,
      );
    }

    const { driveUrl, githubUrl, problemStatementId } = await c.req.json();

    if (!driveUrl) {
      return c.json({ message: "Drive URL is required" }, 400);
    }

    const membership = await findMembershipForHackathon(
      currentUser.id,
      hackathonId
    );

    if (!membership) {
      return c.json({ message: "Not in a team" }, 400);
    }

    const teamId = membership.team.id;

    
    const activeStage = await db.query.stages.findFirst({
      where: and(
        eq(stages.hackathonId, hackathonId),
        sql`datetime(${stages.startTime}) <= datetime('now', 'localtime')`,
        sql`datetime(${stages.endTime}) >= datetime('now', 'localtime')`,
      ),
    });

    if (!activeStage) {
      return c.json(
        { message: "No active stage, submission not allowed" },
        400
      );
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
      where: and(
        eq(submissions.teamId, teamId),
        eq(submissions.stageId, activeStage.id)
      ),
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
        return c.json(
          { message: "Submission has already been evaluated and cannot be updated" },
          400,
        );
      }

      await db
        .update(submissions)
        .set({
          ...data,
          submittedAt: sql`CURRENT_TIMESTAMP`,
        })
        .where(eq(submissions.id, existing.id));

      return c.json({ message: "Submission updated" });
    } else {
      await db.insert(submissions).values({
        id: crypto.randomUUID(),
        teamId,
        stageId: activeStage.id,
        ...data,
      });

      return c.json({ message: "Submission created" });
    }
  } catch (error) {
    console.error(error);
    return c.json({ message: "Something went wrong" }, 500);
  }
};

export const newHackathon = async (c: AppContext) => {
  try {
    const currentUser = c.get("user");
    if (!currentUser) return c.json({ message: "Unauthorized" }, 401);

    const data = await c.req.parseBody();
    const file = getFile(data.headerImage);

    if (
      !data.title ||
      !data.startDate ||
      !data.endDate ||
      !data.registrationDeadline ||
      !data.admins ||
      !data.judges
    ) {
      return c.json(
        {
          message:
            "Title, start date, end date, registration deadline, admins and judges are required",
        },
        400,
      );
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

    const safeTitle = (data.title as string)
      .toLowerCase()
      .replace(/\s+/g, "-")
      .replace(/[^a-z0-9-]/g, "");

    let filePath: string | undefined;

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
      title: data.title as string,
      description: data.description as string,
      headerImage: filePath ?? null,
      startDate: data.startDate as string,
      endDate: data.endDate as string,
      registrationDeadline: data.registrationDeadline as string,
      location: data.location as string,
      createdBy: currentUser.id,
    });

    await persistRoleAssignments(hackathonId, roleResolution.roleAssignments);

    const stagesData = JSON.parse((data.stages as string) || "[]") as StageInput[];

    for (const stage of stagesData) {
      const stageTitle = (stage.title ?? "").trim();
      if (!stageTitle) {
        return c.json({ message: "Stage title is required" }, 400);
      }

      const stageType = parseStageType(stage.type);
      if (!stageType) {
        return c.json(
          { message: "Each stage must have type SUBMISSION, EVALUATION, or FINAL" },
          400,
        );
      }

      await db.insert(stages).values({
        id: crypto.randomUUID(),
        hackathonId,
        title: stageTitle,
        description:
          typeof stage.description === "string" ? stage.description : undefined,
        type: stageType,
        startTime:
          typeof stage.startDate === "string" ? stage.startDate : undefined,
        endTime: typeof stage.endDate === "string" ? stage.endDate : undefined,
      });
    }

    const problems = JSON.parse((data.problemStatements as string) || "[]");

    for (const p of problems) {
      let title = "";
      let description = "";

      if (typeof p === "string") {
        title = p.trim();
      } else {
        title = (p.title ?? "").trim();
        description = (p.description ?? p.body ?? "").trim();
      }

      if (!title) continue;

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
  } catch (error) {
    console.error(error);
    return c.json({ message: "Something went wrong" }, 500);
  }
};

export const saveHackathonSchedules = async (c: AppContext) => {
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

    const canManage = await isHackathonAdmin(
      hackathonId,
      currentUser.id,
      hackathon.createdBy,
    );

    if (!canManage) {
      return c.json({ message: "Access to admin only" }, 403);
    }

    const body = await c.req.json().catch(() => null);

    if (!body || typeof body !== "object") {
      return c.json({ message: "Invalid request body" }, 400);
    }

    const schedules = (body as { schedules?: unknown }).schedules;

    if (!Array.isArray(schedules)) {
      return c.json({ message: "Schedules are required" }, 400);
    }

    const requiredTypes: Array<"entry" | "breakfast" | "lunch" | "dinner"> = [
      "entry",
      "breakfast",
      "lunch",
      "dinner",
    ];

    if (schedules.length !== requiredTypes.length) {
      return c.json(
        {
          message:
            "Schedules for entry, breakfast, lunch, and dinner are required.",
        },
        400,
      );
    }

    const seenTypes = new Set<string>();
    const normalizedSchedules: Array<{
      type: "entry" | "breakfast" | "lunch" | "dinner";
      startTime: string;
      endTime: string;
    }> = [];

    for (const item of schedules) {
      if (!item || typeof item !== "object") {
        return c.json({ message: "Invalid schedules format" }, 400);
      }

      const schedule = item as HackathonScheduleInput;
      const scheduleType = parseScheduleType(schedule.type);

      if (!scheduleType) {
        return c.json({ message: "Invalid schedule type" }, 400);
      }

      if (seenTypes.has(scheduleType)) {
        return c.json({ message: "Duplicate schedule type found" }, 400);
      }
      seenTypes.add(scheduleType);

      const startTime =
        typeof schedule.startTime === "string" ? schedule.startTime.trim() : "";
      const endTime =
        typeof schedule.endTime === "string" ? schedule.endTime.trim() : "";

      if (!startTime || !isDateTimeValue(startTime)) {
        return c.json(
          {
            message:
              "Each schedule must have a valid startTime in YYYY-MM-DDTHH:MM format",
          },
          400,
        );
      }

      if (!endTime || !isDateTimeValue(endTime)) {
        return c.json(
          {
            message:
              "Each schedule must have a valid endTime in YYYY-MM-DDTHH:MM format",
          },
          400,
        );
      }

      if (Date.parse(startTime) >= Date.parse(endTime)) {
        return c.json(
          { message: `${scheduleType} schedule startTime must be before endTime` },
          400,
        );
      }

      normalizedSchedules.push({
        type: scheduleType,
        startTime,
        endTime,
      });
    }

    for (const requiredType of requiredTypes) {
      if (!seenTypes.has(requiredType)) {
        return c.json(
          {
            message:
              "Schedules for entry, breakfast, lunch, and dinner are required.",
          },
          400,
        );
      }
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
  } catch (error) {
    console.error(error);

    const isScheduleTableMissing =
      error instanceof Error &&
      error.message.toLowerCase().includes("no such table: hackathon_schedules");

    if (isScheduleTableMissing) {
      return c.json(
        {
          message:
            "Schedule storage is not initialized. Please run database migrations and retry.",
        },
        500,
      );
    }

    return c.json({ message: "Something went wrong" }, 500);
  }
};

export const getHackathonRoles = async (c: AppContext) => {
  try {
    const hackathonId = c.req.param("id");
    const currentUser = c.get("user");

    if (!hackathonId) return c.json({ message: "Hackathon not found" }, 404);
    if (!currentUser) return c.json({ message: "Unauthorized" }, 401);

    const hackathon = await db.query.hackathons.findFirst({
      where: eq(hackathons.id, hackathonId),
    });

    if (!hackathon) return c.json({ message: "Hackathon not found" }, 404);

    const canManage = await isHackathonAdmin(
      hackathonId,
      currentUser.id,
      hackathon.createdBy,
    );

    if (!canManage) {
      return c.json({ message: "Access to admin only" }, 403);
    }

    const roles = await getHackathonRoleEmails(hackathonId, hackathon.createdBy);
    return c.json(roles);
  } catch (error) {
    console.error(error);
    return c.json({ message: "Something went wrong" }, 500);
  }
};

export const getJudgeAccess = async (c: AppContext) => {
  try {
    const hackathonId = c.req.param("id");
    const currentUser = c.get("user");

    if (!hackathonId) return c.json({ message: "Hackathon not found" }, 404);
    if (!currentUser) return c.json({ message: "Unauthorized" }, 401);

    const hackathon = await db.query.hackathons.findFirst({
      where: eq(hackathons.id, hackathonId),
    });

    if (!hackathon) return c.json({ message: "Hackathon not found" }, 404);

    const isJudge = await isHackathonJudge(hackathonId, currentUser.id);
    const isAdmin = await isHackathonAdmin(
      hackathonId,
      currentUser.id,
      hackathon.createdBy,
    );
    const activeStage = await db.query.stages.findFirst({
      where: and(
        eq(stages.hackathonId, hackathonId),
        sql`datetime(${stages.startTime}) <= datetime('now', 'localtime')`,
        sql`datetime(${stages.endTime}) >= datetime('now', 'localtime')`,
      ),
      orderBy: [desc(sql`datetime(${stages.startTime})`)],
    });

    return c.json({
      isJudge,
      isAdmin,
      activeStageType: activeStage?.type ?? null,
    });
  } catch (error) {
    console.error(error);
    return c.json({ message: "Something went wrong" }, 500);
  }
};

export const updateHackathonRoles = async (c: AppContext) => {
  try {
    const hackathonId = c.req.param("id");
    const currentUser = c.get("user");

    if (!hackathonId) return c.json({ message: "Hackathon not found" }, 404);
    if (!currentUser) return c.json({ message: "Unauthorized" }, 401);

    const hackathon = await db.query.hackathons.findFirst({
      where: eq(hackathons.id, hackathonId),
    });

    if (!hackathon) return c.json({ message: "Hackathon not found" }, 404);

    const canManage = await isHackathonAdmin(
      hackathonId,
      currentUser.id,
      hackathon.createdBy,
    );

    if (!canManage) {
      return c.json({ message: "Access to admin only" }, 403);
    }

    let payload: unknown;
    try {
      payload = await c.req.json();
    } catch {
      return c.json({ message: "Invalid request body" }, 400);
    }

    if (typeof payload !== "object" || payload === null) {
      return c.json({ message: "Invalid request body" }, 400);
    }

    const { admins: rawAdmins, judges: rawJudges } = payload as {
      admins?: unknown;
      judges?: unknown;
    };

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
  } catch (error) {
    console.error(error);
    return c.json({ message: "Something went wrong" }, 500);
  }
};

export const getMember = async (c: AppContext) => {
  try {
    const hackathonId = c.req.param("id");
    const user = c.get("user");

    if (!hackathonId) return c.json({ message: "Hackathon not found" }, 404);
    if (!user) return c.json({ message: "Unauthorized" }, 401);

    const userId = user.id;

    const hackathon = await db.query.hackathons.findFirst({
      where: eq(hackathons.id, hackathonId),
    });

    if (!hackathon) return c.json({ message: "Hackathon not found" }, 404);

    const isAdminParticipant = await isHackathonAdmin(
      hackathonId,
      userId,
      hackathon.createdBy,
    );

    if (isAdminParticipant) {
      return c.json({ joined: false, team: null });
    }

    const participant = await db.query.hackathonParticipants.findFirst({
      where: and(
        eq(hackathonParticipants.hackathonId, hackathonId),
        eq(hackathonParticipants.userId, userId),
      ),
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
    const submissionScoreBreakdown = latestSubmission
      ? (
          await db
            .select({
              technical: sql<number>`COALESCE(AVG(${evaluations.technical}), 0)`,
              feasibility: sql<number>`COALESCE(AVG(${evaluations.feasibility}), 0)`,
              innovation: sql<number>`COALESCE(AVG(${evaluations.innovation}), 0)`,
              presentation: sql<number>`COALESCE(AVG(${evaluations.presentation}), 0)`,
              impact: sql<number>`COALESCE(AVG(${evaluations.impact}), 0)`,
              totalScore: sql<number>`COALESCE(AVG(${evaluations.total}), 0)`,
              evaluationCount: sql<number>`COUNT(${evaluations.id})`,
            })
            .from(evaluations)
            .where(eq(evaluations.submissionId, latestSubmission.id))
        )[0]
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
  } catch {
    return c.json({ message: "Something went wrong" }, 500);
  }
};

export const joinHackathon = async (c: AppContext) => {
  try {
    const userId = c.get("user").id;
    const hackathonId = c.req.param("id");

    if (!hackathonId) return c.json({ message: "Hackathon not found" }, 404);

    const hackathon = await db.query.hackathons.findFirst({
      where: eq(hackathons.id, hackathonId),
    });

    if (!hackathon) return c.json({ message: "Hackathon not found" }, 404);

    const isAdminParticipant = await isHackathonAdmin(
      hackathonId,
      userId,
      hackathon.createdBy,
    );

    if (isAdminParticipant) {
      return c.json(
        { message: "Hackathon admins cannot participate in this hackathon." },
        403,
      );
    }

    await ensureParticipant(hackathonId, userId);

    return c.json({ message: "Joined" });
  } catch {
    return c.json({ message: "Something went wrong" }, 500);
  }
};

export const deleteUser = async (c: AppContext) => {
  try {
    const hackathonId = c.req.param("id");
    const userId = c.get("user").id;

    if (!hackathonId) return c.json({ message: "Hackathon not found" }, 404);

    const participant = await db.query.hackathonParticipants.findFirst({
      where: and(
        eq(hackathonParticipants.hackathonId, hackathonId),
        eq(hackathonParticipants.userId, userId),
      ),
    });

    if (!participant) return c.json({ message: "Not joined" }, 404);

    const membership = await findMembershipForHackathon(userId, hackathonId);

    if (membership) {
      if (membership.team.leaderId === userId) {
        await db.delete(teams).where(eq(teams.id, membership.team.id));
      } else {
        await db.delete(teamMembers).where(eq(teamMembers.id, membership.id));
      }
    }

    await db
      .delete(hackathonParticipants)
      .where(eq(hackathonParticipants.id, participant.id));

    return c.json({ message: "Left hackathon" });
  } catch {
    return c.json({ message: "Something went wrong" }, 500);
  }
};



