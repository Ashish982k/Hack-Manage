import { transporter } from "../lib/mailer";
import { db } from "../src/db";
import type { Context } from "hono";
import type { HonoEnv } from "../types";
import {
  hackathonRoles,
  teams,
  submissions,
  stages,
  evaluations,
  shortlistedTeams,
  teamMembers,
  user,
} from "../src/db/schema";
import { and, eq, inArray } from "drizzle-orm/sql/expressions/conditions";
import { desc, sql } from "drizzle-orm";

type AppContext = Context<HonoEnv>;

export const sendWinnerEmails = async (hackathonId: string) => {
  try {
    if (!hackathonId) throw new Error("Hackathon ID required");

    const finalStage = await db.query.stages.findFirst({
      where: and(eq(stages.hackathonId, hackathonId), eq(stages.type, "FINAL")),
    });

    if (!finalStage) throw new Error("Final stage not found");

    const shortlisted = await db
      .select({
        teamId: submissions.teamId,
        teamName: teams.name,
        totalScore: sql<number>`COALESCE(SUM(${evaluations.total}), 0)`,
      })
      .from(submissions)
      .innerJoin(teams, eq(submissions.teamId, teams.id))
      .innerJoin(evaluations, eq(submissions.id, evaluations.submissionId))
      .innerJoin(
        shortlistedTeams,
        and(
          eq(shortlistedTeams.teamId, submissions.teamId),
          eq(shortlistedTeams.stageId, finalStage.id),
        ),
      )
      .where(
        and(
          eq(shortlistedTeams.hackathonId, hackathonId),
          eq(submissions.stageId, finalStage.id),
        ),
      )
      .groupBy(submissions.teamId, teams.name)
      .orderBy(desc(sql`COALESCE(SUM(${evaluations.total}), 0)`));

    if (!shortlisted.length) return;

    const topTeams = shortlisted.slice(0, 3);

    await Promise.all(
      topTeams.map(async (team, i) => {
        try {
          const members = await db
            .select({ userId: teamMembers.userId })
            .from(teamMembers)
            .where(eq(teamMembers.teamId, team.teamId));

          const emails = await db
            .select({ email: user.email })
            .from(user)
            .where(inArray(user.id, members.map((m) => m.userId)));

          await transporter.sendMail({
            from: `"Hackathon Platform" <${process.env.EMAIL_USER}>`,
            to: emails.map((e) => e.email),
            subject: "Congratulations! 🎉",
            text: `Dear Team ${team.teamName},

You secured position #${i + 1}.
Final Score: ${team.totalScore}

- Hackathon Team`,
          });
        } catch (err) {
          console.error("Error sending mail to team:", team.teamName);
        }
      })
    );
  } catch (err) {
    console.error("sendWinnerEmails failed:", err);
  }
};