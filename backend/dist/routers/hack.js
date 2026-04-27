import { Hono } from "hono";
import { authMiddleware } from "../middleware/auth.middleware.js";
import { db } from "../src/db/index.js";
import { hackathons, problemStatements, stages } from "../src/db/schema.js";
import { asc, eq } from "drizzle-orm";
import { deleteHackathon, getAttendance } from "../controllers/admins.js";
import { upload, newHackathon, getMember, getHackathonRoles, getJudgeAccess, joinHackathon, saveHackathonSchedules, updateHackathonRoles, deleteUser, } from "../controllers/Hackathon.js";
import { judgeMiddleware } from "../middleware/judge.middleware.js";
import { confirmFinalWinners, createShortlistedTeams, evaluateSubmission, fetchEvaluatedTeams, fetchShortlistedTeams, getSubmissions, } from "../controllers/judges.js";
import { generateQR, markQR } from "../controllers/qr.js";
const Hack = new Hono();
Hack.post("/:id/uploads", authMiddleware, upload);
Hack.get("/:id/team", authMiddleware, getMember);
Hack.get("/:id/roles", authMiddleware, getHackathonRoles);
Hack.get("/:id/judge-access", authMiddleware, getJudgeAccess);
Hack.patch("/:id/roles", authMiddleware, updateHackathonRoles);
Hack.post("/", authMiddleware, newHackathon);
Hack.post("/:id/schedule", authMiddleware, saveHackathonSchedules);
Hack.get("/", authMiddleware, async (c) => {
    try {
        const all = await db.select().from(hackathons);
        return c.json({
            hackathons: all,
        });
    }
    catch (err) {
        console.log(err);
        return c.json({
            message: "Something went wrong",
        }, 500);
    }
});
Hack.get("/:id", authMiddleware, async (c) => {
    const id = c.req.param("id");
    try {
        const hackathon = await db.query.hackathons.findFirst({
            where: eq(hackathons.id, id),
        });
        if (!hackathon)
            return c.json({ message: "Not found" }, 404);
        const statements = await db
            .select()
            .from(problemStatements)
            .where(eq(problemStatements.hackathonId, id));
        const stageRows = await db
            .select({
            id: stages.id,
            title: stages.title,
            type: stages.type,
            startTime: stages.startTime,
            endTime: stages.endTime,
        })
            .from(stages)
            .where(eq(stages.hackathonId, id))
            .orderBy(asc(stages.startTime), asc(stages.id));
        return c.json({
            ...hackathon,
            problemStatements: statements.map((statement) => ({
                id: statement.id,
                title: statement.title,
                body: statement.description ?? statement.title,
            })),
            stages: stageRows,
        });
    }
    catch (err) {
        console.log(err);
        return c.json({ message: "Something went wrong" }, 500);
    }
});
Hack.delete("/:id", authMiddleware, deleteHackathon);
Hack.post("/:id/join", authMiddleware, joinHackathon);
Hack.delete("/:id/join", authMiddleware, deleteUser);
// Judges
Hack.get("/:id/submissions", authMiddleware, judgeMiddleware, getSubmissions);
Hack.post("/:id/evaluate/:teamId", authMiddleware, judgeMiddleware, evaluateSubmission);
Hack.get("/:id/leaderboard", authMiddleware, fetchEvaluatedTeams);
Hack.post("/:id/shortlist", authMiddleware, createShortlistedTeams);
Hack.post("/:id/final-winners", authMiddleware, confirmFinalWinners);
Hack.get("/:id/shortlisted", authMiddleware, fetchShortlistedTeams);
// QR
Hack.get("/:id/qr", authMiddleware, generateQR);
Hack.post("/:id/scan", authMiddleware, markQR);
// Analytics
Hack.get("/:id/attendance", authMiddleware, getAttendance);
export default Hack;
