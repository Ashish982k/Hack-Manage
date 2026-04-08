import { mkdir, writeFile } from "fs/promises";
import path from "path";
import crypto from "crypto";
import { and, eq } from "drizzle-orm";
import { db } from "../src/db";
import { hackathons, hackathonParticipants, problemStatements, submissions, teamMembers, stages, teams, user, } from "../src/db/schema";
const getFileCandidate = (value) => {
    const candidate = Array.isArray(value) ? value[0] : value;
    if (!candidate || typeof candidate !== "object") {
        return null;
    }
    const maybeFile = candidate;
    if (typeof maybeFile.name !== "string" || typeof maybeFile.arrayBuffer !== "function") {
        return null;
    }
    return candidate;
};
const findMembershipForHackathon = async (userId, hackathonId) => {
    const memberships = await db.query.teamMembers.findMany({
        where: eq(teamMembers.userId, userId),
        with: {
            team: true,
        },
    });
    return memberships.find((m) => m.team.hackathonId === hackathonId) ?? null;
};
const ensureParticipant = async (hackathonId, userId) => {
    const participant = await db.query.hackathonParticipants.findFirst({
        where: and(eq(hackathonParticipants.hackathonId, hackathonId), eq(hackathonParticipants.userId, userId)),
    });
    if (participant) {
        return participant;
    }
    const id = crypto.randomUUID();
    await db.insert(hackathonParticipants).values({
        id,
        hackathonId,
        userId,
    });
    return { id, hackathonId, userId };
};
export const upload = async (c) => {
    try {
        const hackathonId = c.req.param("id");
        const user = c.get("user");
        if (!hackathonId) {
            return c.json({ message: "Hackathon not found" }, 404);
        }
        if (!user) {
            return c.json({ message: "Unauthorized" }, 401);
        }
        const userId = user.id;
        const teamMember = await findMembershipForHackathon(userId, hackathonId);
        if (!teamMember) {
            return c.json({ message: "User is not in a team for this hackathon" }, 400);
        }
        const teamId = teamMember.team.id;
        const availableProblemStatements = await db.query.problemStatements.findMany({
            where: eq(problemStatements.hackathonId, hackathonId),
        });
        const { driveUrl, githubUrl, problemStatementId } = await c.req.json();
        if (!driveUrl) {
            return c.json({ message: "Drive URL is required" }, 400);
        }
        if (availableProblemStatements.length > 0) {
            if (!problemStatementId) {
                return c.json({ message: "Problem statement is required" }, 400);
            }
            const selectedProblemStatement = availableProblemStatements.find((statement) => statement.id === problemStatementId);
            if (!selectedProblemStatement) {
                return c.json({ message: "Invalid problem statement" }, 400);
            }
        }
        const existingSubmission = await db.query.submissions.findFirst({
            where: eq(submissions.teamId, teamId),
        });
        if (existingSubmission) {
            await db
                .update(submissions)
                .set({
                pptUrl: driveUrl,
                githubUrl,
                problemStatementId,
            })
                .where(eq(submissions.id, existingSubmission.id));
        }
        else {
            await db.insert(submissions).values({
                id: crypto.randomUUID(),
                teamId,
                round: 1,
                pptUrl: driveUrl,
                githubUrl,
                problemStatementId,
            });
        }
        return c.json({
            message: "Submission successful",
            driveUrl,
        });
    }
    catch (error) {
        console.error(error);
        return c.json({ message: "Something went wrong" }, 500);
    }
};
export const newHackathon = async (c) => {
    try {
        const data = await c.req.parseBody();
        const file = getFileCandidate(data.headerImage);
        if (!data.title ||
            !data.startDate ||
            !data.endDate ||
            !data.registrationDeadline) {
            return c.json({
                message: "Title, start date, end date, and registration deadline are required",
            }, 400);
        }
        const safeTitle = data.title
            .toLowerCase()
            .replace(/\s+/g, "-")
            .replace(/[^a-z0-9-]/g, "");
        let filePath;
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
            title: data.title,
            description: data.description,
            headerImage: filePath ?? null,
            startDate: data.startDate,
            endDate: data.endDate,
            registrationDeadline: data.registrationDeadline,
            location: data.location,
            createdBy: c.get("user").id,
        });
        const parsedStages = JSON.parse(data.stages || "[]");
        const parsedProblemStatements = JSON.parse(data.problemStatements || "[]");
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
            const normalizedStatement = typeof statement === "string"
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
            if (!trimmedTitle)
                continue;
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
        if (!hackathonId) {
            return c.json({ message: "Hackathon not found" }, 404);
        }
        if (!user) {
            return c.json({ message: "Unauthorized" }, 401);
        }
        const userId = user.id;
        const participant = await db.query.hackathonParticipants.findFirst({
            where: and(eq(hackathonParticipants.hackathonId, hackathonId), eq(hackathonParticipants.userId, userId)),
        });
        if (!participant) {
            return c.json({
                joined: false,
                team: null,
            });
        }
        const teamMember = await findMembershipForHackathon(userId, hackathonId);
        if (!teamMember) {
            return c.json({
                joined: true,
                team: null,
            });
        }
        const members = await db.query.teamMembers.findMany({
            where: eq(teamMembers.teamId, teamMember.team.id),
            with: {
                user: true,
            },
        });
        const submission = await db.query.submissions.findFirst({
            where: eq(submissions.teamId, teamMember.team.id),
        });
        return c.json({
            joined: true,
            team: {
                id: teamMember.team.id,
                name: teamMember.team.name,
                leaderId: teamMember.team.leaderId,
                members,
                submission: submission || null,
            },
        });
    }
    catch (error) {
        console.error(error);
        return c.json({ message: "Something went wrong" }, 500);
    }
};
export const createTeam = async (c) => {
    try {
        const { hackathonId: rawHackathonId, teamName: rawTeamName, members } = await c.req.json();
        const userId = c.get("user").id;
        const hackathonId = typeof rawHackathonId === "string" ? rawHackathonId.trim() : "";
        const teamName = typeof rawTeamName === "string" ? rawTeamName.trim() : "";
        if (!hackathonId || !teamName) {
            return c.json({ message: "Missing fields" }, 400);
        }
        const hackathon = await db.query.hackathons.findFirst({
            where: eq(hackathons.id, hackathonId),
        });
        if (!hackathon) {
            return c.json({ message: "Invalid Hackathon" }, 400);
        }
        const participant = await db.query.hackathonParticipants.findFirst({
            where: and(eq(hackathonParticipants.hackathonId, hackathonId), eq(hackathonParticipants.userId, userId)),
        });
        if (!participant) {
            return c.json({ message: "Join the hackathon before creating a team" }, 400);
        }
        const existingTeam = await findMembershipForHackathon(userId, hackathonId);
        const already = !!existingTeam;
        if (already) {
            return c.json({ message: "Already in a team for this hackathon" }, 400);
        }
        const requestedMembers = Array.isArray(members) ? members : [];
        const invitedEmails = [
            ...new Set(requestedMembers
                .filter((email) => typeof email === "string")
                .map((email) => email.trim())
                .filter(Boolean)),
        ];
        const invitedUsers = [];
        for (const email of invitedEmails) {
            const foundUser = await db.query.user.findFirst({
                where: eq(user.email, email),
            });
            if (!foundUser) {
                return c.json({
                    message: `User with email ${email} is not registered or verified`,
                }, 400);
            }
            if (foundUser.id === userId)
                continue;
            invitedUsers.push({ id: foundUser.id, email: foundUser.email });
        }
        for (const invitedUser of invitedUsers) {
            const memberTeam = await findMembershipForHackathon(invitedUser.id, hackathonId);
            if (memberTeam) {
                return c.json({
                    message: `User with email ${invitedUser.email} is already in a team for this hackathon`,
                }, 400);
            }
        }
        const teamId = crypto.randomUUID();
        await db.insert(teams).values({
            id: teamId,
            hackathonId,
            name: teamName,
            leaderId: userId,
        });
        // Add team leader to teamMembers with approved status
        await db.insert(teamMembers).values({
            id: crypto.randomUUID(),
            teamId,
            userId,
            status: "approved",
        });
        // Add other team members
        for (const invitedUser of invitedUsers) {
            await ensureParticipant(hackathonId, invitedUser.id);
            await db.insert(teamMembers).values({
                id: crypto.randomUUID(),
                teamId,
                userId: invitedUser.id,
                status: "pending",
            });
        }
        return c.json({
            message: "Team created successfully",
            teamId,
        });
    }
    catch (error) {
        console.error(error);
        return c.json({ message: "Something went wrong" }, 500);
    }
};
export const joinHackathon = async (c) => {
    try {
        const userId = c.get("user").id;
        const hackathonId = c.req.param("id");
        if (!hackathonId)
            return c.json({ message: "Hackathon not found" }, 404);
        // Validate hackathon exists
        const hackathon = await db.query.hackathons.findFirst({
            where: eq(hackathons.id, hackathonId),
        });
        if (!hackathon) {
            return c.json({ message: "Hackathon not found" }, 404);
        }
        await ensureParticipant(hackathonId, userId);
        return c.json({
            message: "Joined hackathon successfully",
        }, 200);
    }
    catch (error) {
        console.error(error);
        return c.json({ message: "Something went wrong" }, 500);
    }
};
export const deleteUser = async (c) => {
    try {
        const hackathonId = c.req.param("id");
        const userId = c.get("user").id;
        if (!hackathonId) {
            return c.json({ message: "Hackathon not found" }, 404);
        }
        const participant = await db.query.hackathonParticipants.findFirst({
            where: and(eq(hackathonParticipants.hackathonId, hackathonId), eq(hackathonParticipants.userId, userId)),
        });
        if (!participant) {
            return c.json({ message: "Not joined in this hackathon" }, 404);
        }
        const member = await findMembershipForHackathon(userId, hackathonId);
        if (member) {
            // If user is leader, delete the team (cascade deletes submissions)
            if (member.team.leaderId === userId) {
                await db.delete(teams).where(eq(teams.id, member.team.id));
            }
            else {
                // Otherwise, just remove user from teamMembers
                await db.delete(teamMembers).where(eq(teamMembers.id, member.id));
            }
        }
        await db.delete(hackathonParticipants).where(eq(hackathonParticipants.id, participant.id));
        return c.json({ message: "Successfully left hackathon" }, 200);
    }
    catch (error) {
        console.error(error);
        return c.json({ message: "Something went wrong" }, 500);
    }
};
export const updateTeam = async (c) => {
    try {
        const teamId = c.req.param("id");
        const userId = c.get("user").id;
        const body = await c.req.json();
        const name = typeof body?.name === "string" ? body.name.trim() : "";
        if (!teamId) {
            return c.json({ message: "Team not found" }, 404);
        }
        if (!name) {
            return c.json({ message: "Team name is required" }, 400);
        }
        const team = await db.query.teams.findFirst({
            where: eq(teams.id, teamId),
        });
        if (!team) {
            return c.json({ message: "Team not found" }, 404);
        }
        if (team.leaderId !== userId) {
            return c.json({ message: "Only team leader can rename the team" }, 403);
        }
        await db.update(teams).set({ name }).where(eq(teams.id, teamId));
        return c.json({
            message: "Team name updated",
            team: {
                ...team,
                name,
            },
        });
    }
    catch (error) {
        console.error(error);
        return c.json({ message: "Something went wrong" }, 500);
    }
};
export const removeTeamMember = async (c) => {
    try {
        const teamId = c.req.param("teamId");
        const targetUserId = c.req.param("userId");
        const userId = c.get("user").id;
        if (!teamId || !targetUserId) {
            return c.json({ message: "Team member not found" }, 404);
        }
        const team = await db.query.teams.findFirst({
            where: eq(teams.id, teamId),
        });
        if (!team) {
            return c.json({ message: "Team not found" }, 404);
        }
        const member = await db.query.teamMembers.findFirst({
            where: and(eq(teamMembers.teamId, teamId), eq(teamMembers.userId, targetUserId)),
        });
        if (!member) {
            return c.json({ message: "Team member not found" }, 404);
        }
        const isLeader = team.leaderId === userId;
        const isSelf = userId === targetUserId;
        if (!isLeader && !isSelf) {
            return c.json({ message: "Unauthorized" }, 403);
        }
        if (targetUserId === team.leaderId) {
            return c.json({ message: "Leader cannot be removed from team" }, 400);
        }
        await db.delete(teamMembers).where(eq(teamMembers.id, member.id));
        return c.json({
            message: isSelf ? "You left the team" : "Member removed successfully",
        });
    }
    catch (error) {
        console.error(error);
        return c.json({ message: "Something went wrong" }, 500);
    }
};
export const updateTeamMember = async (c) => {
    try {
        const teamId = c.req.param("teamId");
        const targetUserId = c.req.param("userId");
        const userId = c.get("user").id;
        const body = await c.req.json();
        const action = body?.action;
        if (!teamId || !targetUserId) {
            return c.json({ message: "Team member not found" }, 404);
        }
        if (action !== "approve" && action !== "reject") {
            return c.json({ message: "Action must be approve or reject" }, 400);
        }
        const team = await db.query.teams.findFirst({
            where: eq(teams.id, teamId),
        });
        if (!team) {
            return c.json({ message: "Team not found" }, 404);
        }
        if (team.leaderId !== userId) {
            return c.json({ message: "Only team leader can review members" }, 403);
        }
        if (targetUserId === team.leaderId) {
            return c.json({ message: "Leader membership cannot be changed" }, 400);
        }
        const member = await db.query.teamMembers.findFirst({
            where: and(eq(teamMembers.teamId, teamId), eq(teamMembers.userId, targetUserId)),
        });
        if (!member) {
            return c.json({ message: "Team member not found" }, 404);
        }
        if (member.status !== "pending") {
            return c.json({ message: "Only pending members can be reviewed" }, 409);
        }
        if (action === "approve") {
            await db
                .update(teamMembers)
                .set({ status: "approved" })
                .where(eq(teamMembers.id, member.id));
            return c.json({ message: "Member approved successfully" });
        }
        await db.delete(teamMembers).where(eq(teamMembers.id, member.id));
        return c.json({ message: "Member rejected successfully" });
    }
    catch (error) {
        console.error(error);
        return c.json({ message: "Something went wrong" }, 500);
    }
};
