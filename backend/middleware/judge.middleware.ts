import { hackathonRoles } from "../src/db/schema.js";
import type { Context, Next } from "hono";
import { db } from "../src/db/index.js";
import { eq, and } from "drizzle-orm";

export const judgeMiddleware = async (c: Context, next: Next) => {
  try {
    const userId = c.get("user")?.id;
    const hackathonId = c.req.param("id") || c.req.param("hackathonId");

    if (!userId) {
      return c.json({ message: "Unauthorized" }, 401);
    }
    if (!hackathonId) {
      return c.json({ message: "Hackathon ID is required" }, 400);
    }

    const role = await db.query.hackathonRoles.findFirst({
      where: and(
        eq(hackathonRoles.hackathonId, hackathonId),
        eq(hackathonRoles.userId, userId),
        eq(hackathonRoles.role, "judge"),
      ),
    });

    if (!role) return c.json({ message: "Access to judge only" }, 403);

    await next();
  } catch {
    return c.json({ message: "Something went wrong" }, 500);
  }
};
