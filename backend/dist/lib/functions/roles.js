import { and, eq } from "drizzle-orm";
import { db } from "../../src/db";
import { hackathons, hackathonRoles } from "../../src/db/schema";
export const isHackathonAdmin = async (hackathonId, userId, createdBy) => {
    let ownerId = createdBy;
    if (!ownerId) {
        const hackathon = await db.query.hackathons.findFirst({
            where: eq(hackathons.id, hackathonId),
            columns: { createdBy: true },
        });
        ownerId = hackathon?.createdBy;
    }
    if (ownerId === userId)
        return true;
    const role = await db.query.hackathonRoles.findFirst({
        where: and(eq(hackathonRoles.hackathonId, hackathonId), eq(hackathonRoles.userId, userId), eq(hackathonRoles.role, "admin")),
    });
    return Boolean(role);
};
export const isHackathonJudge = async (hackathonId, userId) => {
    const role = await db.query.hackathonRoles.findFirst({
        where: and(eq(hackathonRoles.hackathonId, hackathonId), eq(hackathonRoles.userId, userId), eq(hackathonRoles.role, "judge")),
    });
    return Boolean(role);
};
export const isHackathonJudgeOrAdmin = async (hackathonId, userId) => {
    const role = await db.query.hackathonRoles.findFirst({
        where: and(eq(hackathonRoles.hackathonId, hackathonId), eq(hackathonRoles.userId, userId)),
        columns: { role: true },
    });
    return role?.role === "judge" || role?.role === "admin";
};
