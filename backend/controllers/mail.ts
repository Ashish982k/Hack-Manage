import { transporter } from "../lib/mailer.js";
import { generateCertificatePdf } from "../lib/functions/pdf.js";
import { db } from "../src/db/index.js";
import type { Context } from "hono";
import type { HonoEnv } from "../types.js";
import {
  hackathons,
  teams,
  submissions,
  stages,
  evaluations,
  shortlistedTeams,
  teamMembers,
  user,
} from "../src/db/schema.js";
import { and, eq, inArray } from "drizzle-orm/sql/expressions/conditions";
import { desc, sql } from "drizzle-orm";

type AppContext = Context<HonoEnv>;

export const sendWinnerEmails = async (hackathonId: string) => {
  try {
    if (!hackathonId) throw new Error("Hackathon ID required");

    const hackathon = await db.query.hackathons.findFirst({
      where: eq(hackathons.id, hackathonId),
    });

    if (!hackathon) throw new Error("Hackathon not found");

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

    const eventDate = hackathon.startDate
      ? new Date(hackathon.startDate).toLocaleDateString("en-US", {
          day: "numeric",
          month: "long",
          year: "numeric",
        })
      : "TBA";

    const eventLocation = hackathon.location || "TBA";

    await Promise.all(
      topTeams.map(async (team, i) => {
        try {
          const members = await db
            .select({ userId: teamMembers.userId })
            .from(teamMembers)
            .where(eq(teamMembers.teamId, team.teamId));

          const memberIds = members.map((member) => member.userId);
          if (!memberIds.length) return;

          const winners = await db
            .select({ name: user.name, email: user.email })
            .from(user)
            .where(inArray(user.id, memberIds));

          const parsedEventYear = hackathon.startDate
            ? new Date(hackathon.startDate).getFullYear()
            : Number.NaN;
          const eventYear = Number.isNaN(parsedEventYear)
            ? String(new Date().getFullYear())
            : String(parsedEventYear);

          await Promise.all(
            winners.map(async (winner) => {
              const positionText =
                i + 1 === 1 ? "1st" : i + 1 === 2 ? "2nd" : "3rd";

              const certificatePdf = await generateCertificatePdf({
                winnerName: winner.name,
                teamName: team.teamName,
                eventName: hackathon.title,
                eventYear,
                position: i + 1,
                date: eventDate,
                location: eventLocation,
              });

              await transporter.sendMail({
                from: `"Hackathon Platform" <${process.env.EMAIL_USER}>`,
                to: winner.email,
                subject: "Congratulations! 🎉",
                text: `Dear ${winner.name},

Congratulations on winning the Hackathon with Team ${team.teamName}!
You secured position #${positionText}.
Final Score: ${team.totalScore}

Your certificate is attached with this email.

- Hackathon Team`,
                attachments: [
                  {
                    filename: "certificate.pdf",
                    content: certificatePdf,
                  },
                ],
              });
            }),
          );
        } catch (err) {
          console.error("Error sending mail to team:", team.teamName, err);
        }
      }),
    );
  } catch (err) {
    console.error("sendWinnerEmails failed:", err);
  }
};
