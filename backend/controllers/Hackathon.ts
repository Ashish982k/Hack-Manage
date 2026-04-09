import { mkdir, writeFile } from "fs/promises";
import path from "path";
import crypto from "crypto";
import { and, eq } from "drizzle-orm";
import { db } from "../src/db";
import {
  hackathons,
  hackathonParticipants,
  problemStatements,
  submissions,
  teamMembers,
  stages,
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

type FileLike = {
  name: string;
  arrayBuffer: () => Promise<ArrayBuffer>;
};

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
    const user = c.get("user");
    if (!hackathonId) return c.json({ message: "Hackathon not found" }, 404);
    if (!user) return c.json({ message: "Unauthorized" }, 401);

    const { driveUrl, githubUrl, problemStatementId } = await c.req.json();
    if (!driveUrl) return c.json({ message: "Drive URL is required" }, 400);

    const membership = await findMembershipForHackathon(user.id, hackathonId);
    if (!membership) return c.json({ message: "Not in a team" }, 400);

    const teamId = membership.team.id;

    const problems = await db.query.problemStatements.findMany({
      where: eq(problemStatements.hackathonId, hackathonId),
    });

    if (problems.length && !problemStatementId) {
      return c.json({ message: "Problem statement required" }, 400);
    }

    const existing = await db.query.submissions.findFirst({
      where: eq(submissions.teamId, teamId),
    });

    const data = {
      pptUrl: driveUrl,
      githubUrl,
      problemStatementId,
    };

    if (existing) {
      await db
        .update(submissions)
        .set(data)
        .where(eq(submissions.id, existing.id));
    } else {
      await db.insert(submissions).values({
        id: crypto.randomUUID(),
        teamId,
        round: 1,
        ...data,
      });
    }

    return c.json({ message: "Submitted" });
  } catch {
    return c.json({ message: "Something went wrong" }, 500);
  }
};

export const newHackathon = async (c: AppContext) => {
  try {
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

    let Admin = data.admins;
    let Judge = data.judges;

    let admins = [] as string[];
    let judges = [] as string[];
    if (typeof Admin === "string") {
      admins = Admin.split(",");
    }
    if (typeof Judge === "string") {
      judges = Judge.split(",");
    }
    admins = admins.map((e) => e.trim()).filter(Boolean);
    judges = judges.map((e) => e.trim()).filter(Boolean);

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
      createdBy: c.get("user").id as string,
    });

    for (const email of admins) {
      const userData = await db.query.user.findFirst({
        where: eq(user.email, email),
      });

      if (!userData) {
        return c.json({ message: `Admin not found: ${email}` }, 400);
      }

      await db.insert(hackathonRoles).values({
        id: crypto.randomUUID(),
        userId: userData.id,
        hackathonId,
        role: "admin",
      });
    }

    for (const email of judges) {
      const userData = await db.query.user.findFirst({
        where: eq(user.email, email),
      });

      if (!userData) {
        return c.json({ message: `Judge not found: ${email}` }, 400);
      }

      await db.insert(hackathonRoles).values({
        id: crypto.randomUUID(),
        userId: userData.id,
        hackathonId,
        role: "judge",
      });
    }

    const stagesData = JSON.parse((data.stages as string) || "[]");

    for (const stage of stagesData) {
      await db.insert(stages).values({
        id: crypto.randomUUID(),
        hackathonId,
        title: stage.title,
        description: stage.description,
        startTime: stage.startDate,
        endTime: stage.endDate,
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
      filePath,
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

    const [members, submission] = await Promise.all([
      db.query.teamMembers.findMany({
        where: eq(teamMembers.teamId, teamId),
        with: { user: true },
      }),
      db.query.submissions.findFirst({
        where: eq(submissions.teamId, teamId),
      }),
    ]);

    return c.json({
      joined: true,
      team: {
        id: teamId,
        name: membership.team.name,
        leaderId: membership.team.leaderId,
        members,
        submission: submission || null,
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


