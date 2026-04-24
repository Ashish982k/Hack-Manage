import { and, desc, eq, sql } from "drizzle-orm";
import { db } from "../../src/db";
import { stages } from "../../src/db/schema";

export const resolveSubmissionStageId = async (
  hackathonId: string,
  stage: { id: string; type: string; startTime: string | null },
) => {
  if (stage.type !== "EVALUATION") return stage.id;

  const [linkedSubmissionStage] = stage.startTime
    ? await db
        .select({ id: stages.id })
        .from(stages)
        .where(
          and(
            eq(stages.hackathonId, hackathonId),
            eq(stages.type, "SUBMISSION"),
            sql`datetime(${stages.startTime}) <= datetime(${stage.startTime})`,
          ),
        )
        .orderBy(desc(sql`datetime(${stages.startTime})`))
        .limit(1)
    : [];

  if (linkedSubmissionStage) return linkedSubmissionStage.id;

  const [fallbackSubmissionStage] = await db
    .select({ id: stages.id })
    .from(stages)
    .where(
      and(
        eq(stages.hackathonId, hackathonId),
        eq(stages.type, "SUBMISSION"),
      ),
    )
    .orderBy(desc(sql`datetime(${stages.startTime})`))
    .limit(1);

  return fallbackSubmissionStage?.id ?? stage.id;
};

