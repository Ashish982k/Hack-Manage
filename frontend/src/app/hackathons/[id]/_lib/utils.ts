import type {
  ApiMessageResponse,
  JudgeAccessResponse,
  LeaderboardTeam,
  ShortlistedTeamsResponse,
  StageInfo,
  TeamStateResponse,
} from "./types";

export const hasMessage = (value: unknown): value is ApiMessageResponse =>
  typeof value === "object" && value !== null && "message" in value;

export const isTeamStateResponse = (value: unknown): value is TeamStateResponse =>
  typeof value === "object" &&
  value !== null &&
  "joined" in value &&
  typeof (value as { joined: unknown }).joined === "boolean";

export const isJudgeAccessResponse = (
  value: unknown,
): value is JudgeAccessResponse =>
  typeof value === "object" &&
  value !== null &&
  "isJudge" in value &&
  typeof (value as { isJudge: unknown }).isJudge === "boolean";

export const readShortlistedTeamIds = (value: unknown) => {
  if (typeof value !== "object" || value === null) {
    return new Set<string>();
  }

  const rows = (value as ShortlistedTeamsResponse).data;
  if (!Array.isArray(rows)) {
    return new Set<string>();
  }

  return new Set(
    rows
      .map((item) => (typeof item?.teamId === "string" ? item.teamId : ""))
      .filter(Boolean),
  );
};

export const readShortlistedStageId = (value: unknown): string | null => {
  if (typeof value !== "object" || value === null) return null;
  if (
    "shortlistedStageId" in value &&
    typeof (value as { shortlistedStageId?: unknown }).shortlistedStageId ===
      "string"
  ) {
    return (value as { shortlistedStageId: string }).shortlistedStageId;
  }
  if (
    "finalStageId" in value &&
    typeof (value as { finalStageId?: unknown }).finalStageId === "string"
  ) {
    return (value as { finalStageId: string }).finalStageId;
  }
  if (
    "stageId" in value &&
    typeof (value as { stageId?: unknown }).stageId === "string"
  ) {
    return (value as { stageId: string }).stageId;
  }
  return null;
};

export const resolveFinalStageIdFromStages = (stages: StageInfo[]) => {
  const orderedFinalStages = [...stages]
    .filter((stage) => stage.type === "FINAL")
    .sort((a, b) => {
      const aStart = a.startTime ?? "";
      const bStart = b.startTime ?? "";
      return aStart.localeCompare(bStart) || a.id.localeCompare(b.id);
    });

  return orderedFinalStages[0]?.id ?? null;
};

const readNumber = (value: unknown) => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
};

const mapLeaderboardTeam = (value: unknown): LeaderboardTeam | null => {
  if (typeof value !== "object" || value === null) return null;

  const entry = value as Record<string, unknown>;
  const totalScore = readNumber(entry.totalScore);
  const teamId = typeof entry.teamId === "string" ? entry.teamId : null;
  const teamName = typeof entry.teamName === "string" ? entry.teamName : null;

  if (!teamId || !teamName || totalScore === null) return null;

  return {
    teamId,
    teamName,
    totalScore,
    technical: readNumber(entry.technical) ?? 0,
    feasibility: readNumber(entry.feasibility) ?? 0,
    innovation: readNumber(entry.innovation) ?? 0,
    presentation: readNumber(entry.presentation) ?? 0,
    impact: readNumber(entry.impact) ?? 0,
    evaluationCount: readNumber(entry.evaluationCount) ?? 0,
  };
};

export const readLeaderboardTeams = (value: unknown): LeaderboardTeam[] => {
  if (
    typeof value !== "object" ||
    value === null ||
    !("data" in value) ||
    !Array.isArray((value as { data?: unknown }).data)
  ) {
    return [];
  }

  return (value as { data: unknown[] }).data
    .map(mapLeaderboardTeam)
    .filter((team): team is LeaderboardTeam => team !== null);
};

export const sortLeaderboardTeams = (teams: LeaderboardTeam[]) =>
  [...teams].sort(
    (a, b) =>
      b.totalScore - a.totalScore ||
      b.technical - a.technical ||
      a.teamName.localeCompare(b.teamName),
  );

export const formatScore = (value: number) =>
  Number.isInteger(value) ? String(value) : value.toFixed(2);

export const formatDateLabel = (value: string | null | undefined) => {
  if (!value) return "TBD";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "TBD";

  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

export const formatTimeLabel = (value: string | null | undefined) => {
  if (!value) return "TBD";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "TBD";

  return date.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
  });
};

const toTimestamp = (value: string | null) => {
  if (!value) return null;
  const timestamp = new Date(value).getTime();
  return Number.isNaN(timestamp) ? null : timestamp;
};

export const isStageActive = (stage: StageInfo, nowMs: number) => {
  const start = toTimestamp(stage.startTime);
  const end = toTimestamp(stage.endTime);
  if (start === null || end === null) return false;
  return start <= nowMs && nowMs <= end;
};
