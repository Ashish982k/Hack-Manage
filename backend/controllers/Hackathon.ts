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

  return memberships.find(m => m.team.hackathonId === hackathonId) || null;
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
    if (!membership)
      return c.json({ message: "Not in a team" }, 400);

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
      await db.update(submissions).set(data).where(eq(submissions.id, existing.id));
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
      !data.registrationDeadline
    ) {
      return c.json(
        {
          message:
            "Title, start date, end date, and registration deadline are required",
        },
        400,
      );
    }

    const safeTitle = (data.title as string)
      .toLowerCase()
      .replace(/\s+/g, "-")
      .replace(/[^a-z0-9-]/g, "");

    let filePath: string | undefined;

    if (file) {
      const ext = file.name.split(".").pop();
      const suffix = ext ? `.${ext}` : "";
      const fileName = `${Date.now()}-${safeTitle}${suffix}`;
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
    const parsedStages = JSON.parse((data.stages as string) || "[]") as Array<{
      title: string;
      description: string;
      startDate: string;
      endDate: string;
    }>;
    const parsedProblemStatements = JSON.parse(
      (data.problemStatements as string) || "[]",
    ) as ProblemStatementInput[];

    for (const stage of parsedStages) {
      await db.insert(stages).values({
        id: crypto.randomUUID(),
        hackathonId,
        title: stage.title,
        description: stage.description,
        startTime: stage.startDate,
        endTime: stage.endDate,
      });
    }

    for (const statement of parsedProblemStatements) {
      const normalizedStatement =
        typeof statement === "string"
          ? {
              title: statement,
              description: "",
            }
          : {
              title: statement.title ?? "",
              description: statement.description ?? statement.body ?? "",
            };

      const trimmedTitle = normalizedStatement.title.trim();
      const trimmedDescription = normalizedStatement.description.trim();

      if (!trimmedTitle) continue;

      await db.insert(problemStatements).values({
        id: crypto.randomUUID(),
        hackathonId,
        title: trimmedTitle,
        description: trimmedDescription || undefined,
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

export const createTeam = async (c: AppContext) => {
  try {
    const userId = c.get("user").id;
    const { hackathonId, teamName, members = [] } = await c.req.json();

    if (!hackathonId || !teamName) {
      return c.json({ message: "Missing fields" }, 400);
    }

    const hackathon = await db.query.hackathons.findFirst({
      where: eq(hackathons.id, hackathonId),
    });
    if (!hackathon) return c.json({ message: "Invalid hackathon" }, 400);

    const participant = await ensureParticipant(hackathonId, userId);
    if (!participant)
      return c.json({ message: "Join hackathon first" }, 400);

    const already = await findMembershipForHackathon(userId, hackathonId);
    if (already)
      return c.json({ message: "Already in a team" }, 400);

    const teamId = crypto.randomUUID();

    // create team
    await db.insert(teams).values({
      id: teamId,
      hackathonId,
      name: teamName,
      leaderId: userId,
    });

    // add leader
    await db.insert(teamMembers).values({
      id: crypto.randomUUID(),
      teamId,
      userId,
      status: "approved",
    });

    // add members
    for (const email of members) {
      const u = await db.query.user.findFirst({
        where: eq(user.email, email),
      });

      if (!u || u.id === userId) continue;

      const inTeam = await findMembershipForHackathon(u.id, hackathonId);
      if (inTeam) continue;

      await ensureParticipant(hackathonId, u.id);

      await db.insert(teamMembers).values({
        id: crypto.randomUUID(),
        teamId,
        userId: u.id,
        status: "pending",
      });
    }

    return c.json({ message: "Team created", teamId });
  } catch {
    return c.json({ message: "Something went wrong" }, 500);
  }
};

export const joinHackathon = async (c: AppContext) => {
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
  } catch {
    return c.json({ message: "Something went wrong" }, 500);
  }
};

export const deleteUser = async (c: AppContext) => {
  try {
    const hackathonId = c.req.param("id");
    const userId = c.get("user").id;

    if (!hackathonId)
      return c.json({ message: "Hackathon not found" }, 404);

    const participant = await db.query.hackathonParticipants.findFirst({
      where: and(
        eq(hackathonParticipants.hackathonId, hackathonId),
        eq(hackathonParticipants.userId, userId),
      ),
    });

    if (!participant)
      return c.json({ message: "Not joined" }, 404);

    const membership = await findMembershipForHackathon(userId, hackathonId);

    if (membership) {
      if (membership.team.leaderId === userId) {
        await db.delete(teams).where(eq(teams.id, membership.team.id));
      } else {
        await db.delete(teamMembers).where(eq(teamMembers.id, membership.id));
      }
    }

    await db.delete(hackathonParticipants).where(eq(hackathonParticipants.id, participant.id));

    return c.json({ message: "Left hackathon" });
  } catch {
    return c.json({ message: "Something went wrong" }, 500);
  }
};

export const updateTeam = async (c: AppContext) => {
  try {
    const teamId = c.req.param("id");
    const userId = c.get("user").id;
    const { name } = await c.req.json();

    if (!teamId) return c.json({ message: "Team not found" }, 404);
    if (!name?.trim()) return c.json({ message: "Team name required" }, 400);

    const team = await db.query.teams.findFirst({
      where: eq(teams.id, teamId),
    });

    if (!team) return c.json({ message: "Team not found" }, 404);
    if (team.leaderId !== userId)
      return c.json({ message: "Only leader can rename" }, 403);

    await db.update(teams).set({ name }).where(eq(teams.id, teamId));

    return c.json({ message: "Updated", team: { ...team, name } });
  } catch {
    return c.json({ message: "Something went wrong" }, 500);
  }
};

export const addTeamMember = async (c: AppContext) => {
  try {
    const teamId = c.req.param("teamId");
    const userId = c.get("user").id;
    const { email } = await c.req.json();

    if (!teamId) return c.json({ message: "Team not found" }, 404);
    if (!email) return c.json({ message: "Email required" }, 400);

    const team = await db.query.teams.findFirst({
      where: eq(teams.id, teamId),
    });

    if (!team) return c.json({ message: "Team not found" }, 404);
    if (team.leaderId !== userId)
      return c.json({ message: "Only leader can add members" }, 403);

    const userToAdd = await db.query.user.findFirst({
      where: eq(user.email, email),
    });

    if (!userToAdd)
      return c.json({ message: "User not found" }, 400);

    if (userToAdd.id === team.leaderId)
      return c.json({ message: "Already leader" }, 409);

    const exists = await db.query.teamMembers.findFirst({
      where: and(
        eq(teamMembers.teamId, teamId),
        eq(teamMembers.userId, userToAdd.id),
      ),
    });

    if (exists)
      return c.json({ message: "Already in team" }, 409);

    const inOtherTeam = await findMembershipForHackathon(
      userToAdd.id,
      team.hackathonId,
    );

    if (inOtherTeam)
      return c.json({ message: "Already in another team" }, 409);

    await ensureParticipant(team.hackathonId, userToAdd.id);

    await db.insert(teamMembers).values({
      id: crypto.randomUUID(),
      teamId,
      userId: userToAdd.id,
      status: "pending",
    });

    return c.json({ message: "Invited" });
  } catch {
    return c.json({ message: "Something went wrong" }, 500);
  }
};

export const removeTeamMember = async (c: AppContext) => {
  try {
    const teamId = c.req.param("teamId");
    const targetUserId = c.req.param("userId");
    const userId = c.get("user").id;

    if (!teamId || !targetUserId)
      return c.json({ message: "Not found" }, 404);

    const team = await db.query.teams.findFirst({
      where: eq(teams.id, teamId),
    });

    if (!team) return c.json({ message: "Team not found" }, 404);

    const member = await db.query.teamMembers.findFirst({
      where: and(
        eq(teamMembers.teamId, teamId),
        eq(teamMembers.userId, targetUserId),
      ),
    });

    if (!member) return c.json({ message: "Member not found" }, 404);

    const isLeader = team.leaderId === userId;
    const isSelf = userId === targetUserId;

    if (!isLeader && !isSelf)
      return c.json({ message: "Unauthorized" }, 403);

    if (targetUserId === team.leaderId)
      return c.json({ message: "Cannot remove leader" }, 400);

    await db.delete(teamMembers).where(eq(teamMembers.id, member.id));

    return c.json({
      message: isSelf ? "Left team" : "Removed member",
    });
  } catch {
    return c.json({ message: "Something went wrong" }, 500);
  }
};

export const updateTeamMember = async (c: AppContext) => {
  try {
    const teamId = c.req.param("teamId");
    const targetUserId = c.req.param("userId");
    const userId = c.get("user").id;
    const { action } = await c.req.json();

    if (!teamId || !targetUserId)
      return c.json({ message: "Not found" }, 404);

    if (!["approve", "reject"].includes(action))
      return c.json({ message: "Invalid action" }, 400);

    const team = await db.query.teams.findFirst({
      where: eq(teams.id, teamId),
    });

    if (!team) return c.json({ message: "Team not found" }, 404);
    if (team.leaderId !== userId)
      return c.json({ message: "Only leader allowed" }, 403);

    if (targetUserId === team.leaderId)
      return c.json({ message: "Cannot modify leader" }, 400);

    const member = await db.query.teamMembers.findFirst({
      where: and(
        eq(teamMembers.teamId, teamId),
        eq(teamMembers.userId, targetUserId),
      ),
    });

    if (!member) return c.json({ message: "Member not found" }, 404);
    if (member.status !== "pending")
      return c.json({ message: "Already processed" }, 409);

    if (action === "approve") {
      await db
        .update(teamMembers)
        .set({ status: "approved" })
        .where(eq(teamMembers.id, member.id));

      return c.json({ message: "Approved" });
    }

    await db.delete(teamMembers).where(eq(teamMembers.id, member.id));
    return c.json({ message: "Rejected" });
  } catch {
    return c.json({ message: "Something went wrong" }, 500);
  }
};
