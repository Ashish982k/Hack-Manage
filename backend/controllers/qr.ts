import { db } from "../src/db";
import {
  shortlistedTeams,
  hackathonSchedules,
  teamMembers,
  hackathonRoles,
  hackathons,
  stages,
  qrCodes,
  teams,
} from "../src/db/schema";
import { and, eq } from "drizzle-orm";
import type { HonoEnv } from "../types";
import type { Context } from "hono";
import crypto from "crypto";

type AppContext = Context<HonoEnv>;

const getFinalStage = async (hackathonId: string) => {
  const finalStage = await db
    .select({ id: stages.id })
    .from(stages)
    .where(and(eq(stages.hackathonId, hackathonId), eq(stages.type, "FINAL")));

  if (finalStage.length === 0) return null;
  return finalStage[0].id;
};

export const generateQR = async (c: AppContext) => {
  const hackathonId = c.req.param("id");

  if (!hackathonId) {
    return c.json({ error: "Hackathon ID is required" }, 400);
  }

  const userId = c.get("user")?.id;
  if (!userId) {
    return c.json({ error: "Unauthorized" }, 401);
  }
  const team = await db
    .select({ teamId: teams.id })
    .from(teamMembers)
    .innerJoin(teams, eq(teamMembers.teamId, teams.id))
    .where(
      and(eq(teamMembers.userId, userId), eq(teams.hackathonId, hackathonId)),
    )
    .limit(1);

  if (team.length === 0) {
    return c.json({ error: "Team not found for this user" }, 404);
  }

  const teamId = team[0].teamId;
  const finalStageId = await getFinalStage(hackathonId);
  if (!finalStageId) {
    return c.json({ error: "Final stage not found for this hackathon" }, 404);
  }

  const finalRoundTeam = await db.query.shortlistedTeams.findFirst({
    where: and(
      eq(shortlistedTeams.teamId, teamId),
      eq(shortlistedTeams.hackathonId, hackathonId),
      eq(shortlistedTeams.stageId, finalStageId),
    ),
  });

  if (!finalRoundTeam) {
    return c.json({ error: "Team not shortlisted for final round" }, 403);
  }

  const schedules = await db
    .select({
      type: hackathonSchedules.type,
      endTime: hackathonSchedules.endTime,
    })
    .from(hackathonSchedules)
    .where(eq(hackathonSchedules.hackathonId, hackathonId));

  if (schedules.length === 0) {
    return c.json({ error: "No schedule configured for final round" }, 400);
  }

  const qrData: any[] = [];

  for (const schedule of schedules) {
    const existing = await db.query.qrCodes.findFirst({
      where: and(
        eq(qrCodes.hackathonId, hackathonId),
        eq(qrCodes.userId, userId),
        eq(qrCodes.teamId, teamId),
        eq(qrCodes.type, schedule.type),
      ),
    });

    if (existing) {
      qrData.push({
        type: schedule.type,
        token: existing.token,
        expiresAt: existing.expiresAt,
      });
      continue;
    }

    const qrId = crypto.randomUUID();
    const token = crypto.randomBytes(32).toString("hex");

    await db.insert(qrCodes).values({
      id: qrId,
      hackathonId,
      userId,
      teamId,
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

  return c.json({
    message: "QRs fetched/generated successfully",
    data: qrData,
  });
};

export const markQR = async (c: AppContext) => {
  const userId = c.get("user")?.id;
  if (!userId) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const hackathonId = c.req.param("id");
  const { token } = await c.req.json();

  if (!hackathonId || !token) {
    return c.json({ error: "Hackathon ID and token are required" }, 400);
  }

  const isAdmin = await db
    .select({ role: hackathonRoles.role })
    .from(hackathonRoles)
    .where(
      and(
        eq(hackathonRoles.hackathonId, hackathonId),
        eq(hackathonRoles.userId, userId),
        eq(hackathonRoles.role, "admin")
      )
    )
    .limit(1);


  const isJudge = await db
    .select({ role: hackathonRoles.role })
    .from(hackathonRoles)
    .where(
      and(
        eq(hackathonRoles.hackathonId, hackathonId),
        eq(hackathonRoles.userId, userId),
        eq(hackathonRoles.role, "judge")
      )
    )
    .limit(1);

  if (isJudge.length === 0 && isAdmin.length === 0) {
    return c.json({ error: "Not a judge or admin" }, 403);
  }

  const qr = await db
    .select({
      id: qrCodes.id,
      isUsed: qrCodes.isUsed,
      expiresAt: qrCodes.expiresAt,
      teamId: qrCodes.teamId, 
      type: qrCodes.type,
    })
    .from(qrCodes)
    .where(
      and(
        eq(qrCodes.hackathonId, hackathonId),
        eq(qrCodes.token, token)
      )
    )
    .limit(1);

  if (qr.length === 0) {
    return c.json({ error: "QR code not found" }, 404);
  }

  if(isJudge.length > 0){
    return c.json({
      role: "judge",
      teamId: qr[0].teamId
    });
  }

  if (qr[0].isUsed) {
    return c.json({ error: "QR code already used" }, 400);
  }

  if (new Date(qr[0].expiresAt) < new Date()) {
    return c.json({ error: "QR code has expired" }, 400);
  }

  await db
    .update(qrCodes)
    .set({ isUsed: true })
    .where(
      and(
        eq(qrCodes.hackathonId, hackathonId),
        eq(qrCodes.token, token)
      )
    );

  return c.json({
    role: "admin",
    message: "QR code marked as used",
    type: qr[0].type,
  }, 200);
};
