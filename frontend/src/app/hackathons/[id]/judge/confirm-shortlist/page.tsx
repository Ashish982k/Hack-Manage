"use client";

import * as React from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, Loader2, Trophy } from "lucide-react";

import {
  confirmFinalWinners,
  confirmHackathonShortlist,
  fetchHackathonById,
  fetchHackathonLeaderboard,
} from "@/api";
import { Navbar } from "@/components/navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { authClient } from "@/lib/auth-client";

type StageType = "SUBMISSION" | "EVALUATION" | "FINAL";

type StageRow = {
  id: string;
  title: string;
  type: StageType;
  startTime: string | null;
  endTime: string | null;
};

type LeaderboardTeam = {
  teamId: string;
  teamName: string;
  totalScore: number;
};

const parseTime = (value: string | null) => {
  if (!value) return null;
  const time = new Date(value).getTime();
  return Number.isFinite(time) ? time : null;
};

const readMessage = (value: unknown) => {
  if (
    typeof value === "object" &&
    value !== null &&
    "message" in value &&
    typeof (value as { message?: unknown }).message === "string"
  ) {
    return (value as { message: string }).message;
  }

  return null;
};

const readSuccess = (value: unknown) => {
  if (
    typeof value === "object" &&
    value !== null &&
    "success" in value &&
    typeof (value as { success?: unknown }).success === "boolean"
  ) {
    return (value as { success: boolean }).success;
  }
  return null;
};

const readStages = (value: unknown): StageRow[] => {
  if (
    typeof value !== "object" ||
    value === null ||
    !("stages" in value) ||
    !Array.isArray((value as { stages?: unknown }).stages)
  ) {
    return [];
  }

  return (value as { stages: unknown[] }).stages
    .map((stage) => {
      if (typeof stage !== "object" || stage === null) return null;
      const row = stage as Record<string, unknown>;
      if (
        typeof row.id !== "string" ||
        typeof row.title !== "string" ||
        (row.type !== "SUBMISSION" && row.type !== "EVALUATION" && row.type !== "FINAL")
      ) {
        return null;
      }

      return {
        id: row.id,
        title: row.title,
        type: row.type as StageType,
        startTime: typeof row.startTime === "string" ? row.startTime : null,
        endTime: typeof row.endTime === "string" ? row.endTime : null,
      };
    })
    .filter((stage): stage is StageRow => stage !== null);
};

const pickCurrentStage = (stages: StageRow[], requestedStageId: string | null) => {
  if (requestedStageId) {
    const requested = stages.find((stage) => stage.id === requestedStageId);
    if (requested) return requested;
  }

  const now = Date.now();
  const active = stages.filter((stage) => {
    const start = parseTime(stage.startTime);
    const end = parseTime(stage.endTime);
    return start !== null && end !== null && start <= now && now <= end;
  });
  if (active.length > 0) {
    active.sort((a, b) => {
      const aStart = parseTime(a.startTime) ?? Number.MAX_SAFE_INTEGER;
      const bStart = parseTime(b.startTime) ?? Number.MAX_SAFE_INTEGER;
      return aStart - bStart || a.id.localeCompare(b.id);
    });
    return active[0];
  }

  const started = stages
    .filter((stage) => parseTime(stage.startTime) !== null)
    .sort((a, b) => {
      const aStart = parseTime(a.startTime) ?? -1;
      const bStart = parseTime(b.startTime) ?? -1;
      return bStart - aStart || b.id.localeCompare(a.id);
    });
  if (started.length > 0) return started[0];

  return stages[0] ?? null;
};

const readLeaderboardTeams = (value: unknown): LeaderboardTeam[] => {
  if (
    typeof value !== "object" ||
    value === null ||
    !("data" in value) ||
    !Array.isArray((value as { data?: unknown }).data)
  ) {
    return [];
  }

  return (value as { data: unknown[] }).data
    .map((entry) => {
      if (typeof entry !== "object" || entry === null) return null;
      const row = entry as Record<string, unknown>;
      const score =
        typeof row.totalScore === "number"
          ? row.totalScore
          : typeof row.totalScore === "string"
            ? Number(row.totalScore)
            : NaN;
      if (
        typeof row.teamId !== "string" ||
        typeof row.teamName !== "string" ||
        !Number.isFinite(score)
      ) {
        return null;
      }

      return {
        teamId: row.teamId,
        teamName: row.teamName,
        totalScore: score,
      };
    })
    .filter((team): team is LeaderboardTeam => team !== null)
    .sort(
      (a, b) =>
        b.totalScore - a.totalScore || a.teamName.localeCompare(b.teamName),
    );
};

