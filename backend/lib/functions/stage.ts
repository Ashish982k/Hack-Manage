import { and, desc, eq, sql } from "drizzle-orm";
import { db } from "../../src/db/index.js";
import { stages } from "../../src/db/schema.js";

const APP_TIMEZONE = process.env.APP_TIMEZONE?.trim() || "Asia/Kolkata";

const getDatePartMap = (date: Date, timeZone: string) => {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });

  const entries = formatter
    .formatToParts(date)
    .filter((part) => part.type !== "literal")
    .map((part) => [part.type, part.value] as const);

  return Object.fromEntries(entries) as Record<string, string>;
};

export const getCurrentStageReferenceTime = () => {
  const now = new Date();

  try {
    const parts = getDatePartMap(now, APP_TIMEZONE);
    return `${parts.year}-${parts.month}-${parts.day} ${parts.hour}:${parts.minute}:${parts.second}`;
  } catch {
    return now.toISOString().slice(0, 19).replace("T", " ");
  }
};

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

