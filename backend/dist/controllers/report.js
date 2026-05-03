import { db } from "../src/db/index.js";
import { qrCodes, hackathons, shortlistedTeams, stages, teamMembers, teams, user, } from "../src/db/schema.js";
import { and, asc, eq, inArray, sql } from "drizzle-orm";
import { isHackathonAdmin } from "../lib/functions/roles.js";
import { getCurrentStageReferenceTime } from "../lib/functions/stage.js";
import { generateFinalReportPdf, generateTeamLogsReportPdf, } from "../lib/functions/pdf-report.js";
const readCount = (value) => {
    if (typeof value === "number" && Number.isFinite(value))
        return value;
    if (typeof value === "string") {
        const parsed = Number(value);
        if (Number.isFinite(parsed))
            return parsed;
    }
    return 0;
};
export const downloadLogsReport = async (c) => {
    try {
        const hackathonId = c.req.param("id");
        const currentUser = c.get("user");
        if (!hackathonId) {
            return c.json({ message: "Hackathon ID is required" }, 400);
        }
        if (!currentUser?.id) {
            return c.json({ message: "Unauthorized" }, 401);
        }
        const hackathon = await db.query.hackathons.findFirst({
            where: eq(hackathons.id, hackathonId),
            columns: {
                id: true,
                title: true,
                endDate: true,
                createdBy: true,
            },
        });
        if (!hackathon) {
            return c.json({ message: "Hackathon not found" }, 404);
        }
        const isAdmin = await isHackathonAdmin(hackathonId, currentUser.id, hackathon.createdBy);
        if (!isAdmin) {
            return c.json({ message: "Unauthorized" }, 403);
        }
        const [finalStage] = await db
            .select({
            id: stages.id,
            startTime: stages.startTime,
            endTime: stages.endTime,
        })
            .from(stages)
            .where(and(eq(stages.hackathonId, hackathonId), eq(stages.type, "FINAL")))
            .orderBy(asc(stages.startTime), asc(stages.id))
            .limit(1);
        if (!finalStage) {
            return c.json({ message: "Final stage not found" }, 404);
        }
        if (!finalStage.endTime) {
            return c.json({ message: "Final stage end time is missing" }, 400);
        }
        const stageReferenceTime = getCurrentStageReferenceTime();
        const [isCompleted] = await db
            .select({ id: stages.id })
            .from(stages)
            .where(and(eq(stages.id, finalStage.id), sql `datetime(${stages.endTime}) < datetime(${stageReferenceTime})`))
            .limit(1);
        if (!isCompleted) {
            return c.json({ message: "Final round is not completed yet" }, 400);
        }
        let selectedStageId = finalStage.id;
        let selectedTeamRows = await db
            .select({ teamId: shortlistedTeams.teamId })
            .from(shortlistedTeams)
            .where(and(eq(shortlistedTeams.hackathonId, hackathonId), eq(shortlistedTeams.stageId, selectedStageId)));
        if (selectedTeamRows.length === 0) {
            const stageRows = await db
                .select({ id: stages.id, startTime: stages.startTime })
                .from(stages)
                .where(eq(stages.hackathonId, hackathonId))
                .orderBy(asc(stages.startTime), asc(stages.id));
            const finalIndex = stageRows.findIndex((stage) => stage.id === finalStage.id);
            if (finalIndex > 0) {
                selectedStageId = stageRows[finalIndex - 1].id;
                selectedTeamRows = await db
                    .select({ teamId: shortlistedTeams.teamId })
                    .from(shortlistedTeams)
                    .where(and(eq(shortlistedTeams.hackathonId, hackathonId), eq(shortlistedTeams.stageId, selectedStageId)));
            }
        }
        const selectedTeamIds = selectedTeamRows.map((row) => row.teamId);
        const [{ count: selectedUsersRaw } = { count: 0 }] = selectedTeamIds.length
            ? await db
                .select({
                count: sql `cast(count(distinct ${teamMembers.userId}) as integer)`,
            })
                .from(teamMembers)
                .where(and(inArray(teamMembers.teamId, selectedTeamIds), eq(teamMembers.status, "approved")))
            : [{ count: 0 }];
        const [{ count: enteredUsersRaw } = { count: 0 }] = await db
            .select({
            count: sql `cast(count(distinct ${qrCodes.userId}) as integer)`,
        })
            .from(qrCodes)
            .where(and(eq(qrCodes.hackathonId, hackathonId), eq(qrCodes.type, "entry"), eq(qrCodes.isUsed, true)));
        const foodTypes = ["breakfast", "lunch", "dinner"];
        const [{ count: foodAvailableRaw } = { count: 0 }] = await db
            .select({
            count: sql `cast(count(*) as integer)`,
        })
            .from(qrCodes)
            .where(and(eq(qrCodes.hackathonId, hackathonId), inArray(qrCodes.type, [...foodTypes])));
        const [{ count: foodUsedRaw } = { count: 0 }] = await db
            .select({
            count: sql `cast(count(*) as integer)`,
        })
            .from(qrCodes)
            .where(and(eq(qrCodes.hackathonId, hackathonId), inArray(qrCodes.type, [...foodTypes]), eq(qrCodes.isUsed, true)));
        const eventDate = finalStage.endTime ?? hackathon.endDate;
        const eventDateLabel = eventDate
            ? new Date(eventDate).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
            })
            : "N/A";
        const pdfBuffer = await generateFinalReportPdf({
            title: "Hackathon Final Report",
            eventName: hackathon.title,
            eventDateLabel,
            selectedUsersCount: readCount(selectedUsersRaw),
            enteredUsersCount: readCount(enteredUsersRaw),
            foodAvailableCount: readCount(foodAvailableRaw),
            foodUsedCount: readCount(foodUsedRaw),
        });
        return c.newResponse(new Uint8Array(pdfBuffer), 200, {
            "Content-Type": "application/pdf",
            "Content-Disposition": 'attachment; filename="hackathon-final-report.pdf"',
            "Cache-Control": "no-store",
        });
    }
    catch (error) {
        console.error("downloadLogsReport failed:", error);
        return c.json({ message: "Something went wrong" }, 500);
    }
};
export const downloadTeamLogsReport = async (c) => {
    try {
        const hackathonId = c.req.param("id");
        const currentUser = c.get("user");
        if (!hackathonId) {
            return c.json({ message: "Hackathon ID is required" }, 400);
        }
        if (!currentUser?.id) {
            return c.json({ message: "Unauthorized" }, 401);
        }
        const hackathon = await db.query.hackathons.findFirst({
            where: eq(hackathons.id, hackathonId),
            columns: {
                id: true,
                title: true,
                endDate: true,
                createdBy: true,
            },
        });
        if (!hackathon) {
            return c.json({ message: "Hackathon not found" }, 404);
        }
        const isAdmin = await isHackathonAdmin(hackathonId, currentUser.id, hackathon.createdBy);
        if (!isAdmin) {
            return c.json({ message: "Unauthorized" }, 403);
        }
        const [finalStage] = await db
            .select({
            id: stages.id,
            startTime: stages.startTime,
            endTime: stages.endTime,
        })
            .from(stages)
            .where(and(eq(stages.hackathonId, hackathonId), eq(stages.type, "FINAL")))
            .orderBy(asc(stages.startTime), asc(stages.id))
            .limit(1);
        if (!finalStage) {
            return c.json({ message: "Final stage not found" }, 404);
        }
        if (!finalStage.endTime) {
            return c.json({ message: "Final stage end time is missing" }, 400);
        }
        const stageReferenceTime = getCurrentStageReferenceTime();
        const [isCompleted] = await db
            .select({ id: stages.id })
            .from(stages)
            .where(and(eq(stages.id, finalStage.id), sql `datetime(${stages.endTime}) < datetime(${stageReferenceTime})`))
            .limit(1);
        if (!isCompleted) {
            return c.json({ message: "Final round is not completed yet" }, 400);
        }
        // Fetch all shortlisted teams (from final stage or previous stage)
        let selectedStageId = finalStage.id;
        let selectedTeamRows = await db
            .select({ teamId: shortlistedTeams.teamId })
            .from(shortlistedTeams)
            .where(and(eq(shortlistedTeams.hackathonId, hackathonId), eq(shortlistedTeams.stageId, selectedStageId)));
        if (selectedTeamRows.length === 0) {
            const stageRows = await db
                .select({ id: stages.id, startTime: stages.startTime })
                .from(stages)
                .where(eq(stages.hackathonId, hackathonId))
                .orderBy(asc(stages.startTime), asc(stages.id));
            const finalIndex = stageRows.findIndex((stage) => stage.id === finalStage.id);
            if (finalIndex > 0) {
                selectedStageId = stageRows[finalIndex - 1].id;
                selectedTeamRows = await db
                    .select({ teamId: shortlistedTeams.teamId })
                    .from(shortlistedTeams)
                    .where(and(eq(shortlistedTeams.hackathonId, hackathonId), eq(shortlistedTeams.stageId, selectedStageId)));
            }
        }
        const selectedTeamIds = selectedTeamRows.map((row) => row.teamId);
        const teamReports = [];
        if (selectedTeamIds.length > 0) {
            const teamRows = await db
                .select({ id: teams.id, name: teams.name })
                .from(teams)
                .where(inArray(teams.id, selectedTeamIds))
                .orderBy(asc(teams.name));
            for (const team of teamRows) {
                const members = await db
                    .select({
                    userId: teamMembers.userId,
                    status: teamMembers.status,
                })
                    .from(teamMembers)
                    .where(eq(teamMembers.teamId, team.id));
                const memberData = [];
                for (const member of members) {
                    if (member.status !== "approved")
                        continue;
                    const userData = await db
                        .select({ name: user.name })
                        .from(user)
                        .where(eq(user.id, member.userId))
                        .limit(1);
                    if (!userData.length)
                        continue;
                    const entryQr = await db
                        .select({ isUsed: qrCodes.isUsed })
                        .from(qrCodes)
                        .where(and(eq(qrCodes.userId, member.userId), eq(qrCodes.hackathonId, hackathonId), eq(qrCodes.type, "entry")))
                        .limit(1);
                    const foodQr = await db
                        .select({ isUsed: qrCodes.isUsed })
                        .from(qrCodes)
                        .where(and(eq(qrCodes.userId, member.userId), eq(qrCodes.hackathonId, hackathonId), inArray(qrCodes.type, ["breakfast", "lunch", "dinner"])))
                        .limit(1);
                    memberData.push({
                        memberName: userData[0].name,
                        entryPassUsed: entryQr.length > 0 ? entryQr[0].isUsed : false,
                        foodPassUsed: foodQr.length > 0 ? foodQr[0].isUsed : false,
                    });
                }
                teamReports.push({
                    teamName: team.name,
                    members: memberData,
                });
            }
        }
        const eventDate = finalStage.endTime ?? hackathon.endDate;
        const eventDateLabel = eventDate
            ? new Date(eventDate).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
            })
            : "N/A";
        const pdfBuffer = await generateTeamLogsReportPdf({
            title: "Hackathon Team Report",
            eventName: hackathon.title,
            eventDateLabel,
            teams: teamReports,
        });
        return c.newResponse(new Uint8Array(pdfBuffer), 200, {
            "Content-Type": "application/pdf",
            "Content-Disposition": 'attachment; filename="hackathon-team-report.pdf"',
            "Cache-Control": "no-store",
        });
    }
    catch (error) {
        console.error("downloadTeamLogsReport failed:", error);
        return c.json({ message: "Something went wrong" }, 500);
    }
};
