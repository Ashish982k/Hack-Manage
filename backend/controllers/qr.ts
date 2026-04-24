import { db } from "../src/db";
import {
  shortlistedTeams,
  hackathonSchedules,
  teamMembers,
  hackathonRoles,
  stages,
  qrCodes,
  teams,
} from "../src/db/schema";
import { and, asc, eq, inArray } from "drizzle-orm";
import type { HonoEnv } from "../types";
import type { Context } from "hono";
import crypto from "crypto";

type AppContext = Context<HonoEnv>;

const resolveFinalStage = async (hackathonId: string) => {
  return db.query.stages.findFirst({
    where: and(
      eq(stages.hackathonId, hackathonId),
      eq(stages.type, "FINAL")
    ),
    orderBy: [asc(stages.id)],
  });
};

const resolveStageBeforeFinal = async (hackathonId: string, finalStageId: string) => {
  const stageRows = await db.query.stages.findMany({
    where: eq(stages.hackathonId, hackathonId),
    columns: {
      id: true,
      startTime: true,
    },
    orderBy: [asc(stages.startTime), asc(stages.id)],
  });

  const finalIndex = stageRows.findIndex((stage) => stage.id === finalStageId);
  if (finalIndex <= 0) return null;

  return stageRows[finalIndex - 1];
};

export const generateQR = async (c: AppContext) => {
  const hackathonId = c.req.param("id");
  const userId = c.get("user")?.id;

  if (!hackathonId) return c.json({ error: "Hackathon ID required" }, 400);
  if (!userId) return c.json({ error: "Unauthorized" }, 401);

  const userTeams = await db
    .select({ teamId: teams.id })
    .from(teamMembers)
    .innerJoin(teams, eq(teamMembers.teamId, teams.id))
    .where(
      and(
        eq(teamMembers.userId, userId),
        eq(teamMembers.status, "approved"),
        eq(teams.hackathonId, hackathonId)
      )
    );

  if (userTeams.length === 0) {
    return c.json({ error: "No team found" }, 404);
  }

  const finalStage = await resolveFinalStage(hackathonId);
  if (!finalStage) {
    return c.json({ error: "Final stage not found" }, 404);
  }

  let shortlisted = await db.query.shortlistedTeams.findFirst({
    where: and(
      eq(shortlistedTeams.hackathonId, hackathonId),
      eq(shortlistedTeams.stageId, finalStage.id),
      inArray(
        shortlistedTeams.teamId,
        userTeams.map((t) => t.teamId)
      )
    ),
  });

  if (!shortlisted) {
    const stageBeforeFinal = await resolveStageBeforeFinal(hackathonId, finalStage.id);
    if (stageBeforeFinal) {
      shortlisted = await db.query.shortlistedTeams.findFirst({
        where: and(
          eq(shortlistedTeams.hackathonId, hackathonId),
          eq(shortlistedTeams.stageId, stageBeforeFinal.id),
          inArray(
            shortlistedTeams.teamId,
            userTeams.map((t) => t.teamId)
          )
        ),
      });
    }
  }

  if (!shortlisted) {
    return c.json({ error: "Not shortlisted for final" }, 403);
  }

  const schedules = await db
    .select({
      type: hackathonSchedules.type,
      endTime: hackathonSchedules.endTime,
    })
    .from(hackathonSchedules)
    .where(eq(hackathonSchedules.hackathonId, hackathonId));

  const qrData: Array<{
    type: "entry" | "breakfast" | "lunch" | "dinner";
    token: string;
    expiresAt: string;
  }> = [];

  for (const schedule of schedules) {
    const existing = await db.query.qrCodes.findFirst({
      where: and(
        eq(qrCodes.hackathonId, hackathonId),
        eq(qrCodes.userId, userId),
        eq(qrCodes.teamId, shortlisted.teamId),
        eq(qrCodes.type, schedule.type)
      ),
    });

    if (existing) {
      qrData.push({
        type: existing.type,
        token: existing.token,
        expiresAt: existing.expiresAt,
      });
      continue;
    }

    const token = crypto.randomBytes(32).toString("hex");

    await db.insert(qrCodes).values({
      id: crypto.randomUUID(),
      hackathonId,
      userId,
      teamId: shortlisted.teamId,
      type: schedule.type,
      token,
      expiresAt: schedule.endTime,
    });

    qrData.push({
      type: schedule.type,
      token,
      expiresAt: schedule.endTime,
    });
  }

  return c.json({ success: true, data: qrData });
};

export const markQR = async (c: AppContext) => {
  const userId = c.get("user")?.id;
  const hackathonId = c.req.param("id");

  const body = await c.req.json().catch(() => null);
  const token =
    body && typeof body.token === "string" ? body.token.trim() : "";

  if (!userId) return c.json({ success: false, message: "Unauthorized" }, 401);
  if (!hackathonId || !token)
    return c.json({ success: false, message: "Invalid QR" }, 400);

  const qr = await db.query.qrCodes.findFirst({
    where: and(eq(qrCodes.hackathonId, hackathonId), eq(qrCodes.token, token)),
  });

  if (!qr) {
    return c.json({ success: false, message: "Invalid QR code" }, 400);
  }

  const roleData = await db.query.hackathonRoles.findFirst({
    where: and(
      eq(hackathonRoles.hackathonId, hackathonId),
      eq(hackathonRoles.userId, userId)
    ),
  });

  const role = roleData?.role || "participant";

  if (role === "judge") {
    const finalStage = await resolveFinalStage(hackathonId);
    if (!finalStage) {
      return c.json({ success: false, message: "Final stage not found" }, 404);
    }

    return c.json({
      success: true,
      redirect: `/hackathons/${hackathonId}/judge/final/evaluate/${qr.teamId}?stageId=${finalStage.id}`,
      role: "judge",
      teamId: qr.teamId,
      stageId: finalStage.id,
    });
  }

  if (new Date(qr.expiresAt).getTime() <= Date.now()) {
    return c.json({ success: false, message: "QR expired" }, 400);
  }

  if (qr.isUsed) {
    return c.json({ success: false, message: "QR code already used" }, 400);
  }

  const isOwner = qr.userId === userId;

  const isTeamMember = await db.query.teamMembers.findFirst({
    where: and(
      eq(teamMembers.teamId, qr.teamId),
      eq(teamMembers.userId, userId),
      eq(teamMembers.status, "approved")
    ),
  });

  if (!isOwner && !isTeamMember && role !== "admin") {
    return c.json({ success: false, message: "Not allowed" }, 403);
  }

  await db
    .update(qrCodes)
    .set({ isUsed: true })
    .where(eq(qrCodes.id, qr.id));

  return c.json({
    success: true,
    message: "QR scanned successfully",
    teamId: qr.teamId,
  });
};
