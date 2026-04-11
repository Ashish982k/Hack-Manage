import { hackathonRoles } from "../src/db/schema";
import { db } from "../src/db";
import { eq, and } from "drizzle-orm";
export const judgeMiddleware = async (c, next) => {
    try {
        const currentUser = c.get("user");
        const userId = currentUser?.id;
        const hackathonId = c.req.param("id") || c.req.param("hackathonId");
        if (!userId) {
            return c.json({ message: "Unauthorized" }, 401);
        }
        if (!hackathonId) {
            return c.json({ message: "Hackathon ID is required" }, 400);
        }
        const role = await db.query.hackathonRoles.findFirst({
            where: and(eq(hackathonRoles.hackathonId, hackathonId), eq(hackathonRoles.userId, userId), eq(hackathonRoles.role, "judge")),
        });
        if (!role) {
            return c.json({
                message: "Access to judge only",
            }, 403);
        }
        await next();
    }
    catch {
        return c.json({
            message: "Unknown error",
        }, 500);
    }
};
