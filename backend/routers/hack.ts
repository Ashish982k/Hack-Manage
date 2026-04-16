import { Hono } from "hono";
import { authMiddleware } from "../middleware/auth.middleware";
import { db } from "../src/db";
import {
  hackathons,
  problemStatements,
  teams,
  submissions,
  teamMembers,
  shortlistedTeams,
  hackathonParticipants,
  stages,
  evaluations,
  user,
  hackathonRoles,
} from "../src/db/schema";
import { and, eq, inArray } from "drizzle-orm";
import { deleteHackathon, getAttendance } from "../controllers/admins";
import {
  upload,
  newHackathon,
  getMember,
  getHackathonRoles,
  getJudgeAccess,
  joinHackathon,
  saveHackathonSchedules,
  updateHackathonRoles,
  deleteUser,
} from "../controllers/Hackathon";
import { judgeMiddleware } from "../middleware/judge.middleware";
import { createShortlistedTeams, evaluateSubmission, fetchEvaluatedTeams, fetchShortlistedTeams, getSubmissions } from "../controllers/judges";
import { generateQR, markQR } from "../controllers/qr";


const Hack = new Hono();

Hack.use("*", authMiddleware);
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
  } catch (err) {
    console.log(err);
    return c.json(
      {
        message: "Something went wrong",
      },
      500,
    );
  }
});

Hack.get("/:id", authMiddleware, async (c) => {
  const id = c.req.param("id");
  try {
    const hackathon = await db.query.hackathons.findFirst({
      where: eq(hackathons.id, id),
    });
    if (!hackathon) return c.json({ message: "Not found" }, 404);

    const statements = await db
      .select()
      .from(problemStatements)
      .where(eq(problemStatements.hackathonId, id));

    return c.json({
      ...hackathon,
      problemStatements: statements.map((statement) => ({
        id: statement.id,
        title: statement.title,
        body: statement.description ?? statement.title,
      })),
    });
  } catch (err) {
    console.log(err);
    return c.json({ message: "Something went wrong" }, 500);
  }
});

Hack.delete("/:id", authMiddleware, deleteHackathon);
Hack.post("/:id/join", authMiddleware, joinHackathon);
Hack.delete("/:id/join", authMiddleware, deleteUser);


//judges of the hackathon
Hack.get("/:id/submissions", authMiddleware, judgeMiddleware, getSubmissions);
Hack.post("/:id/evaluate/:teamId", authMiddleware, judgeMiddleware, evaluateSubmission)
Hack.get("/:id/leaderboard", authMiddleware, judgeMiddleware, fetchEvaluatedTeams);
Hack.post("/:id/shortlist", authMiddleware, judgeMiddleware, createShortlistedTeams);
Hack.get("/:id/shortlisted", authMiddleware, fetchShortlistedTeams);

//QR code 
Hack.get("/:id/qr", authMiddleware, generateQR);
Hack.post("/:id/scan", authMiddleware, markQR);

Hack.get("/:id/attendance", authMiddleware, getAttendance);

export default Hack;