const sortStagesByStart = (stages: StageRow[]) =>
  [...stages].sort((a, b) => {
    const aStart = parseTime(a.startTime) ?? Number.MAX_SAFE_INTEGER;
    const bStart = parseTime(b.startTime) ?? Number.MAX_SAFE_INTEGER;
    return aStart - bStart || a.id.localeCompare(b.id);
  });

const formatScore = (value: number) =>
  Number.isInteger(value) ? String(value) : value.toFixed(2);

export default function ConfirmShortlistPage() {
  const router = useRouter();
  const params = useParams<{ id: string | string[] }>();
  const searchParams = useSearchParams();
  const hackathonId = Array.isArray(params.id) ? params.id[0] : params.id;
  const requestedStageId = searchParams.get("stageId");
  const { data: session, isPending: isSessionPending } = authClient.useSession();

  const [isLoading, setIsLoading] = React.useState(true);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [status, setStatus] = React.useState<{
    kind: "success" | "error";
    message: string;
  } | null>(null);
  const [teams, setTeams] = React.useState<LeaderboardTeam[]>([]);
  const [countInput, setCountInput] = React.useState("0");
  const [effectiveStageId, setEffectiveStageId] = React.useState<string | null>(null);
  const [effectiveStageType, setEffectiveStageType] = React.useState<StageType | null>(null);
  const [effectiveStageTitle, setEffectiveStageTitle] = React.useState<string | null>(null);

  const shortlistCount = React.useMemo(() => {
    const parsed = Number.parseInt(countInput, 10);
    if (!Number.isFinite(parsed) || parsed <= 0) return 0;
    return Math.min(parsed, teams.length);
  }, [countInput, teams.length]);

  const isFinalStage = effectiveStageType === "FINAL";
  const confirmButtonLabel = isFinalStage ? "Confirm Winners" : "Confirm Shortlist";
  const canConfirm =
    !isLoading && !isSubmitting && !!effectiveStageId && shortlistCount > 0;

  const loadData = React.useCallback(async () => {
    if (!hackathonId) {
      setError("Hackathon not found.");
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);
    setStatus(null);

    try {
      const hackathonRes = await fetchHackathonById(hackathonId);
      const hackathonData: unknown = await hackathonRes.json().catch(() => null);
      if (!hackathonRes.ok) {
        setError(readMessage(hackathonData) ?? "Failed to load hackathon stages.");
        setTeams([]);
        return;
      }

      const stages = readStages(hackathonData);
      const currentStage = pickCurrentStage(stages, requestedStageId);
      if (!currentStage) {
        setError("No stage found for this hackathon.");
        setTeams([]);
        return;
      }

      const stageIdToUse = currentStage.id;
      const stageTypeToUse = currentStage.type;
      const stageTitleToUse = currentStage.title;

      const fetchRowsForStage = async (targetStageId: string) => {
        const leaderboardRes = await fetchHackathonLeaderboard(hackathonId, targetStageId);
        const leaderboardData: unknown = await leaderboardRes.json().catch(() => null);
        if (!leaderboardRes.ok) {
          return {
            ok: false as const,
            message: readMessage(leaderboardData) ?? "Failed to load leaderboard for stage.",
            rows: [] as LeaderboardTeam[],
          };
        }

        return {
          ok: true as const,
          message: null,
          rows: readLeaderboardTeams(leaderboardData),
        };
      };

      let selectedStageId = stageIdToUse;
      let selectedStageType = stageTypeToUse;
      let selectedStageTitle = stageTitleToUse;

      const firstLoad = await fetchRowsForStage(stageIdToUse);
      if (!firstLoad.ok) {
        setError(firstLoad.message);
        setTeams([]);
        return;
      }

      let rows = firstLoad.rows;

      if (rows.length === 0 && stageTypeToUse === "FINAL") {
        const finalStages = sortStagesByStart(stages).filter(
          (stage) => stage.type === "FINAL" && stage.id !== stageIdToUse,
        );

        for (const finalStage of finalStages) {
          const candidate = await fetchRowsForStage(finalStage.id);
          if (candidate.ok && candidate.rows.length > 0) {
            selectedStageId = finalStage.id;
            selectedStageType = finalStage.type;
            selectedStageTitle = finalStage.title;
            rows = candidate.rows;
            break;
          }
        }
      }

      setTeams(rows);
      setEffectiveStageId(selectedStageId);
      setEffectiveStageType(selectedStageType);
      setEffectiveStageTitle(selectedStageTitle);
      setCountInput(String(Math.min(3, rows.length)));
    } catch {
      setError("Please check your connection and try again.");
      setTeams([]);
    } finally {
      setIsLoading(false);
    }
  }, [hackathonId, requestedStageId]);

  React.useEffect(() => {
    if (isSessionPending) return;
    if (!session?.user?.id) {
      router.push("/login");
      return;
    }
    void loadData();
  }, [isSessionPending, loadData, router, session?.user?.id]);

  const handleConfirm = async () => {
    if (!hackathonId || !effectiveStageId || shortlistCount <= 0) return;

    setIsSubmitting(true);
    setStatus(null);
    try {
      const response = isFinalStage
        ? await confirmFinalWinners(hackathonId, {
            finalStageId: effectiveStageId,
            winnerCount: shortlistCount,
          })
        : await confirmHackathonShortlist(hackathonId, {
            stageId: effectiveStageId,
            teamIds: teams.slice(0, shortlistCount).map((team) => team.teamId),
          });

      const data: unknown = await response.json().catch(() => null);
      const success = readSuccess(data);
      if (!response.ok || success === false) {
        setStatus({
          kind: "error",
          message: readMessage(data) ?? "Failed to confirm selection.",
        });
        return;
      }

      await loadData();
      setStatus({
        kind: "success",
        message: readMessage(data) ?? `${confirmButtonLabel} successful.`,
      });
    } catch {
      setStatus({
        kind: "error",
        message: "Please check your connection and try again.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="relative min-h-screen premium-page text-white">
      <Navbar />

      <div className="mx-auto w-full max-w-5xl px-4 py-12 sm:px-6">
        <button
          onClick={() =>
            router.push(
              `/hackathons/${hackathonId}/judge${
                effectiveStageId ? `?stageId=${encodeURIComponent(effectiveStageId)}` : ""
              }`,
            )
          }
          className="mb-8 flex items-center gap-2 text-sm text-white/50 hover:text-white/80"
        >
          <ArrowLeft className="size-4" />
          Back to Judge Panel
        </button>

        <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="inline-flex items-center gap-2 text-sm text-white/60">
              <Trophy className="size-4 text-amber-300" />
              Judge Confirmation
            </p>
            <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
              {isFinalStage ? "Confirm Winners" : "Confirm Shortlist"}
            </h1>
            <p className="mt-3 text-sm text-white/60 sm:text-base">
              Stage: {effectiveStageTitle ?? "Loading..."}
            </p>
          </div>
        </div>

        {isLoading ? (
          <Card>
            <CardContent className="flex items-center justify-center py-12 text-white/70">
              <span className="inline-flex items-center gap-2">
                <Loader2 className="size-5 animate-spin" />
                Loading teams...
              </span>
            </CardContent>
          </Card>
        ) : error ? (
          <Card>
            <CardHeader>
              <CardTitle className="text-white">Unable to load confirmation page</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-rose-300">{error}</p>
              <Button variant="outline" onClick={() => void loadData()}>
                Retry
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            <Card>
              <CardHeader className="pb-4">
                <CardTitle className="text-white">
                  {isFinalStage ? "Winner Selection" : "Shortlist Selection"}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <label className="w-full max-w-xs space-y-2">
                  <span className="text-sm text-white/80">
                    {isFinalStage
                      ? "Number of teams to shortlist as winners"
                      : "Number of teams to shortlist"}
                  </span>
                  <Input
                    type="number"
                    min={1}
                    max={teams.length}
                    value={countInput}
                    onChange={(e) => {
                      setStatus(null);
                      setCountInput(e.target.value);
                    }}
                  />
                </label>

                <Button onClick={handleConfirm} disabled={!canConfirm}>
                  {isSubmitting ? (
                    <span className="inline-flex items-center gap-2">
                      <Loader2 className="size-4 animate-spin" />
                      Confirming...
                    </span>
                  ) : (
                    confirmButtonLabel
                  )}
                </Button>

                {status ? (
                  <p
                    className={
                      status.kind === "success"
                        ? "text-sm text-emerald-300"
                        : "text-sm text-rose-300"
                    }
                  >
                    {status.message}
                  </p>
                ) : null}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-white">Stage Team Ranking</CardTitle>
              </CardHeader>
              <CardContent>
                {teams.length === 0 ? (
                  <p className="text-sm text-white/60">
                    No scored teams available for this stage yet.
                  </p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[520px] border-collapse text-sm">
                      <thead>
                        <tr className="border-b border-white/10 text-left text-xs uppercase tracking-wide text-white/60">
                          <th className="px-4 py-3">Rank</th>
                          <th className="px-4 py-3">Team Name</th>
                          <th className="px-4 py-3">Score</th>
                        </tr>
                      </thead>
                      <tbody>
                        {teams.map((team, index) => (
                          <tr key={team.teamId} className="border-b border-white/10">
                            <td className="px-4 py-3 font-semibold text-white">#{index + 1}</td>
                            <td className="px-4 py-3 text-white/90">{team.teamName}</td>
                            <td className="px-4 py-3 text-white/80">
                              {formatScore(team.totalScore)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}


